/** DI token for {@link CaseFolderStatePort}. */
export const CASE_FOLDER_STATE = Symbol('CASE_FOLDER_STATE');

/**
 * Where the cloud folder of a case stands (`cases.folder_status`, API contract
 * `CaseFolderStatus`):
 *
 * - `PENDING`   not created; nobody asked for it yet, or the user chose not to.
 * - `CREATING`  asked for, waiting for the answer.
 * - `CREATED`   exists; the case holds its id.
 * - `ERROR`     the creation failed; it is retried.
 */
export type CaseFolderStatus = 'PENDING' | 'CREATING' | 'CREATED' | 'ERROR';

/**
 * The folder of a case as the API shows it (`folder` of the case resource).
 * `url` and `path` are `null` until the folder is `CREATED`.
 */
export interface CaseFolderView {
  status: CaseFolderStatus;
  url: string | null;
  path: string | null;
  /** Templates copied into the folder (HU40). `0` if copying was not asked for. */
  templatesCopied: number;
  /** Templates asked for and not copied yet, because the folder failed or some copy did (HU40). */
  templatesPending: number;
}

/**
 * Port over the folder columns of `cases`. It is the gate that keeps a case
 * from having two folder requests in flight: only a caller whose
 * {@link startCreating} returns `true` may ask `documents` for the folder.
 */
export interface CaseFolderStatePort {
  /**
   * Moves the case to `CREATING`, in one atomic step, **only** if it is
   * `PENDING`, `ERROR` or has no status (a case registered before the folders
   * existed). Returns `false` if it was already `CREATING` or `CREATED`, or the
   * case does not exist; the caller must then not ask for a folder.
   */
  startCreating(caseId: number): Promise<boolean>;

  /** The folder now exists: stores its id and moves the case to `CREATED`. */
  markCreated(caseId: number, cloudFolderId: string): Promise<void>;

  /**
   * The creation failed: moves the case from `CREATING` to `ERROR`. A case in
   * any other status is left alone, so a late failure never undoes a folder
   * that was created.
   */
  markFailed(caseId: number): Promise<void>;

  /** The folder of the case, or `null` for a case registered before the folders existed. */
  find(caseId: number): Promise<CaseFolderView | null>;
}
