import { TemplateCopy } from '../entities/template-copy.entity';

/** DI token for {@link TemplateCopyRepository}. */
export const TEMPLATE_COPY_REPOSITORY = Symbol('TEMPLATE_COPY_REPOSITORY');

/** A copy still to be made, with the file of the template it comes from. */
export interface PendingTemplateCopy {
  copy: TemplateCopy;
  template: { fileName: string; cloudFileId: string };
}

/** How many templates were copied into a case's folder and how many are still to copy. */
export interface TemplateCopyCounts {
  copied: number;
  pending: number;
}

/** Persistence of the copies of formal templates into case folders (`document_template_copies`, HU40). */
export interface TemplateCopyRepository {
  /**
   * Asks for the copy of every **active** template that applies to the
   * jurisdiction and has "copy to new cases" checked (CA-40.1, CA-40.5), as
   * `PENDING` copies of the case. A template that already has a copy for the
   * case is left alone, so asking twice never repeats one (CA-40.7).
   */
  registerPending(caseId: number, jurisdictionId: number): Promise<void>;

  /** The copies of the case still `PENDING` whose template is still active. */
  findPending(caseId: number): Promise<PendingTemplateCopy[]>;

  /** Same count `cases` shows: pending copies of templates given de baja do not count. */
  countByCase(caseId: number): Promise<TemplateCopyCounts>;

  /**
   * Stores the copy as `COPIED` in one conditional write (`WHERE status =
   * 'PENDING'`). Returns whether it wrote: `false` means another request
   * copied that template first.
   */
  saveCopied(copy: TemplateCopy): Promise<boolean>;
}
