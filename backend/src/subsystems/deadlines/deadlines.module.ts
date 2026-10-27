import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IdentityModule } from "@subsystems/identity/identity.module";
import { GoogleOAuthModule } from "@shared/infrastructure/google/google-oauth.module";
import { ClockModule } from "@shared/infrastructure/clock/clock.module";
import { DeadlinesLawyerContactLookupAdapter } from "@subsystems/identity/infrastructure/acl/deadlines-lawyer-contact-lookup.adapter";
import { CasesModule } from "@subsystems/cases/case.module";
import { DetectUpcomingDeadlinesUseCase } from "./core/application/use-cases/detect-upcoming-deadlines.use-case";
import { DetectUpcomingPrescriptionsUseCase } from "./core/application/use-cases/detect-upcoming-prescriptions.use-case";
import { SendDailyNotificationDigestUseCase } from "./core/application/use-cases/send-daily-notification-digest.use-case";
import {
  COPY_TO_RESPONSIBLE_LAWYER,
  MANAGEMENT_MAILBOX,
} from "./core/domain/ports/daily-digest-config.port";
import { DEADLINE_DETECTION } from "./core/domain/ports/deadline-detection.port";
import { DEADLINE_WARNING_BUSINESS_DAYS } from "./core/domain/ports/deadline-warning-config.port";
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
  imports: [ClockModule, IdentityModule, GoogleOAuthModule, CasesModule],

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
    // D-79: "configuración del servidor", default "con copia"
    // (API_CONTRACT_V4.md:7383). Variable opcional a propósito —
    // ver env.validation.ts, no está en REQUIRED_VARS: nadie que no
    // use `deadlines` tiene por qué cargarla, y quien sí la usa
    // mantiene el comportamiento de hoy si no la define.
    {
      provide: COPY_TO_RESPONSIBLE_LAWYER,
      useFactory: (config: ConfigService) =>
        config.get<string>("COPY_TO_RESPONSIBLE_LAWYER", "true") !== "false",
      inject: [ConfigService],
    },

    SendDailyNotificationDigestUseCase,
    InternalTriggerGuard,
    DetectUpcomingPrescriptionsUseCase,
    DetectUpcomingDeadlinesUseCase,
    // D-79, V-14: días hábiles de preaviso. Opcional, 3 por defecto. Un valor
    // inválido corta el arranque en vez de usar el default en silencio: un
    // preaviso mal configurado no avisaría y nadie lo notaría.
    {
      provide: DEADLINE_WARNING_BUSINESS_DAYS,
      useFactory: (config: ConfigService) => {
        const raw = config.get<string>("DEADLINE_WARNING_BUSINESS_DAYS", "3");
        const days = Number(raw);
        if (!Number.isInteger(days) || days < 1) {
          throw new Error(
            `DEADLINE_WARNING_BUSINESS_DAYS debe ser un entero mayor o igual a 1; vale "${raw}".`,
          );
        }
        return days;
      },
      inject: [ConfigService],
    },

    // TN-03: sin implementación real. HU51/HU52 (detección) son de
    // otro integrante del equipo y no existen en código todavía — estos
    // dos stubs solo hacen que el módulo sea auto-consistente mientras
    // tanto. Lista vacía es la salida segura: nunca genera un aviso
    // falso, solo no manda nada hasta que esto se reemplace.
    // HU51 ya existe: el token temporal apunta al caso de uso real (TV-01 de
    // IMPLEMENTACION_DETECCION.md). Se va cuando se resuelva TN-03 (QV-03).
    { provide: DEADLINE_DETECTION, useExisting: DetectUpcomingDeadlinesUseCase },
    // HU52 ya existe: el token temporal apunta al caso de uso real (TV-01 de
    // IMPLEMENTACION_DETECCION.md). Se va cuando se resuelva TN-03 (QV-03).
    { provide: PRESCRIPTION_DETECTION, useExisting: DetectUpcomingPrescriptionsUseCase },
  ],

  exports: [],
})
export class DeadlinesModule {}
