import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClockPort } from "@shared/domain/clock.port";

/**
 * Production {@link ClockPort} implementation. Returns real wall-clock
 * time. Registered against the {@link CLOCK} token in SharedModule.
 * Tests should provide their own fake instead of using this class.
 */
@Injectable()
export class SystemClockAdapter implements ClockPort {
  private readonly timeZone: string;

  constructor(config: ConfigService) {
    // Same variable `AuthHttpMapper` reads, and mandatory for the same
    // reason: a civil date computed in the wrong timezone is wrong by a
    // whole day, silently. Failing at boot beats guessing UTC.
    this.timeZone = config.getOrThrow<string>("APP_TIMEZONE");
  }

  now(): Date {
    return new Date();
  }

  /**
   * Asks `Intl` for the year, month and day as they read **in the
   * study's timezone**, then rebuilds them as midnight UTC.
   *
   * Going through `Intl` rather than arithmetic on the UTC offset is
   * what keeps this correct across daylight saving changes: the
   * offset is not a constant, and hardcoding -03:00 would drift the
   * day the moment the rule changes.
   */
  today(): Date {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: this.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(this.now());

    // `en-CA` formats as YYYY-MM-DD, which `Date.UTC` can take apart
    // without locale guessing.
    const [year, month, day] = parts.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
}
