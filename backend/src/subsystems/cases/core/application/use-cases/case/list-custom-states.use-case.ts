import { Inject, Injectable } from '@nestjs/common';
import { toJurisdictionFilter } from './jurisdiction-filter';
import { CASE_REPOSITORY, CaseRepository } from '../../../domain/ports/case/case.repository';

export type ListCustomStatesQuery = { jurisdiction?: string };

/**
 * `GET /cases/custom-states` (HU20, CA-20.4).
 *
 * Returns the hand-written states that active cases currently hold — the
 * "Escritos a mano en causas" group of the listing's state filter. The
 * response is a plain list of texts and is **not paginated**: it is short by
 * nature, because it only holds what lawyers actually typed.
 *
 * The only rule here is the `jurisdiction` filter. It arrives as a plain
 * string so the pipe cannot reject it with the generic `VALIDATION_ERROR`:
 * the contract gives this case its own `INVALID_REQUEST` with the parameter
 * named in `details`.
 */
@Injectable()
export class ListCustomStates {
  constructor(@Inject(CASE_REPOSITORY) private readonly cases: CaseRepository) {}

  async execute(query: ListCustomStatesQuery = {}): Promise<string[]> {
    return this.cases.listCustomStates(toJurisdictionFilter(query.jurisdiction));
  }
}
