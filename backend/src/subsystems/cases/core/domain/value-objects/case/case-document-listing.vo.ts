import { CaseDocumentItem } from '../../ports/case/case-documents.port';
import { ActiveCaseFolder, CaseFolderStatus } from '../../ports/case/case-folder-state.port';

interface CaseDocumentListingProps {
  folderStatus: CaseFolderStatus | null;
  folderUrl: string | null;
  readAt: Date | null;
  documents: CaseDocumentItem[];
}

/**
 * The documents of a case as `GET /cases/{caseId}/documents` answers them
 * (HU38): the situation of the folder, when it was read and its files.
 *
 * **A value object, not a function that assembles the answer.** It is never
 * stored: the list is read from the storage on every request (D-100). It knows
 * the two shapes the answer takes — a folder that was not read because it is
 * not created (CA-38.5), and a folder read now — and the order of the files,
 * which the contract fixes and the storage does not guarantee (CA-38.3).
 */
export class CaseDocumentListing {
  private constructor(private readonly props: CaseDocumentListingProps) {}

  /** The folder is not created (or the case has none): nothing was read, `readAt` is `null`. */
  static notRead(folder: ActiveCaseFolder): CaseDocumentListing {
    return new CaseDocumentListing({
      folderStatus: folder.status,
      folderUrl: folder.url,
      readAt: null,
      documents: [],
    });
  }

  /**
   * The folder read at `readAt`. Newest first by `createdAt` (V5 `:7451`); the
   * contract fixes no tie-break, so two files created at the same instant go by
   * `id`, to keep the order stable between two reads.
   */
  static read(folder: ActiveCaseFolder, documents: readonly CaseDocumentItem[], readAt: Date): CaseDocumentListing {
    const sorted = [...documents].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id),
    );
    return new CaseDocumentListing({
      folderStatus: folder.status,
      folderUrl: folder.url,
      readAt,
      documents: sorted,
    });
  }

  get folderStatus(): CaseFolderStatus | null {
    return this.props.folderStatus;
  }

  get folderUrl(): string | null {
    return this.props.folderUrl;
  }

  get readAt(): Date | null {
    return this.props.readAt;
  }

  get documents(): readonly CaseDocumentItem[] {
    return this.props.documents;
  }
}
