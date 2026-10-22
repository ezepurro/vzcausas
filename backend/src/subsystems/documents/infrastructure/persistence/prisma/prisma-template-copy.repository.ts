import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { TemplateCopy } from '../../../core/domain/entities/template-copy.entity';
import {
  PendingTemplateCopy,
  TemplateCopyCounts,
  TemplateCopyRepository,
} from '../../../core/domain/ports/template-copy.repository';

/** Prisma {@link TemplateCopyRepository} over `document_template_copies` (HU40). */
@Injectable()
export class PrismaTemplateCopyRepository implements TemplateCopyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async registerPending(caseId: number, jurisdictionId: number): Promise<void> {
    const eligible = await this.prisma.db.documentTemplate.findMany({
      where: { active: true, copyToNewCases: true, jurisdictions: { some: { jurisdictionId } } },
      select: { id: true },
    });
    // `skipDuplicates` leaves alone the templates that already have a copy for the case, in any status.
    await this.prisma.db.documentTemplateCopy.createMany({
      data: eligible.map(({ id }) => ({ caseId, templateId: id, status: 'PENDING' as const })),
      skipDuplicates: true,
    });
  }

  async findPending(caseId: number): Promise<PendingTemplateCopy[]> {
    const rows = await this.prisma.db.documentTemplateCopy.findMany({
      where: { caseId, status: 'PENDING', template: { active: true } },
      include: { template: { select: { fileName: true, cloudFileId: true } } },
      orderBy: { templateId: 'asc' },
    });
    return rows.map((row) => ({
      copy: TemplateCopy.hydrate({
        caseId: row.caseId,
        templateId: row.templateId,
        status: row.status,
        cloudFileId: row.cloudFileId,
        copiedAt: row.copiedAt,
      }),
      template: row.template,
    }));
  }

  async countByCase(caseId: number): Promise<TemplateCopyCounts> {
    const [copied, pending] = await Promise.all([
      this.prisma.db.documentTemplateCopy.count({ where: { caseId, status: 'COPIED' } }),
      this.prisma.db.documentTemplateCopy.count({ where: { caseId, status: 'PENDING', template: { active: true } } }),
    ]);
    return { copied, pending };
  }

  async saveCopied(copy: TemplateCopy): Promise<boolean> {
    // One conditional write: only a copy still PENDING becomes COPIED, so two requests cannot both win.
    const { count } = await this.prisma.db.documentTemplateCopy.updateMany({
      where: { caseId: copy.caseId, templateId: copy.templateId, status: 'PENDING' },
      data: { status: 'COPIED', cloudFileId: copy.cloudFileId, copiedAt: copy.copiedAt },
    });
    return count === 1;
  }
}
