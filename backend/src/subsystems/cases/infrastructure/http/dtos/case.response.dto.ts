/** The current state of a case, as `GET /cases` renders it. */
export class CurrentStateResponseDto {
  proceduralStateId!: number | null;
  name!: string;
  custom!: boolean;
  /** Civil date `YYYY-MM-DD`, or `null` when the state opens no deadline. */
  dueDate!: string | null;
}

/** A client, reduced to what a case listing shows about them. */
export class CaseClientResponseDto {
  id!: number;
  lastName!: string;
  firstName!: string;
  dni!: string;
}

/** The responsible lawyer, likewise reduced. */
export class CaseLawyerResponseDto {
  id!: number;
  fullName!: string;
  registrationNumber!: string;
}

/**
 * Response body for a case in `GET /cases`.
 *
 * A **subset** of the contract's payload: it carries what CA-9.4 asks
 * for. Absent on purpose are `businessDaysRemaining` (needs the
 * judicial calendar, which does not exist), plus `jurisdiction`,
 * `proceduralRole`, `instructor*`, `counterparty`, `subjectMatter` and
 * `legalQualifications` — all of them HU-20's.
 */
export class CaseResponseDto {
  id!: number;
  sacNumber!: string | null;
  caption!: string;
  court!: string | null;
  startDate!: string;
  client!: CaseClientResponseDto;
  responsibleLawyer!: CaseLawyerResponseDto;
  currentState!: CurrentStateResponseDto | null;
  active!: boolean;
}
