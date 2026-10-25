import { Global, Module } from '@nestjs/common';
import { EventPublisher } from './event-publisher.port';
import { InMemoryEventPublisher } from './in-memory-event-publisher.adapter';

/**
 * Platform module for integration events. Global so any subsystem can inject
 * {@link EventPublisher}; it requires `EventEmitterModule.forRoot()` in the
 * root module.
 */
@Global()
@Module({
  providers: [{ provide: EventPublisher, useClass: InMemoryEventPublisher }],
  exports: [EventPublisher],
})
export class EventsModule {}
