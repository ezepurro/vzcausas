import { BadGatewayError, TooManyRequestsError } from '@shared/domain/domain-error';

/**
 * Why the language model could not answer. Goes to the log, never to the
 * client: for the client every reason is the same `502` (proposal §2,
 * "Errores").
 */
export type AssistantFailureReason =
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'PROVIDER_ERROR'
  | 'MISCONFIGURED'
  | 'NETWORK';

/**
 * `502 ASSISTANT_UNAVAILABLE`: the AI provider did not answer, took too long
 * or ran out of quota (`docs/experimental/asistente/PROPUESTA_CONTRATO.md`
 * §2). Same family as `DocumentStorageUnavailableError`
 * (`documents.errors.ts:26`): the request was fine and may work if retried.
 */
export class AssistantUnavailableError extends BadGatewayError {
  constructor(
    public readonly reason: AssistantFailureReason,
    public readonly detail?: string,
  ) {
    super(
      'ASSISTANT_UNAVAILABLE',
      'El asistente no está disponible en este momento. Intentá de nuevo en unos minutos.',
    );
  }
}

/**
 * `429 TOO_MANY_REQUESTS` from the assistant's own per-user limit (proposal
 * §3, "Límite de frecuencia"). Same `code` as the per-IP limit, its own
 * message. The filter turns `retryAfterSeconds` into `Retry-After`.
 */
export class TooManyAssistantRequestsError extends TooManyRequestsError {
  constructor(retryAfterSeconds: number) {
    super(
      'TOO_MANY_REQUESTS',
      'Hiciste muchas preguntas seguidas. Esperá un momento antes de volver a preguntar.',
      { retryAfterSeconds },
    );
  }
}
