/** DI token for {@link LawyerLookupPort}. */
export const LAWYER_LOOKUP = Symbol('LAWYER_LOOKUP');

/** What `cases` needs to know about a lawyer. */
export interface LawyerRef {
  id: number;
  fullName: string;
  registrationNumber: string;
}

/** Anti-corruption port towards `people`: resolves the responsible lawyer (RN3). */
export interface LawyerLookupPort {
  /** Returns the lawyer if it exists and is active, `null` otherwise. */
  findActiveById(id: number): Promise<LawyerRef | null>;
}
