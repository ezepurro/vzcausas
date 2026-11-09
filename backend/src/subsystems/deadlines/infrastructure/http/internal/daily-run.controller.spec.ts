import { DailyRunController } from "./daily-run.controller";
import { DeadlineDetectionPort } from "../../../core/domain/ports/deadline-detection.port";
import { PrescriptionDetectionPort } from "../../../core/domain/ports/prescription-detection.port";
import {
  SendDailyNotificationDigestCommand,
  SendDailyNotificationDigestResult,
  SendDailyNotificationDigestUseCase,
} from "../../../core/application/use-cases/send-daily-notification-digest.use-case";
import { UpcomingDeadlineNotice, PrescriptionNotice } from "../../../core/domain/types/upcoming-deadline-notice";

class FakeDeadlineDetection implements DeadlineDetectionPort {
  calls = 0;
  constructor(private readonly notices: UpcomingDeadlineNotice[] = []) {}
  async execute(): Promise<UpcomingDeadlineNotice[]> {
    this.calls++;
    return this.notices;
  }
}

class FakePrescriptionDetection implements PrescriptionDetectionPort {
  constructor(private readonly notices: PrescriptionNotice[] = []) {}
  async execute(): Promise<PrescriptionNotice[]> {
    return this.notices;
  }
}

/** Records the exact command it received, so the spec can assert the controller wired detection into the digest correctly. */
class FakeDigestUseCase {
  received: SendDailyNotificationDigestCommand | null = null;
  constructor(private readonly result: SendDailyNotificationDigestResult) {}

  async execute(
    command: SendDailyNotificationDigestCommand,
  ): Promise<SendDailyNotificationDigestResult> {
    this.received = command;
    return this.result;
  }
}

describe("DailyRunController", () => {
  it("runs both detections and passes their notices straight into the digest", async () => {
    const deadline = { caseId: 1 } as UpcomingDeadlineNotice;
    const prescription = { caseId: 2 } as PrescriptionNotice;
    const digest = new FakeDigestUseCase({
      mailboxSent: true,
      mailboxNoticeCount: 2,
      lawyerSends: [],
    });

    const controller = new DailyRunController(
      new FakeDeadlineDetection([deadline]),
      new FakePrescriptionDetection([prescription]),
      digest as unknown as SendDailyNotificationDigestUseCase,
      false,
    );

    const result = await controller.run();

    expect(digest.received).toEqual({
      deadlineNotices: [deadline],
      prescriptionNotices: [prescription],
    });
    expect(result.mailboxSent).toBe(true);
    expect(result.mailboxNoticeCount).toBe(2);
  });

  it("returns an empty digest result when neither detection finds anything", async () => {
    const digest = new FakeDigestUseCase({
      mailboxSent: false,
      mailboxNoticeCount: 0,
      lawyerSends: [],
    });

    const controller = new DailyRunController(
      new FakeDeadlineDetection([]),
      new FakePrescriptionDetection([]),
      digest as unknown as SendDailyNotificationDigestUseCase,
      false,
    );

    const result = await controller.run();

    expect(result.mailboxSent).toBe(false);
    expect(digest.received).toEqual({
      deadlineNotices: [],
      prescriptionNotices: [],
    });
  });

  /* `?dev=true` borra el historial de `sent_notifications` para poder volver a probar la campanita. */
  describe("?dev=true", () => {
    const emptyResult = { mailboxSent: false, mailboxNoticeCount: 0, lawyerSends: [] };

    function build(devToolsEnabled: boolean) {
      const detection = new FakeDeadlineDetection([]);
      const digest = new FakeDigestUseCase(emptyResult);
      const controller = new DailyRunController(
        detection,
        new FakePrescriptionDetection([]),
        digest as unknown as SendDailyNotificationDigestUseCase,
        devToolsEnabled,
      );
      return { controller, detection, digest };
    }

    it("asks the digest to reset the history when the environment is development", async () => {
      const { controller, digest } = build(true);

      await controller.run({ dev: "true" });

      expect(digest.received).toEqual({
        deadlineNotices: [],
        prescriptionNotices: [],
        resetHistory: true,
      });
    });

    it("is rejected outside development with a 400 on `dev`, before detecting or sending anything", async () => {
      const { controller, detection, digest } = build(false);

      await expect(controller.run({ dev: "true" })).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
        details: { dev: "Solo está disponible en desarrollo." },
      });
      expect(detection.calls).toBe(0);
      expect(digest.received).toBeNull();
    });

    it.each([undefined, "false"])("dev=%s runs as usual and never resets, in any environment", async (dev) => {
      for (const devToolsEnabled of [true, false]) {
        const { controller, digest } = build(devToolsEnabled);

        await controller.run({ dev });

        expect(digest.received).toEqual({ deadlineNotices: [], prescriptionNotices: [] });
      }
    });
  });
});
