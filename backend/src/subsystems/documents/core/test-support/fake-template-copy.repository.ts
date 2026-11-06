import { TemplateCopy } from '../domain/entities/template-copy.entity';
import {
  PendingTemplateCopy,
  TemplateCopyCounts,
  TemplateCopyRepository,
} from '../domain/ports/template-copy.repository';

/** A template as the fake knows it: only what deciding and making a copy needs. */
export interface FakeTemplate {
  id: number;
  fileName: string;
  cloudFileId: string;
  jurisdictionIds: number[];
  /** The template's file in the folder of each jurisdiction (id → file id); none for a template from before the folders. */
  filesByJurisdiction?: Record<number, string>;
  copyToNewCases: boolean;
  active: boolean;
}

/**
 * In-memory {@link TemplateCopyRepository} for use-case tests. It applies the
 * same rules as the Prisma one: only active templates of the jurisdiction with
 * "copy to new cases" are asked for, never twice, and `saveCopied` writes only
 * a copy that is still `PENDING`.
 */
export class FakeTemplateCopyRepository implements TemplateCopyRepository {
  private readonly templates: FakeTemplate[] = [];
  private readonly copies = new Map<string, TemplateCopy>();
  /** `saveCopied` calls received, to assert nothing is written twice. */
  saveCopiedCalls = 0;
  /** Makes the next `saveCopied` answer `false`, as if another request had copied it first. */
  loseNextRace = false;

  addTemplate(template: Partial<FakeTemplate> & Pick<FakeTemplate, 'id'>): FakeTemplate {
    const full: FakeTemplate = {
      fileName: `modelo-${template.id}.docx`,
      cloudFileId: `template-file-${template.id}`,
      jurisdictionIds: [1],
      copyToNewCases: true,
      active: true,
      ...template,
    };
    this.templates.push(full);
    return full;
  }

  async registerPending(caseId: number, jurisdictionId: number): Promise<void> {
    for (const template of this.templates) {
      const eligible =
        template.active && template.copyToNewCases && template.jurisdictionIds.includes(jurisdictionId);
      if (eligible && !this.copies.has(this.keyOf(caseId, template.id))) {
        this.copies.set(this.keyOf(caseId, template.id), TemplateCopy.pending(caseId, template.id));
      }
    }
  }

  async findPending(caseId: number, jurisdictionId?: number): Promise<PendingTemplateCopy[]> {
    return this.rowsOf(caseId)
      .filter((copy) => copy.isPending && this.templateOf(copy).active)
      .map((stored) => {
        const template = this.templateOf(stored);
        const { fileName } = template;
        const cloudFileId =
          (jurisdictionId !== undefined ? template.filesByJurisdiction?.[jurisdictionId] : undefined) ??
          template.cloudFileId;
        // A copy read from a database is a new object: changing it does not change the stored row.
        const copy = TemplateCopy.hydrate({
          caseId: stored.caseId,
          templateId: stored.templateId,
          status: stored.status,
          cloudFileId: stored.cloudFileId,
          copiedAt: stored.copiedAt,
        });
        return { copy, template: { fileName, cloudFileId } };
      });
  }

  async countByCase(caseId: number): Promise<TemplateCopyCounts> {
    const rows = this.rowsOf(caseId);
    return {
      copied: rows.filter((copy) => !copy.isPending).length,
      pending: rows.filter((copy) => copy.isPending && this.templateOf(copy).active).length,
    };
  }

  async saveCopied(copy: TemplateCopy): Promise<boolean> {
    this.saveCopiedCalls += 1;
    const stored = this.copies.get(this.keyOf(copy.caseId, copy.templateId));
    if (this.loseNextRace) {
      this.loseNextRace = false;
      return false;
    }
    if (!stored || !stored.isPending) {
      return false;
    }
    this.copies.set(this.keyOf(copy.caseId, copy.templateId), copy);
    return true;
  }

  /** Every stored copy of the case, in insertion order. */
  rowsOf(caseId: number): TemplateCopy[] {
    return [...this.copies.values()].filter((copy) => copy.caseId === caseId);
  }

  deactivate(templateId: number): void {
    const template = this.templates.find((t) => t.id === templateId);
    if (template) {
      template.active = false;
    }
  }

  private templateOf(copy: TemplateCopy): FakeTemplate {
    return this.templates.find((t) => t.id === copy.templateId)!;
  }

  private keyOf(caseId: number, templateId: number): string {
    return `${caseId}:${templateId}`;
  }
}
