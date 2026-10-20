import { randomUUID } from 'node:crypto';

/**
 * Minimum every integration event carries. An integration event is a fact one
 * subsystem announces so others can react; it crosses subsystem boundaries, so
 * it holds only primitives that survive a JSON round trip (a future outbox
 * will store it as such), is immutable, and never embeds domain objects.
 */
export interface IntegrationEvent {
  /** Unique, versioned name, e.g. `cases.case-registered.v1`. */
  readonly type: string;
  /**
   * Unique id of this occurrence (UUID v4). It lets a log answer "what happened
   * to event X?" and, later, lets an outbox detect duplicates.
   */
  readonly eventId: string;
  /** When the fact happened, ISO 8601 in UTC. */
  readonly occurredAt: string;
}

/** Builds the common part of an event: a fresh id and the occurrence time. */
export function createEventHeader<T extends string>(
  type: T,
  occurredAt: Date,
): { readonly type: T; readonly eventId: string; readonly occurredAt: string } {
  return { type, eventId: randomUUID(), occurredAt: occurredAt.toISOString() };
}
