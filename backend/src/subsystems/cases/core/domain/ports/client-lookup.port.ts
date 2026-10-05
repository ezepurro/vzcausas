/** DI token for {@link ClientLookupPort}. */
export const CLIENT_LOOKUP = Symbol('CLIENT_LOOKUP');

/** What `cases` needs to know about a client. */
export interface ClientRef {
  id: number;
}

/** Anti-corruption port towards `people`: resolves the client of a case. */
export interface ClientLookupPort {
  /** Returns the client if it exists and is active, `null` otherwise. */
  findActiveById(id: number): Promise<ClientRef | null>;
}
