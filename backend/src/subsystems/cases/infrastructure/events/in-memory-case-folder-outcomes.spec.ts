import { InMemoryCaseFolderOutcomes } from './in-memory-case-folder-outcomes';

describe('InMemoryCaseFolderOutcomes', () => {
  afterEach(() => jest.useRealTimers());

  it('despierta al que espera con el resultado, aunque la respuesta llegue enseguida', async () => {
    const outcomes = new InMemoryCaseFolderOutcomes();

    const waiting = outcomes.expect(7, 1000);
    outcomes.notify(7, 'CREATED');

    await expect(waiting).resolves.toBe('CREATED');
  });

  it('despierta a todos los que esperan la misma causa', async () => {
    const outcomes = new InMemoryCaseFolderOutcomes();

    const a = outcomes.expect(7, 1000);
    const b = outcomes.expect(7, 1000);
    outcomes.notify(7, 'ERROR');

    await expect(Promise.all([a, b])).resolves.toEqual(['ERROR', 'ERROR']);
  });

  it('no despierta a los que esperan otra causa', async () => {
    jest.useFakeTimers();
    const outcomes = new InMemoryCaseFolderOutcomes();

    const other = outcomes.expect(8, 100);
    outcomes.notify(7, 'CREATED');
    jest.advanceTimersByTime(100);

    await expect(other).resolves.toBe('TIMEOUT');
  });

  it('termina con TIMEOUT si el tiempo se agota antes de la respuesta', async () => {
    jest.useFakeTimers();
    const outcomes = new InMemoryCaseFolderOutcomes();

    const waiting = outcomes.expect(7, 5000);
    jest.advanceTimersByTime(5000);

    await expect(waiting).resolves.toBe('TIMEOUT');
  });

  it('una respuesta tardía, después del TIMEOUT, no rompe nada', async () => {
    jest.useFakeTimers();
    const outcomes = new InMemoryCaseFolderOutcomes();
    const waiting = outcomes.expect(7, 10);
    jest.advanceTimersByTime(10);
    await waiting;

    expect(() => outcomes.notify(7, 'CREATED')).not.toThrow();
  });

  it('una respuesta sin nadie esperando se ignora', () => {
    expect(() => new InMemoryCaseFolderOutcomes().notify(1, 'CREATED')).not.toThrow();
  });

  it('no deja temporizadores pendientes cuando la respuesta llega a tiempo', async () => {
    jest.useFakeTimers();
    const outcomes = new InMemoryCaseFolderOutcomes();

    const waiting = outcomes.expect(7, 10_000);
    outcomes.notify(7, 'CREATED');
    await waiting;

    expect(jest.getTimerCount()).toBe(0);
  });
});
