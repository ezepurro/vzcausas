import { JurisdictionCode } from '../value-objects/jurisdiction-code';

/** What `cases` needs to know about a procedural state to put a case in it. */
export interface ProceduralStateRef {
  id: number;
  name: string;
  // System state "Iniciada": where every new case of the jurisdiction starts.
  isInitial: boolean;
  jurisdictionId: number;
}

/** DI token for {@link ProcStateLookupPort}. */
export const PROC_STATE_LOOKUP = Symbol('PROC_STATE_LOOKUP');

/**
 * Port towards the procedural states, which belong to `legal-parameters`: its
 * adapter lives there. It can grow with more lookups (other states) as `cases`
 * needs them.
 */
export interface ProcStateLookupPort {
  /** The initial state ("Iniciada") of an active jurisdiction, or `null` if there is none. */
  findInitialByJurisdiction(jurisdiction: JurisdictionCode): Promise<ProceduralStateRef | null>;
}
