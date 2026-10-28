import { Inject, Injectable } from '@nestjs/common';
import { CaseNotFoundError } from '../../domain/errors/case.errors';
import {
  INTERRUPTIVE_ACT_REPOSITORY,
  InterruptiveActPage,
  InterruptiveActRepository,
} from '../../domain/ports/interruptive-act.repository';

export type ListInterruptiveActsQuery = { caseId: number; page: number; limit: number };

/**
 * HU31 — the interruptive acts of a case, newest first (CA-31.12).
 *
 * Open to every profile and every case (RN11): registering them is the
 * responsible lawyer's, reading them is not. The case is checked first, so a
 * case without acts — or outside `CRIMINAL`, which never has any — answers an
 * empty page, while one that does not exist answers 404 (CA-31.14).
 */
@Injectable()
export class ListInterruptiveActs {
  constructor(@Inject(INTERRUPTIVE_ACT_REPOSITORY) private readonly acts: InterruptiveActRepository) {}

  async execute(query: ListInterruptiveActsQuery): Promise<InterruptiveActPage> {
    if (!(await this.acts.caseExists(query.caseId))) {
      throw new CaseNotFoundError();
    }
    return this.acts.listByCase(query.caseId, query.page, query.limit);
  }
}
