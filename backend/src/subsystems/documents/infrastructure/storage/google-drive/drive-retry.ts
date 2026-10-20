import { Logger } from '@nestjs/common';
import { classifyDriveError } from './drive-error.mapper';

/** Attempts per call, the first one included (ADR-003 §2.5). */
export const MAX_ATTEMPTS = 3;

/**
 * Runs one Drive call, trying again after a passing failure (5xx, 429, rate
 * limit, network or timeout) with an exponential wait: 1 s, then 2 s. Anything
 * else — `invalid_grant`, 401, 403, 404, a bad request — is not retried, because
 * another attempt cannot fix it.
 *
 * Rethrows the last error unchanged; turning it into a domain error is the
 * adapter's job. `work` is called again on each attempt, so it must build
 * anything that is consumed (a stream) inside itself.
 */
export async function withDriveRetries<T>(
  operation: string,
  work: () => Promise<T>,
  sleep: (ms: number) => Promise<void>,
  logger: Logger,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const startedAt = Date.now();
    try {
      const result = await work();
      logger.debug(`Drive ${operation} ok (attempt ${attempt}, ${Date.now() - startedAt} ms)`);
      return result;
    } catch (error) {
      const failure = classifyDriveError(error);
      if (!failure.retryable || attempt === MAX_ATTEMPTS) {
        logger.debug(`Drive ${operation} failed (attempt ${attempt}): ${failure.detail}`);
        throw error;
      }
      logger.warn(
        `Drive ${operation} attempt ${attempt}/${MAX_ATTEMPTS} failed, retrying: ${failure.detail}`,
      );
      await sleep(2 ** (attempt - 1) * 1000);
    }
  }
}
