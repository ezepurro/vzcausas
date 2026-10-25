import { InMemoryCaseFolderOutcomes } from './in-memory-case-folder-outcomes';

describe('InMemoryCaseFolderOutcomes', () => {
  afterEach(() => jest.useRealTimers());

  it('despierta al que espera con el resultado, aunque la respuesta llegue enseguida', async () => {
    const outcomes = new InMemoryCaseFolderOutcomes(1000);

    const waiting = outcomes.expect(7);
    outcomes.notify(7, 'CREATED');

    await expect(waiting).resolves.toBe('CREATED');
  });

  it('despierta a todos los que esperan la misma causa', async () => {
    const outcomes = new InMemoryCaseFolderOutcomes(1000);

    const a = outcomes.expect(7);
    const b = outcomes.expect(7);
    outcomes.notify(7, 'ERROR');

    await expect(Promise.all([a, b])).resolves.toEqual(['ERROR', 'ERROR']);
  });

  it('no despierta a los que esperan otra causa', async () => {
    jest.useFakeTimers();
    const outcomes = new InMemoryCaseFolderOutcomes(100);

    const other = outcomes.expect(8);
    outcomes.notify(7, 'CREATED');
    jest.advanceTimersByTime(100);

    await expect(other).resolves.toBe('TIMEOUT');
  });

  it('termina con TIMEOUT si el tiempo se agota antes de la respuesta', async () => {
    jest.useFakeTimers();
    const outcomes = new InMemoryCaseFolderOutcomes(5000);

    const waiting = outcomes.expect(7);
    jest.advanceTimersByTime(5000);

    await expect(waiting).resolves.toBe('TIMEOUT');
  });

  it('una respuesta tardía, después del TIMEOUT, no rompe nada', async () => {
    jest.useFakeTimers();
    const outcomes = new InMemoryCaseFolderOutcomes(10);
    const waiting = outcomes.expect(7);
    jest.advanceTimersByTime(10);
    await waiting;

    expect(() => outcomes.notify(7, 'CREATED')).not.toThrow();
  });

  it('una respuesta sin nadie esperando se ignora', () => {
    expect(() => new InMemoryCaseFolderOutcomes(1000).notify(1, 'CREATED')).not.toThrow();
  });

  describe('esperar también los modelos (HU40)', () => {
    it('la carpeta creada no despierta al que espera los modelos: lo despierta la copia', async () => {
      const outcomes = new InMemoryCaseFolderOutcomes(1000);
      const settled: string[] = [];

      const waiting = outcomes.expect(7, { untilTemplates: true }).then((outcome) => {
        settled.push(outcome);
        return outcome;
      });
      outcomes.notify(7, 'CREATED');
      await Promise.resolve();
      expect(settled).toEqual([]);

      outcomes.notify(7, 'COPIED');
      await expect(waiting).resolves.toBe('CREATED');
    });

    it('la carpeta creada sí despierta al que no pidió modelos, y la copia no lo vuelve a despertar', async () => {
      const outcomes = new InMemoryCaseFolderOutcomes(1000);

      const plain = outcomes.expect(7);
      outcomes.notify(7, 'CREATED');

      await expect(plain).resolves.toBe('CREATED');
      expect(() => outcomes.notify(7, 'COPIED')).not.toThrow();
    });

    it('un ERROR despierta también al que espera los modelos', async () => {
      const outcomes = new InMemoryCaseFolderOutcomes(1000);

      const waiting = outcomes.expect(7, { untilTemplates: true });
      outcomes.notify(7, 'ERROR');

      await expect(waiting).resolves.toBe('ERROR');
    });

    it('si la copia no llega a tiempo termina con TIMEOUT', async () => {
      jest.useFakeTimers();
      const outcomes = new InMemoryCaseFolderOutcomes(50);

      const waiting = outcomes.expect(7, { untilTemplates: true });
      outcomes.notify(7, 'CREATED');
      jest.advanceTimersByTime(50);

      await expect(waiting).resolves.toBe('TIMEOUT');
    });
  });

  it('no deja temporizadores pendientes cuando la respuesta llega a tiempo', async () => {
    jest.useFakeTimers();
    const outcomes = new InMemoryCaseFolderOutcomes(10_000);

    const waiting = outcomes.expect(7);
    outcomes.notify(7, 'CREATED');
    await waiting;

    expect(jest.getTimerCount()).toBe(0);
  });
});
