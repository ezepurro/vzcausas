/** Response body for the lawyer resource (API contract §3.3). */
export class LawyerResponseDto {
  id!: number;
  lastName!: string;
  firstName!: string;
  /** `null` if the lawyer has no registration number loaded (D-107). */
  registrationNumber!: string | null;
  activeCases!: number;
  active!: boolean;
}
