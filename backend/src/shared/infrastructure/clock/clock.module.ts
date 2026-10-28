import { Module } from "@nestjs/common";
import { CLOCK } from "@shared/domain/clock.port";
import { CordobaClockAdapter } from "./cordoba-clock.adapter";

/**
 * Binds the {@link CLOCK} token to {@link CordobaClockAdapter} and exports it.
 * Not global: each subsystem that reads the time imports it, so the
 * dependency on the clock shows in its module.
 */
@Module({
  providers: [{ provide: CLOCK, useClass: CordobaClockAdapter }],
  exports: [CLOCK],
})
export class ClockModule {}
