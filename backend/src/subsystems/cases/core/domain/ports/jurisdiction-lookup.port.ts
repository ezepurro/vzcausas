import { JurisdictionCode } from '../value-objects/jurisdiction-code';

/** DI token for {@link JurisdictionLookupPort}. */
export const JURISDICTION_LOOKUP = Symbol('JURISDICTION_LOOKUP');

/** What `cases` needs to know about a jurisdiction and its initial state. */
export interface JurisdictionRef {
  id: number;
  code: JurisdictionCode;
  // System state "Iniciada": every new case of the jurisdiction starts in it.
  initialStateId: number;
}

/** Anti-corruption port towards `legal-parameters`: resolves the jurisdiction of a case. */
export interface JurisdictionLookupPort {
  /** Returns the jurisdiction if it exists and is active, `null` otherwise. */
  findActiveByCode(code: JurisdictionCode): Promise<JurisdictionRef | null>;
}
