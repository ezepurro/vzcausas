import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventPublisher } from './event-publisher.port';
import { IntegrationEvent } from './integration-event';

/**
 * {@link EventPublisher} over the process-local `EventEmitter2`. Subscribers
 * run asynchronously after `publish` returns, and their failures never reach
 * the publisher. Events are lost if the process dies: acceptable until an
 * outbox replaces this adapter.
 */
@Injectable()
export class InMemoryEventPublisher extends EventPublisher {
  private readonly logger = new Logger(InMemoryEventPublisher.name);

  constructor(private readonly emitter: EventEmitter2) {
    super();
  }

  async publish(event: IntegrationEvent): Promise<void> {
    this.logger.log(`Publishing ${event.type} (eventId=${event.eventId})`);
    try {
      this.emitter.emit(event.type, event);
    } catch (error) {
      this.logger.error(
        `Could not publish ${event.type} (eventId=${event.eventId}): ${String(error)}`,
      );
    }
  }
}
