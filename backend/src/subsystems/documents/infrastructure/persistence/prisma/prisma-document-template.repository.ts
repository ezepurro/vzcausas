import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Prisma } from '../../../../../generated/prisma/client';
import {
  DocumentTemplate,
  TEMPLATE_JURISDICTIONS,
  TemplateJurisdiction,
} from '../../../core/domain/entities/document-template.entity';
import { DocumentTemplateAlreadyExistsError } from '../../../core/domain/errors/documents.errors';
import {
  DocumentTemplateRepository,
  DocumentTemplateSearch,
  DocumentTemplateView,
  TemplateFilePlacement,
  TemplateForModification,
  TemplateUpdate,
} from '../../../core/domain/ports/document-template.repository';
import { TemplateFile } from '../../../core/domain/value-objects/template-file.vo';
import { TemplateStoredFiles } from '../../../core/domain/value-objects/template-stored-files.vo';

/** The unique index on `lower(name)` among active templates (D-71). */
const NAME_INDEX = 'document_templates_name_active_key';

/** Spanish alphabetical order, ignoring accents and case: "Ámbito" < "apelación" < "Recurso". */
const SPANISH = new Intl.Collator('es', { sensitivity: 'base' });

/** What a row needs to become a {@link DocumentTemplateView}. */
const VIEW_INCLUDE = {
  jurisdictions: { select: { jurisdiction: { select: { name: true } } } },
  lastVersionBy: { select: { id: true, lastName: true, firstName: true } },
  _count: { select: { copies: { where: { status: 'COPIED' } } } },
} as const satisfies Prisma.DocumentTemplateInclude;

type TemplateRow = Prisma.DocumentTemplateGetPayload<{ include: typeof VIEW_INCLUDE }>;

