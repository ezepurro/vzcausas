import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IdentityModule } from "@subsystems/identity/identity.module";
import { GoogleOAuthModule } from "@shared/infrastructure/google/google-oauth.module";
import { SharedModule } from "@shared/shared.module";
import { DeadlinesLawyerContactLookupAdapter } from "@subsystems/identity/infrastructure/acl/deadlines-lawyer-contact-lookup.adapter";
import { SendDailyNotificationDigestUseCase } from "./core/application/use-cases/send-daily-notification-digest.use-case";
import {
  COPY_TO_RESPONSIBLE_LAWYER,
  MANAGEMENT_MAILBOX,
} from "./core/domain/ports/daily-digest-config.port";
import { DEADLINE_DETECTION } from "./core/domain/ports/deadline-detection.port";
import { EMAIL_SENDER } from "./core/domain/ports/email-sender.port";
import { LAWYER_CONTACT_LOOKUP } from "./core/domain/ports/lawyer-contact-lookup.port";
import { PRESCRIPTION_DETECTION } from "./core/domain/ports/prescription-detection.port";
import { SENT_NOTIFICATION_REPOSITORY } from "./core/domain/ports/sent-notification.repository";
import { GmailApiEmailAdapter } from "./infrastructure/external/gmail-api-email.adapter";
import { DailyRunController } from "./infrastructure/http/internal/daily-run.controller";
import { InternalTriggerGuard } from "./infrastructure/http/internal/internal-trigger.guard";
import { PrismaSentNotificationRepository } from "./infrastructure/persistence/prisma-sent-notification.repository";

/**
 * Composition point of HU30/HU32 — the "avisar" half of `deadlines`
 * (N-02). `PrismaModule` and `GoogleOAuthModule` are consumed here
 * explicitly even though the latter is `@Global()`, the same reasoning
 * `IdentityModule` gives for `PrismaModule`: nothing imported this
 * module into `AppModule` before, so this import is what actually makes
 * `GoogleOAuthClientService` reachable once it does.
 *
 * **Not imported into `AppModule` yet, on purpose.** Two reasons:
 * 1. `GmailApiEmailAdapter` and `MANAGEMENT_MAILBOX` fail at construction
 *    if `GOOGLE_OAUTH_*`/`MANAGEMENT_MAILBOX`/`INTERNAL_TRIGGER_SECRET`
 *    are not set — wiring this in today would stop the app from
 *    booting for anyone without that `.env`, the teammate included.
 * 2. `DEADLINE_DETECTION`/`PRESCRIPTION_DETECTION` are bound to
 *    always-empty stubs (TN-03) — correct and safe (never a false
 *    notification), but means the digest is a no-op until HU51/HU52
 *    exist and replace them.
 */
@Module({
  imports: [SharedModule, IdentityModule, GoogleOAuthModule],

  controllers: [DailyRunController],

  providers: [
    { provide: EMAIL_SENDER, useClass: GmailApiEmailAdapter },
    // useExisting: el adaptador ya se instancia en `IdentityModule`
    // (donde vive `UserRepository`); acá solo se liga el token.
    { provide: LAWYER_CONTACT_LOOKUP, useExisting: DeadlinesLawyerContactLookupAdapter },
    { provide: SENT_NOTIFICATION_REPOSITORY, useClass: PrismaSentNotificationRepository },

    {
      provide: MANAGEMENT_MAILBOX,
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>("MANAGEMENT_MAILBOX"),
      inject: [ConfigService],
    },
    // Hardcodeado al default que documenta el contrato ("3 días
    // hábiles, 08:00, con copia" — API_CONTRACT_V4.md:7383), no leído
    // de ninguna variable: QN-03 (dónde vive esta config de verdad)
    // sigue sin resolver. Revisar cuando se resuelva.
    { provide: COPY_TO_RESPONSIBLE_LAWYER, useValue: true },

    SendDailyNotificationDigestUseCase,
    InternalTriggerGuard,

    // TN-03: sin implementación real. HU51/HU52 (detección) son de
    // otro integrante del equipo y no existen en código todavía — estos
    // dos stubs solo hacen que el módulo sea auto-consistente mientras
    // tanto. Lista vacía es la salida segura: nunca genera un aviso
    // falso, solo no manda nada hasta que esto se reemplace.
    { provide: DEADLINE_DETECTION, useValue: { execute: async () => [] } },
    { provide: PRESCRIPTION_DETECTION, useValue: { execute: async () => [] } },
  ],

  exports: [],
})
export class DeadlinesModule {}
