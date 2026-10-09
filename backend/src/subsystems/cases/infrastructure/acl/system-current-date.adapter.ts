import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { CurrentDatePort } from '../../core/domain/ports/current-date.port';

/** {@link CurrentDatePort} built from the shared clock and the study's time zone (`APP_TIMEZONE`). */
@Injectable()
export class SystemCurrentDateAdapter implements CurrentDatePort {
  private readonly timeZone: string;

  constructor(
    @Inject(CLOCK) private readonly clock: ClockPort,
    config: ConfigService,
  ) {
    this.timeZone = config.getOrThrow<string>('APP_TIMEZONE');
  }

  today(): Date {
    // The `en-CA` locale formats a date as YYYY-MM-DD.
    const civilDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(this.clock.now());
    return new Date(`${civilDate}T00:00:00.000Z`);
  }
}
