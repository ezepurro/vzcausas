import { Inject, Injectable } from '@nestjs/common';
import {
  CaseFolderNotice,
  CaseFolderOutcome,
  CaseFolderOutcomePort,
  CaseFolderWaitOptions,
} from '../../core/domain/ports/case/case-folder-outcome.port';

/** DI token for the longest a request waits for the folder, in milliseconds. */
export const CASE_FOLDER_WAIT_MS = Symbol('CASE_FOLDER_WAIT_MS');

interface Waiter {
  resolve: (outcome: CaseFolderOutcome) => void;
  timer: NodeJS.Timeout;
  untilTemplates: boolean;
}

/**
 * {@link CaseFolderOutcomePort} in the memory of the process. A wait ends when
 * someone calls {@link notify} for that case with a notice that concerns it or
 * when its time runs out, whichever comes first; either way it is forgotten.
 */
@Injectable()
export class InMemoryCaseFolderOutcomes implements CaseFolderOutcomePort {
  private readonly waiting = new Map<number, Set<Waiter>>();

  constructor(@Inject(CASE_FOLDER_WAIT_MS) private readonly waitMs: number) {}

  expect(caseId: number, options: CaseFolderWaitOptions = {}): Promise<CaseFolderOutcome> {
    return new Promise<CaseFolderOutcome>((resolve) => {
      // This executor runs right away, so the wait exists before `expect` returns.
      const waiter: Waiter = {
        resolve,
        untilTemplates: options.untilTemplates ?? false,
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

  notify(caseId: number, notice: CaseFolderNotice): void {
    const waiters = this.waiting.get(caseId);
    if (!waiters) {
      return;
    }
    // `CREATED` is not the end for a wait that also wants the templates: it keeps waiting.
    const woken = [...waiters].filter((waiter) => notice !== 'CREATED' || !waiter.untilTemplates);
    for (const waiter of woken) {
      waiters.delete(waiter);
      clearTimeout(waiter.timer);
      waiter.resolve(notice === 'ERROR' ? 'ERROR' : 'CREATED');
    }
    if (waiters.size === 0) {
      this.waiting.delete(caseId);
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
