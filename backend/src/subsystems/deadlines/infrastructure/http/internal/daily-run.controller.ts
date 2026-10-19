import { Controller, HttpCode, HttpStatus, Inject, Logger, Post, UseGuards } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "@shared/infrastructure/http/public.decorator";
import {
  SendDailyNotificationDigestResult,
  SendDailyNotificationDigestUseCase,
} from "../../../core/application/use-cases/send-daily-notification-digest.use-case";
import {
  DEADLINE_DETECTION,
  DeadlineDetectionPort,
} from "../../../core/domain/ports/deadline-detection.port";
import {
  PRESCRIPTION_DETECTION,
  PrescriptionDetectionPort,
} from "../../../core/domain/ports/prescription-detection.port";
import { InternalTriggerGuard } from "./internal-trigger.guard";

/**
 * What GitHub Actions hits every 2-3 hours (N-04), not a user. `@Public()`
 * skips the global `JwtAuthGuard`; `InternalTriggerGuard` is this route's
 * own protection instead. `@SkipThrottle()` for the same reason the health
 * check has it — the per-IP limiter has nothing to do with this caller.
 *
 * Two lines of real work, same as any controller
 * (`EJEMPLO_CASO_DE_USO.md` §11): detect, then notify. Detection is
 * injected through the temporary seam described in
 * `deadline-detection.port.ts` / `prescription-detection.port.ts` —
 * nothing implements it yet (HU51/HU52, another team member), so this
 * route is written and tested but not reachable until something is bound
 * to those two tokens in a module.
 */
@Public()
@SkipThrottle()
@UseGuards(InternalTriggerGuard)
@Controller("internal/deadlines")
export class DailyRunController {
  private readonly logger = new Logger(DailyRunController.name);

  constructor(
    @Inject(DEADLINE_DETECTION) private readonly detectDeadlines: DeadlineDetectionPort,
    @Inject(PRESCRIPTION_DETECTION)
    private readonly detectPrescriptions: PrescriptionDetectionPort,
    private readonly sendDigest: SendDailyNotificationDigestUseCase,
  ) {}

  @Post("daily-run")
  @HttpCode(HttpStatus.OK)
  async run(): Promise<SendDailyNotificationDigestResult> {
    const [deadlineNotices, prescriptionNotices] = await Promise.all([
      this.detectDeadlines.execute(),
      this.detectPrescriptions.execute(),
    ]);

    const result = await this.sendDigest.execute({
      deadlineNotices,
      prescriptionNotices,
    });

    this.logger.log(
      `Daily digest: mailboxSent=${result.mailboxSent} (${result.mailboxNoticeCount} avisos), ` +
        `${result.lawyerSends.filter((l) => l.sent).length}/${result.lawyerSends.length} copias a abogados enviadas`,
    );

    return result;
  }
}
