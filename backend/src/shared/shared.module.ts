import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { CLOCK } from "./domain/clock.port";
import { TRANSACTION_MANAGER } from "./domain/transaction-manager.port";
import { SystemClockAdapter } from "./infrastructure/clock/system-clock.adapter";
import { CorrelationMiddleware } from "./infrastructure/http/correlation-id.middleware";
import { DomainErrorFilter } from "./infrastructure/http/domain-error.filter";
import { PrismaTransactionManager } from "./infrastructure/prisma/prisma-transaction-manager";

/**
 * Shared kernel module. Wires cross-cutting concerns that every
 * subsystem depends on:
 *
 * - Binds the {@link CLOCK} token to {@link SystemClockAdapter} and
 *   exports it so other modules can inject the clock.
 * - Registers {@link DomainErrorFilter} as the global exception filter
 *   via `APP_FILTER`. Doing it through DI (rather than
 *   `app.useGlobalFilters` in main.ts) lets the filter participate in
 *   the container and receive injected dependencies.
 * - Applies {@link CorrelationMiddleware} to every route so an
 *   `X-Correlation-Id` is available on every request and response.
 */
@Module({
  providers: [
    { provide: CLOCK, useClass: SystemClockAdapter },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
    { provide: TRANSACTION_MANAGER, useClass: PrismaTransactionManager },
  ],

  exports: [CLOCK, TRANSACTION_MANAGER],
})
export class SharedModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // `{*path}` rather than the bare `*`: path-to-regexp v7 (used by
    // Nest 11) requires a named wildcard and warns on the legacy form.
    consumer.apply(CorrelationMiddleware).forRoutes("{*path}");
  }
}
