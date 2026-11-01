import { AsyncLocalStorage } from "node:async_hooks";

/** What is known about the HTTP request a piece of code is running for. */
interface RequestContextStore {
  correlationId: string;
}

/**
 * The context of the current HTTP request, reachable from any layer without
 * passing it down by hand.
 *
 * Exists for the audit trail: `audit_log.correlation_id` has to carry the same
 * id as the `X-Correlation-Id` header and the technical log, and the use case
 * must not be the one passing it (`AUDITORIA_Y_TRAZABILIDAD.md` §3). The
 * adapter reads it from here instead.
 *
 * Built on Node's `AsyncLocalStorage`: whatever runs inside {@link run}, the
 * awaits included, sees the same store; code that runs outside a request (the
 * daily process, a test calling a use case directly) sees none.
 */
export class RequestContext {
  private static readonly storage = new AsyncLocalStorage<RequestContextStore>();

  /** Runs `work`, and everything it awaits, within the request with this correlation id. */
  static run<T>(correlationId: string, work: () => T): T {
    return RequestContext.storage.run({ correlationId }, work);
  }

  /** The current request's correlation id; `null` outside a request. */
  static correlationId(): string | null {
    return RequestContext.storage.getStore()?.correlationId ?? null;
  }
}
