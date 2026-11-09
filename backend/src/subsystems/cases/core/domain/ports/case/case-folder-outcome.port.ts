/** DI token for {@link CaseFolderOutcomePort}. */
export const CASE_FOLDER_OUTCOMES = Symbol('CASE_FOLDER_OUTCOMES');

/** How a wait for the folder of a case ended. */
export type CaseFolderOutcome = 'CREATED' | 'ERROR' | 'TIMEOUT';

/** What a wait can be told: the folder exists, it failed, or the templates were copied (HU40). */
export type CaseFolderNotice = 'CREATED' | 'ERROR' | 'COPIED';

export interface CaseFolderWaitOptions {
  /**
   * The request also asked to copy the templates (HU40): the wait does not end
   * with the folder (`CREATED`) but when the copy ends (`COPIED`), so the
   * answer shows how many templates were copied. An `ERROR` ends it either way.
   */
  untilTemplates?: boolean;
}

/**
 * Lets a request wait, up to a limit, for the answer of the folder it asked
 * for. The limit is the adapter's business, not the caller's. The answer comes
 * later and from somewhere else (an event), so the request registers its wait
 * **before** asking, or it could miss the answer.
 *
 * Today it lives in the memory of the process, so it only works with a single
 * instance of the backend. If there ever is more than one, this port is what
 * gets replaced (for instance by reading the status from the database).
 */
export interface CaseFolderOutcomePort {
  /** Starts waiting for the folder of this case. The wait is registered when this is called. */
  expect(caseId: number, options?: CaseFolderWaitOptions): Promise<CaseFolderOutcome>;

  /**
   * The folder of this case has an answer. `CREATED` wakes the waits that do not
   * need the templates; `COPIED` wakes all of them (the folder exists by then);
   * `ERROR` wakes all of them.
   */
  notify(caseId: number, notice: CaseFolderNotice): void;
}
