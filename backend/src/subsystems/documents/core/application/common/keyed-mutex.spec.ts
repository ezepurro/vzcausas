import { KeyedMutex } from './keyed-mutex';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe('KeyedMutex', () => {
  it('ejecuta de a una las tareas de la misma clave, en orden de llegada', async () => {
    const mutex = new KeyedMutex();
    const order: string[] = [];
    const gate = deferred();

    const first = mutex.run('k', async () => {
      order.push('first:start');
      await gate.promise;
      order.push('first:end');
    });
    const second = mutex.run('k', async () => {
      order.push('second:start');
    });

    await Promise.resolve();
    expect(order).toEqual(['first:start']);

    gate.resolve();
    await Promise.all([first, second]);
    expect(order).toEqual(['first:start', 'first:end', 'second:start']);
  });

  it('no hace esperar a las tareas de otra clave', async () => {
    const mutex = new KeyedMutex();
    const gate = deferred();
    const blocked = mutex.run('a', () => gate.promise);

    await expect(mutex.run('b', async () => 'done')).resolves.toBe('done');

    gate.resolve();
    await blocked;
  });

  it('una tarea que falla no bloquea a la siguiente y propaga su error', async () => {
    const mutex = new KeyedMutex();

    const failing = mutex.run('k', async () => {
      throw new Error('boom');
    });
    const next = mutex.run('k', async () => 'ok');

    await expect(failing).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ok');
  });
});
