/** DI token for {@link PeopleLookupPort}. */
export const PEOPLE_LOOKUP = Symbol('PEOPLE_LOOKUP');

/** What `cases` needs to know about a lawyer. */
export interface LawyerRef {
  id: number;
  lastName: string;
  firstName: string;
  registrationNumber: string;
}

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

/**
 * Port towards `people`, which owns lawyers and clients: its adapter lives
 * there. It can grow with more lookups as `cases` needs them.
 */
export interface PeopleLookupPort {
  /** The responsible lawyer (RN3), if it exists and is active; `null` otherwise. */
  findActiveLawyerById(id: number): Promise<LawyerRef | null>;

  /** The client of the case, if it exists and is active; `null` otherwise. */
  findActiveClientById(id: number): Promise<ClientRef | null>;
}