/** Prisma {@link DocumentTemplateRepository} over `document_templates` (HU34, HU35). */
@Injectable()
export class PrismaDocumentTemplateRepository implements DocumentTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsByName(name: string, exceptId?: number): Promise<boolean> {
    const found = await this.prisma.db.documentTemplate.findFirst({
      where: {
        active: true,
        name: { equals: name, mode: 'insensitive' },
        // A template's own name is no conflict (CA-36.3).
        ...(exceptId !== undefined && { id: { not: exceptId } }),
      },
      select: { id: true },
    });
    return found !== null;
  }

  async findForModification(id: number): Promise<TemplateForModification | null> {
    const row = await this.prisma.db.documentTemplate.findFirst({
      where: { id, active: true },
      include: {
        jurisdictions: { select: { jurisdiction: { select: { name: true } } } },
        files: { include: { jurisdiction: { select: { name: true } } } },
      },
    });
    if (!row) {
      return null;
    }
    const byContractOrder = (a: TemplateJurisdiction, b: TemplateJurisdiction) =>
      TEMPLATE_JURISDICTIONS.indexOf(a) - TEMPLATE_JURISDICTIONS.indexOf(b);
    return {
      template: DocumentTemplate.hydrate({
        name: row.name,
        jurisdictions: row.jurisdictions
          .map(({ jurisdiction }) => jurisdiction.name as TemplateJurisdiction)
          .sort(byContractOrder),
        fileName: row.fileName,
        copyToNewCases: row.copyToNewCases,
        lastVersionByUserId: row.lastVersionByUserId,
        lastVersionAt: row.lastVersionAt,
      }),
      mainFileId: row.cloudFileId,
      placements: row.files
        .map(({ jurisdiction, cloudFileId, cloudFolderId }) => ({
          jurisdiction: jurisdiction.name as TemplateJurisdiction,
          cloudFileId,
          cloudFolderId,
        }))
        .sort((a, b) => byContractOrder(a.jurisdiction, b.jurisdiction)),
    };
  }

  async findPage(search: DocumentTemplateSearch): Promise<{ items: DocumentTemplateView[]; totalItems: number }> {
    const where: Prisma.DocumentTemplateWhereInput = {
      active: true,
      // `some`: a template of several jurisdictions matches each of them, once.
      ...(search.jurisdiction && { jurisdictions: { some: { jurisdiction: { name: search.jurisdiction } } } }),
      ...(search.copyToNewCases !== undefined && { copyToNewCases: search.copyToNewCases }),
    };
    // Alphabetical as a reader expects it (CA-35.3): "Ámbito" next to "Apelación", not after
    // "Recurso". The database's own order depends on its collation (a `C` one sorts by code point),
    // so the order is decided here. A study has tens of templates, not thousands: the names are
    // read whole, sorted, and only the page is loaded with its relations.
    const names = await this.prisma.db.documentTemplate.findMany({ where, select: { id: true, name: true } });
    const pageIds = names
      .sort((a, b) => SPANISH.compare(a.name, b.name) || a.id - b.id)
      .slice((search.page - 1) * search.limit, search.page * search.limit)
      .map(({ id }) => id);

    const rows = await this.prisma.db.documentTemplate.findMany({
      where: { id: { in: pageIds } },
      include: VIEW_INCLUDE,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return { items: pageIds.map((id) => toView(byId.get(id)!)), totalItems: names.length };
  }

  async findById(id: number): Promise<DocumentTemplateView | null> {
    const row = await this.prisma.db.documentTemplate.findFirst({ where: { id, active: true }, include: VIEW_INCLUDE });
    return row ? toView(row) : null;
  }

  async findFileById(id: number): Promise<TemplateFile | null> {
    const row = await this.prisma.db.documentTemplate.findFirst({
      where: { id, active: true },
      select: { fileName: true, cloudFileId: true },
    });
    return row ? TemplateFile.hydrate(row) : null;
  }

  async findJurisdictionIds(codes: readonly TemplateJurisdiction[]): Promise<Map<TemplateJurisdiction, number>> {
    // `jurisdictions.name` holds the contract's code.
    const rows = await this.prisma.db.jurisdiction.findMany({
      where: { name: { in: [...codes] } },
      select: { jurisdictionId: true, name: true },
    });
    return new Map(rows.map(({ name, jurisdictionId }) => [name as TemplateJurisdiction, jurisdictionId]));
  }

  async save(template: DocumentTemplate, placements: readonly TemplateFilePlacement[]): Promise<DocumentTemplateView> {
    const ids = await this.findJurisdictionIds(template.jurisdictions);
    // The first placement is the main file: it is the one the template row points to.
    const main = placements[0];

    try {
      // One `create` with the nested rows: the template, its jurisdictions and its files go in together.
      const row = await this.prisma.db.documentTemplate.create({
        data: {
          name: template.name,
          fileName: template.fileName,
          cloudFileId: main.cloudFileId,
          cloudFolderId: main.cloudFolderId,
          copyToNewCases: template.copyToNewCases,
          lastVersionAt: template.lastVersionAt,
          lastVersionByUserId: template.lastVersionByUserId,
          jurisdictions: { create: [...ids.values()].map((jurisdictionId) => ({ jurisdictionId })) },
          files: {
            create: placements.map(({ jurisdiction, cloudFileId, cloudFolderId }) => ({
              jurisdictionId: ids.get(jurisdiction)!,
              cloudFileId,
              cloudFolderId,
            })),
          },
        },
        include: VIEW_INCLUDE,
      });
      return toView(row);
    } catch (error) {
      throw this.nameConflictOr(error);
    }
  }

  /**
   * One transaction: the conditional `UPDATE … WHERE id AND active = true`, the
   * replacement of the jurisdictions and of the files, and the files waiting for the
   * `Papelera` (HU36, D-125). If the template was given de baja in the meantime the
   * `UPDATE` finds nothing and the rest is not written.
   */
  async update(id: number, update: TemplateUpdate): Promise<DocumentTemplateView | null> {
    const { template, placements, trash } = update;
    try {
      return await this.prisma.runInTransaction(async () => {
        const db = this.prisma.db;
        // The first placement is the main file: it is the one the template row points to.
        const main = placements?.[0];
        const { count } = await db.documentTemplate.updateMany({
          where: { id, active: true },
          data: {
            name: template.name,
            fileName: template.fileName,
            copyToNewCases: template.copyToNewCases,
            lastVersionAt: template.lastVersionAt,
            lastVersionByUserId: template.lastVersionByUserId,
            ...(main && { cloudFileId: main.cloudFileId, cloudFolderId: main.cloudFolderId }),
          },
        });
        if (count === 0) {
          return null;
        }

        if (placements) {
          const ids = await this.findJurisdictionIds(template.jurisdictions);
          await db.documentTemplateFile.deleteMany({ where: { templateId: id } });
          await db.documentTemplateJurisdiction.deleteMany({ where: { templateId: id } });
          await db.documentTemplateJurisdiction.createMany({
            data: [...ids.values()].map((jurisdictionId) => ({ templateId: id, jurisdictionId })),
          });
          await db.documentTemplateFile.createMany({
            data: placements.map(({ jurisdiction, cloudFileId, cloudFolderId }) => ({
              templateId: id,
              jurisdictionId: ids.get(jurisdiction)!,
              cloudFileId,
              cloudFolderId,
            })),
          });
        }
        if (trash.length > 0) {
          await db.templateFilePendingTrash.createMany({
            data: trash.map((cloudFileId) => ({ cloudFileId, templateId: id })),
            skipDuplicates: true,
          });
        }

        return toView(await db.documentTemplate.findUniqueOrThrow({ where: { id }, include: VIEW_INCLUDE }));
      });
    } catch (error) {
      throw this.nameConflictOr(error);
    }
  }

  async clearPendingTrash(fileIds: readonly string[]): Promise<void> {
    await this.prisma.db.templateFilePendingTrash.deleteMany({ where: { cloudFileId: { in: [...fileIds] } } });
  }

  /** The error of a taken name (D-71, D-139), or the same error if it is any other. */
  private nameConflictOr(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      this.violatedIndex(error) === NAME_INDEX
    ) {
      return new DocumentTemplateAlreadyExistsError();
    }
    return error;
  }

  /**
   * One `UPDATE … WHERE id AND active = true`: it writes only if the template was
   * active, so a missing one and one already given de baja both write nothing, and
   * of two simultaneous bajas only one does (CA-37.7). The row stays (RN12).
   */
  async deactivate(id: number): Promise<boolean> {
    const { count } = await this.prisma.db.documentTemplate.updateMany({
      where: { id, active: true },
      data: { active: false, trashPending: true },
    });
    return count === 1;
  }

  /** Not filtered by `active`: the files of a template given de baja are the ones still to be moved (HU37). */
  async findStoredFiles(id: number): Promise<TemplateStoredFiles | null> {
    const row = await this.prisma.db.documentTemplate.findUnique({
      where: { id },
      select: { cloudFileId: true, files: { select: { cloudFileId: true } } },
    });
    return row
      ? TemplateStoredFiles.hydrate({
          mainFileId: row.cloudFileId,
          jurisdictionFileIds: row.files.map((file) => file.cloudFileId),
        })
      : null;
  }

  async markTrashed(id: number): Promise<void> {
    await this.prisma.db.documentTemplate.update({ where: { id }, data: { trashPending: false } });
  }

  /** With the `PrismaPg` driver adapter the violated index arrives in `meta.driverAdapterError`. */
  private violatedIndex(error: Prisma.PrismaClientKnownRequestError): string | undefined {
    const meta = error.meta as
      | { driverAdapterError?: { cause?: { constraint?: { index?: string } } } }
      | undefined;
    return meta?.driverAdapterError?.cause?.constraint?.index;
  }
}

/** The one way a row becomes the contract's resource, so the `POST` and the `GET`s cannot drift. */
function toView(row: TemplateRow): DocumentTemplateView {
  return {
    id: row.id,
    name: row.name,
    // In the order of the contract's enum, whatever order they were sent in.
    jurisdictions: row.jurisdictions
      .map(({ jurisdiction }) => jurisdiction.name as TemplateJurisdiction)
      .sort((a, b) => TEMPLATE_JURISDICTIONS.indexOf(a) - TEMPLATE_JURISDICTIONS.indexOf(b)),
    fileName: row.fileName,
    copyToNewCases: row.copyToNewCases,
    lastVersionAt: row.lastVersionAt,
    lastVersionBy: row.lastVersionBy,
    // Cases the template was copied to (HU40); a pending copy does not count yet.
    usageCount: row._count.copies,
    active: row.active,
  };
}
