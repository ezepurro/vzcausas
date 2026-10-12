import { Inject, Injectable } from '@nestjs/common';
import { CaseNotFoundError } from '../../domain/errors/case.errors';
import {
  PROCEDURAL_ACT_QUERY,
  ProceduralActPage,
  ProceduralActQueryPort,
} from '../../domain/ports/procedural-act-query.port';

export type ListProceduralActsQuery = { caseId: number; page: number; limit: number };

/**
 * HU27 — the timeline of a case: its procedural acts, newest first.
 *
 * Open to every profile, and to every case, not only to the responsible
 * lawyer's: the whole firm sees every case (RN11). Registering, modifying and
 * annulling acts stay with the responsible lawyer; reading them does not.
 *
 * The case is checked first so that a case without acts (200, empty —
 * CA-27.7) and a case that does not exist or was given de baja (404 —
 * CA-27.10) do not answer the same.
 */
@Injectable()
export class ListProceduralActs {
  constructor(@Inject(PROCEDURAL_ACT_QUERY) private readonly acts: ProceduralActQueryPort) {}

  async execute(query: ListProceduralActsQuery): Promise<ProceduralActPage> {
    if (!(await this.acts.caseExists(query.caseId))) {
      throw new CaseNotFoundError();
    }
    return this.acts.listByCase(query.caseId, query.page, query.limit);
  }
}
