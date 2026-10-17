/** DI token for {@link CaseFolderPort}. */
export const CASE_FOLDER = Symbol('CASE_FOLDER');

/** What `cases` needs to ask for the case's cloud folder (HU39). */
export interface CaseFolderRequest {
  caseId: number;
  /** Case caption; the folder is named after it. */
  caption: string;
  lawyer: { id: number; lastName: string; firstName: string };
  jurisdiction: { id: number; label: string };
}

/** The case's cloud folder, as `cases` stores it (CA-39.4). */
export interface CaseFolderRef {
  cloudFolderId: string;
  url: string;
}

/**
 * Port towards `documents`, which owns the cloud folders: its adapter lives
 * there. Complementary port (R-03): its failure must not abort registering a
 * case, which stays with its folder `PENDING`.
 */
export interface CaseFolderPort {
  /**
   * Returns the case's folder, creating it if it does not exist yet. Calling
   * it again for the same case never creates a second folder (CA-39.7).
   *
   * @throws {DocumentStorageUnavailableError} if the storage is unavailable.
   */
  ensureCaseFolder(request: CaseFolderRequest): Promise<CaseFolderRef>;
}
