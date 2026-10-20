import { IntegrationEvent } from './integration-event';

/**
 * Port to announce an integration event. Abstract class rather than an
 * interface so it doubles as the DI token: any module can inject it without
 * knowing what carries the event underneath (today an in-memory emitter,
 * later an outbox).
 *
 * Publishing is fire-and-forget: a failing subscriber must never make
 * `publish` throw, because the publisher's own work already happened.
 */
export abstract class EventPublisher {
  abstract publish(event: IntegrationEvent): Promise<void>;
}
