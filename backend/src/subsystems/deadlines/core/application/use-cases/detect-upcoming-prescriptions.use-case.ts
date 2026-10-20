import { Inject, Injectable } from "@nestjs/common";
import { CLOCK, ClockPort } from "@shared/domain/clock.port";
import { prescriptionNoticeKind } from "../../domain/prescription-notice-kind";
import { PrescriptionDetectionPort } from "../../domain/ports/prescription-detection.port";
import {
  PRESCRIPTION_STATUS,
  PrescriptionStatusPort,
} from "../../domain/ports/prescription-status.port";
import { PrescriptionNotice } from "../../domain/types/upcoming-deadline-notice";

/**
 * HU52 — the daily check of prescription (V4 §4, Proceso automático diario,
 * D-72): which active criminal cases reached 70 % of their term today, and
 * which met it.
 *
 * Coordinates; does not decide. The prescription itself is computed by
 * `cases` behind {@link PrescriptionStatusPort} (V-04), and which notice a
 * case gets is {@link prescriptionNoticeKind} (V-02). This class only puts
 * them in order:
 *
 * 1. Picks today's date, once, for the whole run (V-06).
 * 2. Asks `cases` for the prescription of every active criminal case.
 * 3. Classifies each one; drops those that call for no notice.
 * 4. Hands the rest over in the shape the digest expects (N-11).
 *
 * **Writes nothing** (V-03): it has no writing port at all, which is what
 * keeps CA-52.5 true by construction. The same case is detected every day it
 * stays in alert; that it is notified only once is `sent_notifications`' job,
 * in the digest (CA-52.7). Running it twice the same day returns the same
 * list, so it is idempotent on its own.
 *
 * `implements PrescriptionDetectionPort` is the bridge to the temporary seam
 * the daily-run controller injects (TN-03 of `IMPLEMENTACION_NOTIFICACIONES.md`,
 * TV-01): it makes the compiler check this class still fits there. Goes away
 * with that port (QV-03).
 */
@Injectable()
export class DetectUpcomingPrescriptionsUseCase implements PrescriptionDetectionPort {
  constructor(
    @Inject(PRESCRIPTION_STATUS) private readonly prescriptions: PrescriptionStatusPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(): Promise<PrescriptionNotice[]> {
    const today = this.clock.today();
    // Essential port: if it fails, the error propagates rather than reporting
    // an empty day. Nothing was recorded, so the next run starts clean.
    const statuses = await this.prescriptions.findOfActiveCriminalCases(today);

    return statuses.flatMap((status): PrescriptionNotice[] => {
      const kind = prescriptionNoticeKind(status);
      if (kind === null) {
        return [];
      }
      return [
        {
          caseId: status.caseId,
          caption: status.caption,
          sacNumber: status.sacNumber,
          responsibleLawyerId: status.responsibleLawyerId,
          kind,
          // Copied as received, never recomputed: the date in the email is
          // the one the case shows (D-72).
          referenceDate: status.expiresOn,
          legalQualificationName: status.legalQualificationName,
        },
      ];
    });
  }
}
