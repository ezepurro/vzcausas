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
  constructor(private readonly notices: UpcomingDeadlineNotice[] = []) {}
  async execute(): Promise<UpcomingDeadlineNotice[]> {
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
    );

    const result = await controller.run();

    expect(result.mailboxSent).toBe(false);
    expect(digest.received).toEqual({
      deadlineNotices: [],
      prescriptionNotices: [],
    });
  });
});
