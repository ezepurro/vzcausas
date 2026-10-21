/** DI token for {@link CaseFolderOutcomePort}. */
export const CASE_FOLDER_OUTCOMES = Symbol('CASE_FOLDER_OUTCOMES');

/** How a wait for the folder of a case ended. */
export type CaseFolderOutcome = 'CREATED' | 'ERROR' | 'TIMEOUT';

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
  expect(caseId: number): Promise<CaseFolderOutcome>;

  /** The folder of this case has an answer: wakes everyone waiting for it. */
  notify(caseId: number, outcome: 'CREATED' | 'ERROR'): void;
}
