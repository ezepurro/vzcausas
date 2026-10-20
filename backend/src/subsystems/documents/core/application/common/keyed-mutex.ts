/**
 * Runs work one at a time per key, in the order it arrives; work with different
 * keys does not wait for each other.
 *
 * It lives in the process memory, so it only orders requests handled by this
 * same instance. It is not a distributed lock: the unique indexes of the
 * database remain the last line of defence.
 */
export class KeyedMutex {
  private readonly tails = new Map<string, Promise<unknown>>();

  async run<T>(key: string, work: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    const result = previous.then(work, work);
    const tail = result.catch(() => undefined);
    this.tails.set(key, tail);
    try {
      return await result;
    } finally {
      // Nobody queued behind this work: forget the key so the map does not grow.
      if (this.tails.get(key) === tail) {
        this.tails.delete(key);
      }
    }
  }
}
