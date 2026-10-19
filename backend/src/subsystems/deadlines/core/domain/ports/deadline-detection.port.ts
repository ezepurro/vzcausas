import { UpcomingDeadlineNotice } from "../types/upcoming-deadline-notice";

/** DI token for {@link DeadlineDetectionPort}. */
export const DEADLINE_DETECTION = Symbol("DEADLINE_DETECTION");

/**
 * **Temporary seam, not a real ACL port.** `ARQUITECTURA_BACKEND_V1.md`
 * §6.4 says the daily trigger "invoca `DetectUpcomingDeadlines.execute()`"
 * directly — detection and notification are two halves of the *same*
 * subsystem, `deadlines`, not two subsystems talking through a port.
 *
 * `DetectUpcomingDeadlines` (HU51) does not exist in code yet; it is
 * another team member's half (N-02). This interface exists only so
 * `daily-run.controller.ts` has something to inject and test today.
 * When HU51 is written, the natural move is to delete this file and
 * inject `DetectUpcomingDeadlinesUseCase` directly — not to write an
 * adapter implementing it.
 */
export interface DeadlineDetectionPort {
  execute(): Promise<UpcomingDeadlineNotice[]>;
}
