import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { google } from "googleapis";

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

/**
 * The single OAuth client shared by every subsystem that talks to Google —
 * `deadlines` (Gmail) today, `documents` (Drive) once that subsystem
 * exists. One refresh token, requested with every scope the app needs at
 * once (N-10, `ADR-004_EMAIL_GMAIL_API.md` §2.1). Knows nothing about Gmail
 * or Drive: same admission criterion as `PrismaService`
 * (`ARQUITECTURA_BACKEND_V1.md:551`) — genuinely transversal, free of
 * business rules.
 *
 * Not yet imported into `app.module.ts`: nothing consumes it until
 * `deadlines.module.ts` exists (QN-04, still open in
 * `IMPLEMENTACION_NOTIFICACIONES.md`).
 */
@Injectable()
export class GoogleOAuthClientService {
  private readonly client: OAuth2Client;

  constructor(config: ConfigService) {
    const clientId = config.getOrThrow<string>("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = config.getOrThrow<string>(
      "GOOGLE_OAUTH_CLIENT_SECRET",
    );
    const refreshToken = config.getOrThrow<string>(
      "GOOGLE_OAUTH_REFRESH_TOKEN",
    );

    this.client = new google.auth.OAuth2(clientId, clientSecret);
    this.client.setCredentials({ refresh_token: refreshToken });
  }

  /** Pass this as `auth` to any `googleapis` client (`google.gmail`, `google.drive`, ...). */
  getClient(): OAuth2Client {
    return this.client;
  }
}
