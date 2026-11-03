import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ForbiddenActionError } from '@shared/domain/domain-error';
import { CaseFileRef } from '../ports/case-file.repository';
import { StoredDocument } from '../ports/document-storage.port';

/** Prefix of the storage's own document types (Google Docs, Sheets…), which have no file behind them. */
const GOOGLE_NATIVE_PREFIX = 'application/vnd.google-apps.';

export const PDF_MIME_TYPE = 'application/pdf';

/**
 * How a document becomes PDF to go into a case file (HU25, D-102, V5 `:7734-7736`):
 *
 * - `AS_IS`: a PDF goes as it is.
 * - `EXPORT`: a Google document is exported to PDF by Drive.
 * - `CONVERT`: a Word file (`.doc`, `.docx`) is converted by Drive.
 * - `IMAGE`: a JPG or PNG image goes one per page, fitted to A4.
 */
export type PdfConversion = 'AS_IS' | 'EXPORT' | 'CONVERT' | 'IMAGE';

/**
 * What can go into a case file, and how (D-102, V5 `:7427`). A Google
 * spreadsheet is not a "documento de Google" and stays out: anything absent
 * here cannot be converted.
 */
const PDF_CONVERSIONS: Readonly<Record<string, PdfConversion>> = {
  [PDF_MIME_TYPE]: 'AS_IS',
  'application/vnd.google-apps.document': 'EXPORT',
  'application/msword': 'CONVERT',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'CONVERT',
  'image/jpeg': 'IMAGE',
  'image/png': 'IMAGE',
};

/** Profiles that download a document that is not a case file (D-103, V5 `:7584-7587`). */
const DOWNLOAD_ROLES = ['LAWYER', 'SECRETARY'];

/** A document as the API shows it (V5 §3.12, the eleven fields of the resource). */
export interface CaseDocumentSnapshot {
  id: string;
  name: string;
  extension: string | null;
  mimeType: string;
  sizeBytes: number | null;
  createdAt: Date;
  modifiedAt: Date;
  uploadedBy: string | null;
  url: string;
  convertibleToPdf: boolean;
  caseFile: CaseFileRef | null;
}

/**
 * A file of the folder of a case (HU38). It is read from the storage on every
 * request and never stored (D-100): its identity is the storage's id.
 *
 * It answers what the list and the download need to know about the file —
 * its extension, whether it can go into a case file, whether it is a native
 * document of the storage, which name and type it is downloaded with — and
 * who may download it (D-103). The use cases only fetch and hand over.
 */
export class CaseDocument {
  private constructor(
    private readonly stored: StoredDocument,
    private readonly caseFileRef: CaseFileRef | null,
  ) {}

  /** `caseFile` is the row of `case_files` for this file, or `null` if the system did not generate it. */
  static fromStorage(stored: StoredDocument, caseFile: CaseFileRef | null): CaseDocument {
    return new CaseDocument(stored, caseFile);
  }

  /**
   * A document that is not a case file is only for `LAWYER` and `SECRETARY`; a
   * case file, for anyone, since anyone may generate one (D-103). It is static
   * because it is decided **before** the storage is asked for the file: knowing
   * whether the id is a case file is enough.
   *
   * @throws {ForbiddenActionError} 403 `FORBIDDEN`.
   */
  static assertCanBeDownloadedBy(actor: AuthenticatedUser, isCaseFile: boolean): void {
    if (isCaseFile || actor.roleNames.some((role) => DOWNLOAD_ROLES.includes(role))) {
      return;
    }
    throw new ForbiddenActionError(
      'FORBIDDEN',
      'Se requiere el rol LAWYER o SECRETARY para realizar esta operación.',
    );
  }

  get id(): string {
    return this.stored.id;
  }

  get name(): string {
    return this.stored.name;
  }

  get mimeType(): string {
    return this.stored.mimeType;
  }

  get createdAt(): Date {
    return this.stored.createdAt;
  }

  /** A native document of the storage: it has no bytes of its own and is downloaded exported to PDF. */
  get isGoogleNative(): boolean {
    return this.stored.mimeType.startsWith(GOOGLE_NATIVE_PREFIX);
  }

  /** Lower case and without the dot; `null` without one or in a native document (V5 `:7420`). */
  get extension(): string | null {
    if (this.isGoogleNative) {
      return null;
    }
    const dot = this.stored.name.lastIndexOf('.');
    const extension = dot > 0 ? this.stored.name.slice(dot + 1).toLowerCase() : '';
    return extension === '' ? null : extension;
  }

  /** How it becomes PDF in a case file, or `null` if it cannot (HU25, CA-25.4). */
  get pdfConversion(): PdfConversion | null {
    return PDF_CONVERSIONS[this.stored.mimeType] ?? null;
  }

  get convertibleToPdf(): boolean {
    return this.pdfConversion !== null;
  }

  /** A case file the system generated (`case_files`): it never goes into another one (CA-25.3). */
  get isCaseFile(): boolean {
    return this.caseFileRef !== null;
  }

  /** The name it is downloaded with: a native document gains `.pdf`, since it leaves as one. */
  get downloadName(): string {
    return this.isGoogleNative ? `${this.stored.name}.pdf` : this.stored.name;
  }

  /** The type it is downloaded with: its own, or PDF for a native document. */
  get downloadMimeType(): string {
    return this.isGoogleNative ? PDF_MIME_TYPE : this.stored.mimeType;
  }

  /** Whether the file is directly in that folder (CA-38.8: the API never serves a file of another folder). */
  isIn(folderId: string): boolean {
    return this.stored.parentIds.includes(folderId);
  }

  snapshot(): CaseDocumentSnapshot {
    return {
      id: this.stored.id,
      name: this.stored.name,
      extension: this.extension,
      mimeType: this.stored.mimeType,
      // The storage does not measure its native documents (V5 `:7422`).
      sizeBytes: this.isGoogleNative ? null : this.stored.sizeBytes,
      createdAt: this.stored.createdAt,
      modifiedAt: this.stored.modifiedAt,
      uploadedBy: this.stored.uploadedBy,
      url: this.stored.url,
      convertibleToPdf: this.convertibleToPdf,
      caseFile: this.caseFileRef,
    };
  }
}
