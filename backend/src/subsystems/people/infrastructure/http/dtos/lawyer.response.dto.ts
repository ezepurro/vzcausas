/** Response body for the lawyer resource (API contract §3.3). */
export class LawyerResponseDto {
  id!: number;
  lastName!: string;
  firstName!: string;
  registrationNumber!: string;
  activeCases!: number;
  active!: boolean;
}
