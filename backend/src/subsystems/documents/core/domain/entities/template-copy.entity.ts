import { TemplateCopyAlreadyDoneError } from '../errors/documents.errors';

export type TemplateCopyStatus = 'PENDING' | 'COPIED';

export interface TemplateCopyProps {
  caseId: number;
  templateId: number;
  status: TemplateCopyStatus;
  /** The copy's id in the storage; `null` while the copy is `PENDING`. */
  cloudFileId: string | null;
  copiedAt: Date | null;
}

/**
 * The copy of one formal template into one case's folder (HU40). It is born
 * `PENDING` when the copy is asked for, even if the folder does not exist yet,
 * and becomes `COPIED` once, with the id of the copy. A `COPIED` copy is never
 * copied again (CA-40.7), and the template changing afterwards does not touch
 * it (CA-40.6): the copy is an independent file.
 */
export class TemplateCopy {
  private constructor(private props: TemplateCopyProps) {}

  static pending(caseId: number, templateId: number): TemplateCopy {
    return new TemplateCopy({ caseId, templateId, status: 'PENDING', cloudFileId: null, copiedAt: null });
  }

  /** Rebuilds a stored copy without validating it. */
  static hydrate(props: TemplateCopyProps): TemplateCopy {
    return new TemplateCopy({ ...props });
  }

  /**
   * @throws {TemplateCopyAlreadyDoneError} if it was already copied.
   */
  markCopied(cloudFileId: string, at: Date): void {
    if (this.props.status === 'COPIED') {
      throw new TemplateCopyAlreadyDoneError();
    }
    this.props = { ...this.props, status: 'COPIED', cloudFileId, copiedAt: at };
  }

  get caseId(): number {
    return this.props.caseId;
  }

  get templateId(): number {
    return this.props.templateId;
  }

  get status(): TemplateCopyStatus {
    return this.props.status;
  }

  get cloudFileId(): string | null {
    return this.props.cloudFileId;
  }

  get copiedAt(): Date | null {
    return this.props.copiedAt;
  }

  get isPending(): boolean {
    return this.props.status === 'PENDING';
  }
}
