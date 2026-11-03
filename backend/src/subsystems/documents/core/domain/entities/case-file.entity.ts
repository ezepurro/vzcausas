/** What a case file is made of, as `case_files` keeps it. */
export interface CaseFileProps {
  /** `null` until it is saved. */
  id: number | null;
  caseId: number;
  version: number;
  cloudFileId: string;
  fileName: string;
  pageCount: number;
  generatedByUserId: number;
  generatedAt: Date;
}

/**
 * A case file (expediente) the system generated for a case (HU25): one PDF with
 * the cover sheet and the chosen documents, saved in the folder of the case as
 * a new version. The PDF lives in the storage; this is its record in
 * `case_files`, which numbers the versions (CA-25.6) and tells the document
 * list which files are case files (HU38, CA-38.4).
 *
 * The parts are not stored: they only travel in the response of the
 * generation (`schema.prisma:747-748`).
 */
export class CaseFile {
  private constructor(private readonly props: CaseFileProps) {}

  /**
   * `Expediente_{SAC}_v{n}.pdf`, or `Expediente_causa-{id}_v{n}.pdf` when the
   * case has no SAC (CA-25.6, V5 `:7737-7738`).
   */
  static fileNameFor(sacNumber: string | null, caseId: number, version: number): string {
    const subject = sacNumber ? sacNumber : `causa-${caseId}`;
    return `Expediente_${subject}_v${version}.pdf`;
  }

  /**
   * A case file just generated, not saved yet. Version and page count start at 1
   * (the CHECKs of `case_files`); anything else is a programming error, not a
   * request the client could fix.
   */
  static create(props: Omit<CaseFileProps, 'id'>): CaseFile {
    if (!Number.isInteger(props.version) || props.version < 1) {
      throw new Error(`A case file version starts at 1, got ${props.version}.`);
    }
    if (!Number.isInteger(props.pageCount) || props.pageCount < 1) {
      throw new Error(`A case file has at least one page, got ${props.pageCount}.`);
    }
    return new CaseFile({ ...props, id: null });
  }

  /** Rebuilds a saved case file, without validation. */
  static hydrate(props: CaseFileProps): CaseFile {
    return new CaseFile({ ...props });
  }

  get id(): number | null {
    return this.props.id;
  }

  get caseId(): number {
    return this.props.caseId;
  }

  get version(): number {
    return this.props.version;
  }

  get cloudFileId(): string {
    return this.props.cloudFileId;
  }

  get fileName(): string {
    return this.props.fileName;
  }

  get pageCount(): number {
    return this.props.pageCount;
  }

  get generatedByUserId(): number {
    return this.props.generatedByUserId;
  }

  get generatedAt(): Date {
    return this.props.generatedAt;
  }
}
