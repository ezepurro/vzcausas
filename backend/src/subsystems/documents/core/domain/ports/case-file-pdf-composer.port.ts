/** DI token for {@link CaseFilePdfComposer}. */
export const CASE_FILE_PDF_COMPOSER = Symbol('CASE_FILE_PDF_COMPOSER');

/**
 * One piece of a case file, already PDF or an image that still has to be put
 * on a page. The cover sheet and the converted documents are PDFs.
 */
export type CaseFilePdfPart =
  | { kind: 'PDF'; content: Uint8Array }
  | { kind: 'IMAGE'; mimeType: 'image/jpeg' | 'image/png'; content: Uint8Array };

/** The joined PDF and how many pages it has (`pageCount`, CA-25.9). */
export interface ComposedPdf {
  content: Buffer;
  pageCount: number;
}

/**
 * Joins the parts of a case file into one PDF, in order (HU25, CA-25.1): a PDF
 * with all its pages, an image alone on an A4 page, fitted to it (CA-25.4).
 * Implemented in `infrastructure/pdf`, with the library the cover sheet uses.
 */
export interface CaseFilePdfComposer {
  /** @throws {DocumentNotConvertibleError} a part claims to be a PDF and cannot be opened. */
  compose(parts: readonly CaseFilePdfPart[]): Promise<ComposedPdf>;
}
