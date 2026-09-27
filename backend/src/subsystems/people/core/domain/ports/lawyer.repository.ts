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

  /** `true` if the registration number is already taken (HU12, 409). */
  existsByRegistrationNumber(
    registrationNumber: RegistrationNumber,
  ): Promise<boolean>;

  /** Inserts a freshly created lawyer. */
  create(lawyer: Lawyer): Promise<void>;

  /** Loads a lawyer by primary key. Returns `null` if none. */
  findById(id: number): Promise<Lawyer | null>;
}
