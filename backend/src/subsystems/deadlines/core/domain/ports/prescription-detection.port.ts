import { PrescriptionNotice } from "../types/upcoming-deadline-notice";

/** DI token for {@link PrescriptionDetectionPort}. */
export const PRESCRIPTION_DETECTION = Symbol("PRESCRIPTION_DETECTION");

/**
 * **Temporary seam, not a real ACL port.** Same situation as
 * {@link DeadlineDetectionPort} — see its doc comment. Stands in for
 * `DetectUpcomingPrescriptions` (HU52), which is also another team
 * member's half (N-02) and does not exist in code yet.
 */
export interface PrescriptionDetectionPort {
  execute(): Promise<PrescriptionNotice[]>;
}
