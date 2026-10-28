import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { CaseNotFoundError } from '../../domain/errors/case.errors';
import { CASE_REPOSITORY, CaseListItem, CaseRepository } from '../../domain/ports/case.repository';
import { withDeadlines } from './list-cases.use-case';

/**
 * `GET /cases/{caseId}` (HU22): the detail of one case.
 *
 * It returns **the same resource as the listing**, not a wider one — the
 * contract is explicit (§3.7), and in this version the detail covers the
 * header, the prescription bar and the client card. The lifecycle, the
 * documents and the "Sobre la causa" actions the prototype shows belong to
 * later sprints (§8.3) and have no field here.
 *
 * That is why it reuses `withDeadlines` instead of computing the field
 * again: if the listing and the detail each filled it their own way, they
 * could drift while both kept looking correct on their own.
 *
 * A case given de baja answers the same as one that never existed. Its
 * *referenced* entities are the opposite case: a deactivated procedural state
 * or legal qualification keeps showing, because it is part of the case's
 * history. That asymmetry is enforced by the read port, not here.
 */
@Injectable()
export class GetCase {
  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(query: { id: number }): Promise<CaseListItem> {
    const found = await this.cases.findListItemById(query.id);
    if (found === null) {
      throw new CaseNotFoundError();
    }

    return withDeadlines(found, this.clock.today());
  }
}
