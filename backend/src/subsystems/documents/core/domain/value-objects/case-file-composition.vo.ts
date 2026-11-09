import { CaseDocument } from '../entities/case-document.entity';
import { CaseFileDocumentsInvalidError, DocumentNotConvertibleError } from '../errors/documents.errors';

/** The name of the first part, the cover sheet, in the response (V5 `:7791`). */
const COVER_NAME = 'Carátula';

/** One part of a case file, in order (V5 `:7765`). */
export interface CaseFilePart {
  /** From 1: the cover sheet is always 1. */
  position: number;
  kind: 'COVER' | 'DOCUMENT';
  /** `null` for the cover sheet. */
  documentId: string | null;
  name: string;
}

/**
 * What a case file will hold (HU25): the cover sheet, always first, and the
 * chosen documents in the order the user set (CA-25.1).
 *
 * **A value object, not a check in the use case.** It decides whether the
 * chosen documents can make a case file, in the agreed order:
 *
 * 1. Each one is a document of the folder of the case, and not a case file
 *    generated before (400, CA-25.3).
 * 2. Each one can become PDF (422 `DOCUMENT_NOT_CONVERTIBLE`, CA-25.4).
 *
 * The 400 goes first, apart from the general rule (422 before the 400 of
 * content): whether a document that is not in the folder can be converted is
 * not defined. Decided on 03/11/2026.
 *
 * Whether the list is empty or repeats an id is the shape of the request, and
 * `cases` checks it before reaching here.
 */
export class CaseFileComposition {
  private constructor(private readonly chosen: readonly CaseDocument[]) {}

  /**
   * @param found the documents the storage returned for those ids, built with
   *        their row of `case_files` if they have one. An id the storage does
   *        not have is absent.
   * @throws {CaseFileDocumentsInvalidError} 400.
   * @throws {DocumentNotConvertibleError} 422.
   */
  static create(input: {
    folderId: string;
    documentIds: readonly string[];
    found: ReadonlyMap<string, CaseDocument>;
  }): CaseFileComposition {
    const chosen = input.documentIds.map((id) => input.found.get(id));

    if (chosen.some((document) => !document || !document.isIn(input.folderId) || document.isCaseFile)) {
      throw new CaseFileDocumentsInvalidError();
    }
    const documents = chosen as CaseDocument[];
    if (documents.some((document) => !document.convertibleToPdf)) {
      throw new DocumentNotConvertibleError();
    }
    return new CaseFileComposition(documents);
  }

  /** The chosen documents, in the order of the case file. */
  get documents(): readonly CaseDocument[] {
    return this.chosen;
  }

  /** The cover sheet and then each document, numbered from 1 (CA-25.9). */
  parts(): CaseFilePart[] {
    return [
      { position: 1, kind: 'COVER', documentId: null, name: COVER_NAME },
      ...this.chosen.map((document, index) => ({
        position: index + 2,
        kind: 'DOCUMENT' as const,
        documentId: document.id,
        name: document.name,
      })),
    ];
  }
}
