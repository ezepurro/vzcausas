import { Inject, Injectable } from '@nestjs/common';
import { CaseNotFoundError, ProceduralActNotFoundError } from '../../../domain/errors/case.errors';
import {
  PROCEDURAL_ACT_REPOSITORY,
  ProceduralActRepository,
  ProceduralActView,
} from '../../../domain/ports/procedural-act/procedural-act.repository';

export type GetProceduralActQuery = { caseId: number; actId: number };

/**
 * HU27 — one procedural act of a case (CA-27.8).
 *
 * The case is checked before the act, so the 404 says which of the two is
 * missing. An act of **another** case answers as if it did not exist: the
 * URL asks for an act of this case.
 */
@Injectable()
export class GetProceduralAct {
  constructor(@Inject(PROCEDURAL_ACT_REPOSITORY) private readonly acts: ProceduralActRepository) {}

  async execute(query: GetProceduralActQuery): Promise<ProceduralActView> {
    if (!(await this.acts.caseExists(query.caseId))) {
      throw new CaseNotFoundError();
    }

    const found = await this.acts.findInCase(query.caseId, query.actId);
    if (found === null) {
      throw new ProceduralActNotFoundError();
    }
    return found;
  }
}
