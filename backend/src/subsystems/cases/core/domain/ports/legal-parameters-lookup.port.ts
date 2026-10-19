import { DayType } from '../value-objects/day-type';
import { JurisdictionCode } from '../value-objects/jurisdiction-code';

/** DI token for {@link LegalParametersLookupPort}. */
export const LEGAL_PARAMETERS_LOOKUP = Symbol('LEGAL_PARAMETERS_LOOKUP');

/** What `cases` needs to know about a procedural state to put a case in it. */
export interface ProceduralStateRef {
  id: number;
  name: string;
  // System state "Iniciada": where every new case of the jurisdiction starts.
  isInitial: boolean;
  jurisdictionId: number;
  // Final state: closes the case. An act can take the case to it, unless it is "Prescripta" (D-69).
  terminal: boolean;
  // System state "Prescripta" (criminal): reached only through its own form (HU33), never through an act (D-69).
  isPrescribed: boolean;
  // Active states can be chosen for a new act; one that was deactivated can still be the state of an old case.
  isActive: boolean;
  // The term the state opens. `0` days and `NONE` if it opens none.
  timeLimitDays: number;
  dayType: DayType;
}

/** What `cases` needs to know about a legal qualification. */
export interface LegalQualificationRef {
  id: number;
  name: string;
  prescriptionMonths: number;
}

/**
 * Port towards `legal-parameters`, which owns the procedural states and the
 * legal qualifications: its adapter lives there. It can grow with more
 * lookups (other states) as `cases` needs them.
 */
export interface LegalParametersLookupPort {
  /** The initial state ("Iniciada") of an active jurisdiction, or `null` if there is none. */
  findInitialProcStateByJurisdiction(jurisdiction: JurisdictionCode): Promise<ProceduralStateRef | null>;

  /** A procedural state of any jurisdiction by id, active or not, or `null` if there is none. */
  findProcStateById(id: number): Promise<ProceduralStateRef | null>;

  /**
   * `true` if the jurisdiction has an active procedural state with that name,
   * ignoring case (the initial state included). A hand-written state may not take such a name.
   */
  existsProcStateActiveByName(jurisdictionId: number, name: string): Promise<boolean>;

  /** The active legal qualifications among the given ids. Missing or inactive ids are omitted. */
  findActiveQualificationsByIds(ids: number[]): Promise<LegalQualificationRef[]>;
}
