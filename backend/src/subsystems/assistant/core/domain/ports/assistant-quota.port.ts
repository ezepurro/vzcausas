export const ASSISTANT_QUOTA = Symbol('ASSISTANT_QUOTA');

/**
 * The per-user limit of the assistant (proposal §3, "Límite de frecuencia"):
 * every question costs a call to an external, paid provider.
 *
 * A port and not an HTTP guard on purpose: Nest runs guards **before** the
 * validation pipe, so a guard would charge a request that then fails with
 * `400`. Consumed by the use case once the request is known to be valid and
 * right before calling the model.
 */
export interface AssistantQuotaPort {
  /**
   * Counts one question for this user.
   *
   * @throws TooManyAssistantRequestsError when the user is over a limit. A
   *   rejected question is not counted.
   */
  consume(userId: number): void;
}
