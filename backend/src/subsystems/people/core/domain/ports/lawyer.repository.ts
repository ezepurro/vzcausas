import { Lawyer } from "../entities/lawyer.entity";
import { RegistrationNumber } from "../value-objects/registration-number.vo";

/**
 * DI token for {@link LawyerRepository}. Symbol-as-token convention,
 * same as every port in `identity` (TypeScript interfaces do not
 * exist at runtime, so Nest needs a concrete identifier).
 */
export const LAWYER_REPOSITORY = Symbol("LAWYER_REPOSITORY");

/** Persistence port for the {@link Lawyer} aggregate. */
export interface LawyerRepository {
  /**
   * Reserves the next primary key. `Lawyer.create()` takes the id up
   * front, so the use case obtains one before building the aggregate
   * — same approach as `UserRepository.nextId()`.
   */
  nextId(): Promise<number>;

  /**
   * `true` if the registration number is already taken (HU12, 409), by any
   * lawyer, given de baja or not: the database's unique index covers them all.
   *
   * `exceptLawyerId` leaves one lawyer out: when modifying a lawyer (HU14),
   * keeping their own registration number is not a conflict (CA-14.7).
   */
  existsByRegistrationNumber(
    registrationNumber: RegistrationNumber,
    exceptLawyerId?: number,
  ): Promise<boolean>;

  /** Inserts a freshly created lawyer. */
  create(lawyer: Lawyer): Promise<void>;

  /**
   * Saves a modified lawyer: last name, first names and registration number
   * (HU14).
   *
   * @throws {LawyerRegistrationAlreadyExistsError} if another lawyer took the
   *   registration number between the check and this write (the database's
   *   unique index wins the race, CA-14.3).
   */
  update(lawyer: Lawyer): Promise<void>;

  /** Loads a lawyer by primary key. Returns `null` if none. */
  findById(id: number): Promise<Lawyer | null>;

  /**
   * One page of lawyers, newest-first, for `GET /lawyers` (§3.3).
   *
   * Returns the total alongside the page because the contract's
   * `pagination` block needs it and counting is the database's job,
   * not the use case's.
   *
   * Only active lawyers are returned: a logically deleted one (RN12)
   * *"no aparece en ningún listado"* per §3.3, the same rule
   * `findById`'s callers apply.
   */
  search(criteria: LawyerSearchCriteria): Promise<LawyerPage>;

  /**
   * Loads several lawyers by id in one query. Ids that do not match
   * are omitted, so the caller compares lengths if it cares.
   *
   * Exists so `identity` can render a page of users with their
   * linked lawyer without issuing one query per row.
   */
  findByIds(ids: readonly number[]): Promise<Lawyer[]>;
}

/**
 * `search` filters on a free-text fragment matched against the full
 * name and the registration number, as the contract specifies.
 */
export type LawyerSearchCriteria = {
  page: number;
  limit: number;
  search?: string;
};

export type LawyerPage = { items: Lawyer[]; totalItems: number };
