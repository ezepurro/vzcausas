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
  DocumentTemplateView,
  TemplateFileLocation,
} from '../../../core/domain/ports/document-template.repository';

/** The unique index on `lower(name)` among active templates (D-71). */
const NAME_INDEX = 'document_templates_name_active_key';

const VIEW_INCLUDE = {
  jurisdictions: { select: { jurisdiction: { select: { name: true } } } },
  lastVersionBy: { select: { id: true, lastName: true, firstName: true } },
  _count: { select: { copies: { where: { status: 'COPIED' } } } },
} as const satisfies Prisma.DocumentTemplateInclude;

/** Prisma {@link DocumentTemplateRepository} over `document_templates` (HU34). */
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

  async save(template: DocumentTemplate, file: TemplateFileLocation): Promise<DocumentTemplateView> {
    // The jurisdictions are looked up by name: `jurisdictions.name` holds the contract's code.
    const jurisdictions = await this.prisma.db.jurisdiction.findMany({
      where: { name: { in: [...template.jurisdictions] } },
      select: { jurisdictionId: true },
    });

    try {
      // One `create` with the nested rows: the template and its jurisdictions go in together.
      const row = await this.prisma.db.documentTemplate.create({
        data: {
          name: template.name,
          fileName: template.fileName,
          cloudFileId: file.cloudFileId,
          cloudFolderId: file.cloudFolderId,
          copyToNewCases: template.copyToNewCases,
          lastVersionAt: template.lastVersionAt,
          lastVersionByUserId: template.lastVersionByUserId,
          jurisdictions: { create: jurisdictions.map(({ jurisdictionId }) => ({ jurisdictionId })) },
        },
        include: VIEW_INCLUDE,
      });

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
        usageCount: row._count.copies,
        active: row.active,
      };
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
