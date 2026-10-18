import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClockPort } from "@shared/domain/clock.port";

/**
 * Production {@link ClockPort}. `today()` is always the civil date in the
 * study's time zone (`APP_TIMEZONE`, Córdoba), never the server's or UTC's.
 * Registered against the {@link CLOCK} token in SharedModule.
 */
@Injectable()
export class CordobaClockAdapter implements ClockPort {
  private readonly timeZone: string;

  constructor(config: ConfigService) {
    this.timeZone = config.getOrThrow<string>("APP_TIMEZONE");
  }

  now(): Date {
    return new Date();
  }

  today(): Date {
    // The `en-CA` locale formats a date as YYYY-MM-DD.
    const civilDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: this.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(this.now());
    return new Date(`${civilDate}T00:00:00.000Z`);
  }
}
