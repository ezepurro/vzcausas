import { Inject, Injectable } from '@nestjs/common';
import {
  CaseFolderOutcome,
  CaseFolderOutcomePort,
} from '../../core/domain/ports/case-folder-outcome.port';

/** DI token for the longest a request waits for the folder, in milliseconds. */
export const CASE_FOLDER_WAIT_MS = Symbol('CASE_FOLDER_WAIT_MS');

interface Waiter {
  resolve: (outcome: CaseFolderOutcome) => void;
  timer: NodeJS.Timeout;
}

/**
 * {@link CaseFolderOutcomePort} in the memory of the process. A wait ends when
 * someone calls {@link notify} for that case or when its time runs out,
 * whichever comes first; either way it is forgotten.
 */
@Injectable()
export class InMemoryCaseFolderOutcomes implements CaseFolderOutcomePort {
  private readonly waiting = new Map<number, Set<Waiter>>();

  constructor(@Inject(CASE_FOLDER_WAIT_MS) private readonly waitMs: number) {}

  expect(caseId: number): Promise<CaseFolderOutcome> {
    return new Promise<CaseFolderOutcome>((resolve) => {
      // This executor runs right away, so the wait exists before `expect` returns.
      const waiter: Waiter = {
        resolve,
        timer: setTimeout(() => {
          this.forget(caseId, waiter);
          resolve('TIMEOUT');
        }, this.waitMs),
      };
      const waiters = this.waiting.get(caseId) ?? new Set<Waiter>();
      waiters.add(waiter);
      this.waiting.set(caseId, waiters);
    });
  }

  notify(caseId: number, outcome: 'CREATED' | 'ERROR'): void {
    const waiters = this.waiting.get(caseId);
    if (!waiters) {
      return;
    }
    this.waiting.delete(caseId);
    for (const waiter of waiters) {
      clearTimeout(waiter.timer);
      waiter.resolve(outcome);
    }
  }

  private forget(caseId: number, waiter: Waiter): void {
    const waiters = this.waiting.get(caseId);
    waiters?.delete(waiter);
    if (waiters?.size === 0) {
      this.waiting.delete(caseId);
    }
  }
}
