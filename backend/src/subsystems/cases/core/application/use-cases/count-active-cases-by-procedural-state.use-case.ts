import { Inject, Injectable } from "@nestjs/common";
import {
  CASE_QUERY,
  CaseQueryPort,
} from "../../domain/ports/case-query.port";

export type CountActiveCasesByProceduralStateQuery = {
  stateIds: readonly number[];
};

/** Active cases per procedural state id; ids with none are absent. */
export type ActiveCasesByProceduralState = ReadonlyMap<number, number>;

/**
 * Counts the active cases sitting in each procedural state. Exported by
 * `CasesModule` for `legal-parameters`, whose `activeCases` field
 * (contract §3.4) is this number: that subsystem reaches it through its
 * own port and an anti-corruption adapter (architecture §6.2), never by
 * reading the `cases` table.
 *
 * The definition of an active case belongs here, in the subsystem that
 * owns cases — see `CaseQueryPort.countActiveByProceduralStates`.
 */
@Injectable()
export class CountActiveCasesByProceduralState {
  constructor(@Inject(CASE_QUERY) private readonly cases: CaseQueryPort) {}

  async execute(
    query: CountActiveCasesByProceduralStateQuery,
  ): Promise<ActiveCasesByProceduralState> {
    // Repeated ids would only make the SQL `IN` list longer.
    const stateIds = [...new Set(query.stateIds)];
    return this.cases.countActiveByProceduralStates(stateIds);
  }
}
