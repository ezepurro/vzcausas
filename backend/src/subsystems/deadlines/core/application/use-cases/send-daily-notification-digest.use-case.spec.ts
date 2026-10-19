import { SendDailyNotificationDigestUseCase } from "./send-daily-notification-digest.use-case";
import {
  FakeEmailSender,
  FakeLawyerContactLookup,
  FakeSentNotificationRepository,
} from "./test-support/deadlines-fakes";
import { JurisdictionCode } from "../../domain/value-objects/jurisdiction-code";
import {
  PrescriptionNotice,
  UpcomingDeadlineNotice,
} from "../../domain/types/upcoming-deadline-notice";

const MAILBOX = "gestion@example.com";

function deadlineNotice(
  overrides: Partial<UpcomingDeadlineNotice> = {},
): UpcomingDeadlineNotice {
  return {
    caseId: 1,
    caption: "PÉREZ, Juan p.s.a. Hurto",
    sacNumber: "12345678",
    jurisdiction: JurisdictionCode.CRIMINAL,
    responsibleLawyerId: 10,
    kind: "DEADLINE_DUE_TODAY",
    origin: "PROCEDURAL_ACT",
    dueDate: "2026-10-18",
    proceduralActId: 100,
    ...overrides,
  };
}

function prescriptionNotice(
  overrides: Partial<PrescriptionNotice> = {},
): PrescriptionNotice {
  return {
    caseId: 2,
    caption: "GÓMEZ, Ariel p.s.a. Robo calificado",
    sacNumber: "87654321",
    responsibleLawyerId: 20,
    kind: "PRESCRIPTION_ALERT",
    referenceDate: "2026-10-18",
    legalQualificationName: "Robo calificado",
    ...overrides,
  };
}

function build(copyToResponsibleLawyer = true) {
  const emailSender = new FakeEmailSender();
  const lawyerContacts = new FakeLawyerContactLookup();
  const sentNotifications = new FakeSentNotificationRepository();
  const useCase = new SendDailyNotificationDigestUseCase(
    emailSender,
    lawyerContacts,
    sentNotifications,
    MAILBOX,
    copyToResponsibleLawyer,
  );
  return { useCase, emailSender, lawyerContacts, sentNotifications };
}

describe("SendDailyNotificationDigestUseCase", () => {
  it("sends one email to the mailbox with every pending notice and records each one", async () => {
    const { useCase, emailSender, sentNotifications } = build(false);
    const deadline = deadlineNotice();
    const prescription = prescriptionNotice();

    const result = await useCase.execute({
      deadlineNotices: [deadline],
      prescriptionNotices: [prescription],
    });

    expect(result.mailboxSent).toBe(true);
    expect(result.mailboxNoticeCount).toBe(2);
    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0].to).toEqual([MAILBOX]);
    expect(emailSender.sent[0].html).toContain("PÉREZ");
    expect(emailSender.sent[0].html).toContain("GÓMEZ");
    expect(
      await sentNotifications.existsFor({
        caseId: deadline.caseId,
        kind: deadline.kind,
        referenceDate: deadline.dueDate,
        recipientLawyerId: null,
      }),
    ).toBe(true);
  });

  it("sends nothing to the mailbox when there is nothing pending (CA-30.6)", async () => {
    const { useCase, emailSender } = build(false);

    const result = await useCase.execute({
      deadlineNotices: [],
      prescriptionNotices: [],
    });

    expect(result.mailboxSent).toBe(false);
    expect(emailSender.sent).toHaveLength(0);
  });

  it("does not resend to the mailbox once already recorded (CA-30.7)", async () => {
    const { useCase, emailSender, sentNotifications } = build(false);
    const notice = deadlineNotice();
    sentNotifications.seed({
      caseId: notice.caseId,
      kind: notice.kind,
      referenceDate: notice.dueDate,
      recipientLawyerId: null,
    });

    const result = await useCase.execute({
      deadlineNotices: [notice],
      prescriptionNotices: [],
    });

    expect(result.mailboxSent).toBe(false);
    expect(emailSender.sent).toHaveLength(0);
  });

  it("sends a copy to each responsible lawyer with only their own notices", async () => {
    const { useCase, emailSender, lawyerContacts } = build(true);
    lawyerContacts.byLawyerId.set(10, {
      fullName: "Abogado Uno",
      userEmail: "uno@example.com",
    });
    lawyerContacts.byLawyerId.set(20, {
      fullName: "Abogado Dos",
      userEmail: "dos@example.com",
    });

    const result = await useCase.execute({
      deadlineNotices: [deadlineNotice({ responsibleLawyerId: 10 })],
      prescriptionNotices: [prescriptionNotice({ responsibleLawyerId: 20 })],
    });

    expect(result.lawyerSends).toHaveLength(2);
    expect(result.lawyerSends).toEqual(
      expect.arrayContaining([
        { lawyerId: 10, sent: true, noticeCount: 1 },
        { lawyerId: 20, sent: true, noticeCount: 1 },
      ]),
    );

    const toUno = emailSender.sent.find((m) => m.to[0] === "uno@example.com")!;
    expect(toUno.html).toContain("PÉREZ");
    expect(toUno.html).not.toContain("GÓMEZ");
  });

  it("skips a lawyer with no linked email, without throwing (CA-30.5)", async () => {
    const { useCase, emailSender } = build(true);
    // lawyerContacts has no entry for lawyerId 10 at all.

    const result = await useCase.execute({
      deadlineNotices: [deadlineNotice({ responsibleLawyerId: 10 })],
      prescriptionNotices: [],
    });

    expect(result.lawyerSends).toEqual([
      { lawyerId: 10, sent: false, noticeCount: 0 },
    ]);
    // CA-30.4: la casilla igual lo recibe, aunque el abogado no tenga email.
    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0].to).toEqual([MAILBOX]);
  });

  it("one lawyer's send failure does not stop another lawyer's send or the mailbox (N-07)", async () => {
    const { useCase, emailSender, lawyerContacts } = build(true);
    lawyerContacts.byLawyerId.set(10, {
      fullName: "Falla",
      userEmail: "falla@example.com",
    });
    lawyerContacts.byLawyerId.set(20, {
      fullName: "Ok",
      userEmail: "ok@example.com",
    });
    emailSender.failFor.add("falla@example.com");

    const result = await useCase.execute({
      deadlineNotices: [deadlineNotice({ responsibleLawyerId: 10 })],
      prescriptionNotices: [prescriptionNotice({ responsibleLawyerId: 20 })],
    });

    expect(result.mailboxSent).toBe(true);
    expect(result.lawyerSends).toEqual(
      expect.arrayContaining([
        { lawyerId: 10, sent: false, noticeCount: 0 },
        { lawyerId: 20, sent: true, noticeCount: 1 },
      ]),
    );
  });

  it("skips every lawyer copy when copyToResponsibleLawyer is disabled", async () => {
    const { useCase, emailSender, lawyerContacts } = build(false);
    lawyerContacts.byLawyerId.set(10, {
      fullName: "Abogado",
      userEmail: "uno@example.com",
    });

    const result = await useCase.execute({
      deadlineNotices: [deadlineNotice({ responsibleLawyerId: 10 })],
      prescriptionNotices: [],
    });

    expect(result.lawyerSends).toEqual([]);
    expect(emailSender.sent.every((m) => m.to[0] === MAILBOX)).toBe(true);
  });
});
