import { Client } from "../entities/client.entity";
import { Dni } from "../value-objects/dni.vo";

/**
 * DI token for {@link ClientRepository}. Symbol-as-token convention,
 * same as every port in the project.
 */
export const CLIENT_REPOSITORY = Symbol("CLIENT_REPOSITORY");

/** Persistence port for the {@link Client} aggregate. */
export interface ClientRepository {
  /**
   * Reserves the next primary key. `Client.create()` takes the id up
   * front, so the use case obtains one before building the aggregate
   * — same approach as `LawyerRepository.nextId()`.
   */
  nextId(): Promise<number>;

  /**
   * `true` if a **current** client already holds this document
   * (CA-8.4).
   *
   * Deactivated clients do not count: the database's unique index is
   * partial, so a logically deleted client releases their DNI.
   */
  existsActiveByDni(dni: Dni): Promise<boolean>;

  /** Inserts a freshly created client. */
  create(client: Client): Promise<void>;
}
