import { Client } from "../entities/client.entity";
import { ClientDocument } from "../value-objects/client-document.vo";

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
   * partial, so a logically deleted client releases their document. The
   * match is on the type and the number together (D-108): a DNI and a
   * passport with the same number are different documents.
   */
  /**
   * Whether a **current** client holds that document (D-108). `exceptClientId`
   * leaves one client out: a client sending its own document is not a
   * conflict (CA-10.7).
   */
  existsActiveByDocument(document: ClientDocument, exceptClientId?: number): Promise<boolean>;

  /**
   * Saves what `Client.update` changed (HU10). Meant to run inside the use
   * case's transaction, together with the audit record and the captions.
   * @throws {ClientDniAlreadyExistsError} if a current client took the document
   *   between the check and this write (the partial unique index wins the race).
   */
  update(client: Client): Promise<void>;

  /** Inserts a freshly created client. */
  create(client: Client): Promise<void>;

  /**
   * One page of clients for `GET /clients` (§3.6), ordered by surname
   * and then by given names — the order the contract fixes and the
   * `@@index([lastName, firstName])` supports.
   *
   * Only current clients are returned: a logically deleted one does
   * not appear in any listing (RN12).
   */
  search(criteria: ClientSearchCriteria): Promise<ClientPage>;

  /**
   * Loads a current client by id. Returns `null` for one that does
   * not exist **and** for one that was logically deleted: through this
   * endpoint the two are indistinguishable, so both answer 404.
   */
  findActiveById(id: number): Promise<Client | null>;
}

/**
 * `search` matches a free-text fragment against surname, given names
 * and document number, as the contract specifies.
 */
export type ClientSearchCriteria = {
  page: number;
  limit: number;
  search?: string;
};

export type ClientPage = { items: Client[]; totalItems: number };
