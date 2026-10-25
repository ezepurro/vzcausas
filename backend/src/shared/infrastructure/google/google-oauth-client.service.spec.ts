import { ConfigService } from "@nestjs/config";
import { GoogleOAuthClientService } from "./google-oauth-client.service";

function fakeConfig(values: Record<string, string>): ConfigService {
  return {
    getOrThrow: (key: string) => {
      if (!(key in values)) {
        throw new Error(`Missing env var: ${key}`);
      }
      return values[key];
    },
  } as unknown as ConfigService;
}

describe("GoogleOAuthClientService", () => {
  it("builds a client with the refresh token set as credentials", () => {
    const service = new GoogleOAuthClientService(
      fakeConfig({
        GOOGLE_OAUTH_CLIENT_ID: "client-id",
        GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
        GOOGLE_OAUTH_REFRESH_TOKEN: "refresh-token",
      }),
    );

    expect(service.getClient().credentials.refresh_token).toBe(
      "refresh-token",
    );
  });

  it("fails fast when a required variable is missing", () => {
    expect(
      () =>
        new GoogleOAuthClientService(
          fakeConfig({
            GOOGLE_OAUTH_CLIENT_ID: "client-id",
            GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
          }),
        ),
    ).toThrow("GOOGLE_OAUTH_REFRESH_TOKEN");
  });
});
