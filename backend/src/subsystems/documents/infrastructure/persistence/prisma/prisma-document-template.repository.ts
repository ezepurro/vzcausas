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
  TemplateFile,
  TemplateFilePlacement,
} from '../../../core/domain/ports/document-template.repository';

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

  async existsByName(name: string): Promise<boolean> {
    const found = await this.prisma.db.documentTemplate.findFirst({
      where: { active: true, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    return found !== null;
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
    return this.prisma.db.documentTemplate.findFirst({
      where: { id, active: true },
      select: { fileName: true, cloudFileId: true },
    });
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        this.violatedIndex(error) === NAME_INDEX
      ) {
        throw new DocumentTemplateAlreadyExistsError();
      }
      throw error;
    }
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
