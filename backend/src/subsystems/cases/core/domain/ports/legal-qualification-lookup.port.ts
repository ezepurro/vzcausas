/** DI token for {@link LegalQualificationLookupPort}. */
export const LEGAL_QUALIFICATION_LOOKUP = Symbol('LEGAL_QUALIFICATION_LOOKUP');

/** What `cases` needs to know about a legal qualification. */
export interface LegalQualificationRef {
  id: number;
  name: string;
  prescriptionMonths: number;
}

/** Anti-corruption port towards the legal qualifications catalog (CRIMINAL cases). */
export interface LegalQualificationLookupPort {
  /** Returns the active qualifications among the given ids. Missing or inactive ids are omitted. */
  findActiveByIds(ids: number[]): Promise<LegalQualificationRef[]>;
}
