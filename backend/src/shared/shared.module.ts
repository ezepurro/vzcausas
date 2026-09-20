import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { CLOCK } from "./domain/clock.port";
import { SystemClockAdapter } from "./infrastructure/clock/system-clock.adapter";
import { CorrelationMiddleware } from "./infrastructure/http/correlation-id.middleware";
import { DomainErrorFilter } from "./infrastructure/http/domain-error.filter";

@Module({
  providers: [
    { provide: CLOCK, useClass: SystemClockAdapter },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
  ],

  exports: [CLOCK],
})
export class SharedModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware).forRoutes("*");
  }
}
