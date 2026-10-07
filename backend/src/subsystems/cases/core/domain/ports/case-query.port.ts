import { CaseListItem } from "../../application/read-models/case-list-item";

/** DI token for {@link CaseQueryPort}. */
export const CASE_QUERY = Symbol("CASE_QUERY");

/**
 * `search` is deliberately narrow: HU-9 only needs the cases of one
 * client (CA-9.4). The contract's other filters — `jurisdiction`,
 * `responsibleLawyerId`, `proceduralStateId`, `customState`,
 * `withoutProceduralActs`, `openDeadline` — belong to HU-20 and are
 * added when that story is built.
 */
export type CaseSearchCriteria = {
  page: number;
  limit: number;
  clientId?: number;
};

export type CasePage = { items: CaseListItem[]; totalItems: number };

/**
 * Read side of `cases`, kept apart from {@link CaseRepository}.
 *
 * That one loads and saves the aggregate, which is what a write needs.
 * This one answers queries with flat projections, which is what a
 * listing needs — see {@link CaseListItem} for why the two are
 * separate rather than one port doing both.
 */
export interface CaseQueryPort {
  search(criteria: CaseSearchCriteria): Promise<CasePage>;
}
