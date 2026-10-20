import { Inject, Injectable, Logger } from "@nestjs/common";
import { CLOCK, ClockPort } from "@shared/domain/clock.port";
import { deadlineNoticeKind } from "../../domain/deadline-notice-kind";
import { DeadlineDetectionPort } from "../../domain/ports/deadline-detection.port";
import { DEADLINE_WARNING_BUSINESS_DAYS } from "../../domain/ports/deadline-warning-config.port";
import { OPEN_DEADLINES, OpenDeadlinesPort } from "../../domain/ports/open-deadlines.port";
import { UpcomingDeadlineNotice } from "../../domain/types/upcoming-deadline-notice";

/**
 * HU51 — the daily check of deadlines (V4 §4, Proceso automático diario,
 * D-72): which open deadlines of active cases enter their warning, fall
 * today, or are overdue.
 *
 * Coordinates; does not decide. Due dates and business days come from `cases`
 * behind {@link OpenDeadlinesPort} (V-04) — the manual adjustment included
 * (CA-51.4) — and the classification is {@link deadlineNoticeKind}:
 *
 * 1. Picks today's date, once, for the whole run (V-06).
 * 2. Asks `cases` for every open deadline of an active case.
 * 3. Classifies each one against the warning days (D-79).
 * 4. Hands warnings and due-today ones to the digest, in its shape (N-11).
 *    Overdue ones are detected (CA-51.3) but not notified (D-64, V-13): they
 *    are only counted in the log.
 *
 * **Writes nothing** (V-03, CA-51.7). Idempotent on its own: two runs the same
 * day return the same list, and the digest sends each notice once (CA-51.8).
 *
 * `implements DeadlineDetectionPort`: the bridge to the temporary seam the
 * daily-run controller injects (TN-03, TV-01), like
 * `DetectUpcomingPrescriptionsUseCase`.
 */
@Injectable()
export class DetectUpcomingDeadlinesUseCase implements DeadlineDetectionPort {
  private readonly logger = new Logger(DetectUpcomingDeadlinesUseCase.name);

  constructor(
    @Inject(OPEN_DEADLINES) private readonly deadlines: OpenDeadlinesPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(DEADLINE_WARNING_BUSINESS_DAYS) private readonly warningBusinessDays: number,
  ) {}

  async execute(): Promise<UpcomingDeadlineNotice[]> {
    const today = this.clock.today();
    // Essential port: a failure propagates rather than reporting an empty day.
    const open = await this.deadlines.findOfActiveCases(today);

    const notices: UpcomingDeadlineNotice[] = [];
    let overdue = 0;

    for (const deadline of open) {
      const kind = deadlineNoticeKind(deadline.businessDaysRemaining, this.warningBusinessDays);
      if (kind === "OVERDUE") {
        overdue += 1;
        continue;
      }
      if (kind === null) {
        continue;
      }
      notices.push({
        caseId: deadline.caseId,
        caption: deadline.caption,
        sacNumber: deadline.sacNumber,
        jurisdiction: deadline.jurisdiction,
        responsibleLawyerId: deadline.responsibleLawyerId,
        kind,
        origin: deadline.origin,
        // Copied as received, never recomputed: the date in the email is the
        // one the case shows (CA-51.9).
        dueDate: deadline.dueDate,
        proceduralActId: deadline.proceduralActId,
      });
    }

    this.logger.log(
      `Verificación de plazos: ${notices.length} para avisar, ${overdue} vencidos sin aviso (D-64).`,
    );
    return notices;
  }
}
