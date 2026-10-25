import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule, OnEvent } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { EventPublisher } from './event-publisher.port';
import { EventsModule } from './events.module';
import { IntegrationEvent, createEventHeader } from './integration-event';

const TEST_EVENT = 'test.thing-happened.v1';

@Injectable()
class WorkingSubscriber {
  received: IntegrationEvent[] = [];

  @OnEvent(TEST_EVENT, { async: true })
  handle(event: IntegrationEvent): void {
    this.received.push(event);
  }
}

@Injectable()
class FailingSubscriber {
  @OnEvent(TEST_EVENT, { async: true })
  handle(): never {
    throw new Error('subscriber exploded');
  }
}

async function build(...subscribers: Array<new () => object>) {
  const moduleRef = await Test.createTestingModule({
    imports: [EventEmitterModule.forRoot(), EventsModule],
    providers: subscribers,
  }).compile();
  await moduleRef.init();
  return moduleRef;
}

describe('InMemoryEventPublisher', () => {
  afterEach(() => jest.restoreAllMocks());

  it('entrega el evento al suscriptor de forma asíncrona', async () => {
    const moduleRef = await build(WorkingSubscriber);
    const publisher = moduleRef.get(EventPublisher);
    const emitter = moduleRef.get(EventEmitter2);
    const event = createEventHeader(TEST_EVENT, new Date());
    const arrived = emitter.waitFor(TEST_EVENT, 2000);

    await publisher.publish(event);
    await arrived;
    await new Promise((resolve) => setImmediate(resolve));

    expect(moduleRef.get(WorkingSubscriber).received).toEqual([event]);
  });

  it('no lanza si un suscriptor falla', async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const moduleRef = await build(FailingSubscriber);

    await expect(
      moduleRef.get(EventPublisher).publish(createEventHeader(TEST_EVENT, new Date())),
    ).resolves.toBeUndefined();
  });

  it('loguea el tipo y el id del evento publicado', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const moduleRef = await build();
    const event = createEventHeader(TEST_EVENT, new Date());

    await moduleRef.get(EventPublisher).publish(event);

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(`${TEST_EVENT} (eventId=${event.eventId})`),
    );
  });
});

describe('createEventHeader', () => {
  it('genera un id distinto por evento y la fecha en ISO', () => {
    const at = new Date('2026-10-17T12:00:00.000Z');

    const a = createEventHeader(TEST_EVENT, at);
    const b = createEventHeader(TEST_EVENT, at);

    expect(a.eventId).not.toBe(b.eventId);
    expect(a.occurredAt).toBe('2026-10-17T12:00:00.000Z');
    expect(a.type).toBe(TEST_EVENT);
  });
});
