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

  /** The active legal qualifications among the given ids. Missing or inactive ids are omitted. */
  findActiveQualificationsByIds(ids: number[]): Promise<LegalQualificationRef[]>;
}
