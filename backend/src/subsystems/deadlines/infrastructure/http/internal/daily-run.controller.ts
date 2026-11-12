import { Controller, HttpCode, HttpStatus, Inject, Logger, Post, Query, UseGuards } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { ValidationError } from "@shared/domain/domain-error";
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
import { DEV_TOOLS_ENABLED } from "../../../core/domain/ports/daily-digest-config.port";
import { DailyRunQueryDto } from "./daily-run.query.dto";
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
    @Inject(DEV_TOOLS_ENABLED) private readonly devToolsEnabled: boolean,
  ) {}

  /**
   * `?dev=true` is the shortcut behind the bell of the frontend: it wipes the
   * `sent_notifications` history so the run can be repeated by hand. It is
   * refused outside development with a 400 on `dev` — never silently ignored,
   * so nobody believes the history was reset — and **before** detecting or
   * sending anything.
   */
  @Post("daily-run")
  @HttpCode(HttpStatus.OK)
  async run(@Query() query: DailyRunQueryDto = {}): Promise<SendDailyNotificationDigestResult> {
    const resetHistory = query.dev === "true";
    if (resetHistory && !this.devToolsEnabled) {
      throw new ValidationError("VALIDATION_ERROR", "Los datos enviados no son válidos.", {
        dev: "Solo está disponible en desarrollo.",
      });
    }

    const [deadlineNotices, prescriptionNotices] = await Promise.all([
      this.detectDeadlines.execute(),
      this.detectPrescriptions.execute(),
    ]);

    const result = await this.sendDigest.execute({
      deadlineNotices,
      prescriptionNotices,
      ...(resetHistory ? { resetHistory } : {}),
    });

    this.logger.log(
      `Daily digest: mailboxSent=${result.mailboxSent} (${result.mailboxNoticeCount} avisos), ` +
        `${result.lawyerSends.filter((l) => l.sent).length}/${result.lawyerSends.length} copias a abogados enviadas`,
    );

    return result;
  }
}
