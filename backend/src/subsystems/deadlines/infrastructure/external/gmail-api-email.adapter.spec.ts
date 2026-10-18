import { ConfigService } from "@nestjs/config";
import {
  GmailApiEmailAdapter,
  GmailMessagesClient,
} from "./gmail-api-email.adapter";
import { GoogleOAuthClientService } from "@shared/infrastructure/google/google-oauth-client.service";

function fakeConfig(mailbox: string): ConfigService {
  return {
    getOrThrow: () => mailbox,
  } as unknown as ConfigService;
}

// Never invoked when a fake GmailMessagesClient is passed to the
// constructor, but the adapter still takes it as a typed parameter.
const unusedOauth = {} as GoogleOAuthClientService;

function decodeRaw(raw: string): string {
  const base64 = raw.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

describe("GmailApiEmailAdapter", () => {
  it("sends a MIME message with From, To, Subject and HTML body", async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const gmail: GmailMessagesClient = { users: { messages: { send } } } as never;

    const adapter = new GmailApiEmailAdapter(
      unusedOauth,
      fakeConfig("gestion@example.com"),
      gmail,
    );

    await adapter.send({
      to: ["abogado@example.com"],
      subject: "Vencimientos de hoy",
      html: "<p>Hola</p>",
    });

    expect(send).toHaveBeenCalledTimes(1);
    const raw = send.mock.calls[0][0].requestBody.raw as string;
    const mime = decodeRaw(raw);

    expect(mime).toContain("From: gestion@example.com");
    expect(mime).toContain("To: abogado@example.com");
    expect(mime).toContain('Content-Type: text/html; charset="UTF-8"');
    expect(mime).toContain("<p>Hola</p>");
    expect(mime).not.toContain("Cc:");
  });

  it("includes Cc only when present", async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const gmail: GmailMessagesClient = { users: { messages: { send } } } as never;

    const adapter = new GmailApiEmailAdapter(
      unusedOauth,
      fakeConfig("gestion@example.com"),
      gmail,
    );

    await adapter.send({
      to: ["abogado@example.com"],
      cc: ["otro@example.com"],
      subject: "Asunto",
      html: "<p>Hola</p>",
    });

    const raw = send.mock.calls[0][0].requestBody.raw as string;
    expect(decodeRaw(raw)).toContain("Cc: otro@example.com");
  });

  it("retries on a transient error and succeeds", async () => {
    const send = jest
      .fn()
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockResolvedValueOnce(undefined);
    const gmail: GmailMessagesClient = { users: { messages: { send } } } as never;
    const sleep = jest.fn().mockResolvedValue(undefined);

    const adapter = new GmailApiEmailAdapter(
      unusedOauth,
      fakeConfig("gestion@example.com"),
      gmail,
      sleep,
    );

    await adapter.send({
      to: ["abogado@example.com"],
      subject: "Asunto",
      html: "<p>Hola</p>",
    });

    expect(send).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  it("does not retry a non-transient error", async () => {
    const send = jest.fn().mockRejectedValue({ response: { status: 400 } });
    const gmail: GmailMessagesClient = { users: { messages: { send } } } as never;
    const sleep = jest.fn().mockResolvedValue(undefined);

    const adapter = new GmailApiEmailAdapter(
      unusedOauth,
      fakeConfig("gestion@example.com"),
      gmail,
      sleep,
    );

    await expect(
      adapter.send({
        to: ["abogado@example.com"],
        subject: "Asunto",
        html: "<p>Hola</p>",
      }),
    ).rejects.toEqual({ response: { status: 400 } });

    expect(send).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("gives up after exhausting retries on a persistent transient error", async () => {
    const send = jest.fn().mockRejectedValue({ response: { status: 503 } });
    const gmail: GmailMessagesClient = { users: { messages: { send } } } as never;
    const sleep = jest.fn().mockResolvedValue(undefined);

    const adapter = new GmailApiEmailAdapter(
      unusedOauth,
      fakeConfig("gestion@example.com"),
      gmail,
      sleep,
    );

    await expect(
      adapter.send({
        to: ["abogado@example.com"],
        subject: "Asunto",
        html: "<p>Hola</p>",
      }),
    ).rejects.toEqual({ response: { status: 503 } });

    expect(send).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(1, 1000);
    expect(sleep).toHaveBeenNthCalledWith(2, 2000);
  });
});
