import { Injectable } from "@nestjs/common";
import { ClockPort } from "@shared/domain/clock.port";

/**
 * Production {@link ClockPort} implementation. Returns real wall-clock
 * time. Registered against the {@link CLOCK} token in SharedModule.
 * Tests should provide their own fake instead of using this class.
 */
@Injectable()
export class SystemClockAdapter implements ClockPort {
  now(): Date {
    return new Date();
  }
}
