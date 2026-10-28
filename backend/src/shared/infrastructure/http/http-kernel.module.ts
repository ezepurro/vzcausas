import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { CorrelationMiddleware } from "./correlation-id.middleware";
import { DomainErrorFilter } from "./domain-error.filter";

/**
 * Cross-cutting HTTP concerns of the whole API. Imported only by `AppModule`.
 *
 * - Registers {@link DomainErrorFilter} as the global exception filter
 *   via `APP_FILTER`. Doing it through DI (rather than
 *   `app.useGlobalFilters` in main.ts) lets the filter participate in
 *   the container and receive injected dependencies.
 * - Applies {@link CorrelationMiddleware} to every route so an
 *   `X-Correlation-Id` is available on every request and response.
 */
@Module({
  providers: [{ provide: APP_FILTER, useClass: DomainErrorFilter }],
})
export class HttpKernelModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // `{*path}` rather than the bare `*`: path-to-regexp v7 (used by
    // Nest 11) requires a named wildcard and warns on the legacy form.
    consumer.apply(CorrelationMiddleware).forRoutes("{*path}");
  }
}
