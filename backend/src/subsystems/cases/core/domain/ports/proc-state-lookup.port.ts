import { DayType } from '../value-objects/day-type';
import { JurisdictionCode } from '../value-objects/jurisdiction-code';

/** What `cases` needs to know about a procedural state to put a case in it. */
export interface ProceduralStateRef {
  id: number;
  name: string;
  // System state "Iniciada": where every new case of the jurisdiction starts.
  isInitial: boolean;
  jurisdictionId: number;
  // Final state: closes the case. It is not offered as the target of an act.
  terminal: boolean;
  // Active states can be chosen for a new act; one that was deactivated can still be the state of an old case.
  isActive: boolean;
  // The term the state opens. `0` days and `NONE` if it opens none.
  timeLimitDays: number;
  dayType: DayType;
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

  /** A state of any jurisdiction by id, active or not, or `null` if there is none. */
  findById(id: number): Promise<ProceduralStateRef | null>;

  /**
   * `true` if the jurisdiction has an active state with that name, ignoring case
   * (the initial state included). A hand-written state may not take such a name.
   */
  existsActiveByName(jurisdictionId: number, name: string): Promise<boolean>;
}
