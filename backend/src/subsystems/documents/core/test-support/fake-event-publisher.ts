import { EventPublisher } from '@shared/infrastructure/events/event-publisher.port';
import { IntegrationEvent } from '@shared/infrastructure/events/integration-event';

/** Collects what a use case publishes, so tests can assert on it. */
export class FakeEventPublisher extends EventPublisher {
  readonly published: IntegrationEvent[] = [];

  async publish(event: IntegrationEvent): Promise<void> {
    this.published.push(event);
  }

  /** Published events of one type, typed by the caller. */
  ofType<T extends IntegrationEvent>(type: string): T[] {
    return this.published.filter((event): event is T => event.type === type);
  }
}
