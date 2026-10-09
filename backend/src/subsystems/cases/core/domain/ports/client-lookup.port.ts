/** DI token for {@link ClientLookupPort}. */
export const CLIENT_LOOKUP = Symbol('CLIENT_LOOKUP');

/** What `cases` needs to know about a client. */
export interface ClientRef {
  id: number;
  lastName: string;
  firstName: string;
  dni: string;
  phone: string | null;
  email: string | null;
  clientSince: Date;
}

/** Anti-corruption port towards `people`: resolves the client of a case. */
export interface ClientLookupPort {
  /** Returns the client if it exists and is active, `null` otherwise. */
  findActiveById(id: number): Promise<ClientRef | null>;
}
