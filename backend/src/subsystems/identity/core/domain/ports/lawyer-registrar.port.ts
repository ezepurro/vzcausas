import { LawyerSummary } from "./lawyer-lookup.port";

/**
 * DI token for {@link LawyerRegistrarPort}. Symbol-as-token
 * convention, same as every other port.
 */
export const LAWYER_REGISTRAR = Symbol("LAWYER_REGISTRAR");

/** The professional record `RegisterUser` asks `people` to create. */
export type NewLawyer = {
  fullName: string;
  registrationNumber: string;
};

/**
 * Declared by `identity` so `RegisterUser` can create the
 * professional record of a user being registered with the LAWYER
 * role, when the caller sends `lawyer` instead of `lawyerId`
 * (contract §3.2).
 *
 * The companion of {@link LawyerLookupPort}: that one reads, this one
 * writes. Both are implemented by the same anti-corruption adapter,
 * which is the only file in `identity` that knows `people` exists.
 *
 * The write happens inside the transaction `RegisterUser` opens, so
 * a failure registering the user undoes the lawyer as well — the
 * contract is explicit that a failed registration must not leave a
 * lawyer behind.
 */
export interface LawyerRegistrarPort {
  /**
   * Creates the lawyer and returns it as `identity` renders it.
   *
   * @throws when the registration number is already taken. The error
   *   is `people`'s own and travels untouched, so the response
   *   carries the same code `POST /lawyers` uses and the frontend can
   *   mark the field.
   */
  register(lawyer: NewLawyer): Promise<LawyerSummary>;
}
