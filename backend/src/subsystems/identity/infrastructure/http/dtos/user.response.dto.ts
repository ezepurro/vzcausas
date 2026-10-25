/** Shape of the `lawyer` field embedded in a user response (§3.2). */
export type LawyerSummaryDto = {
  id: number;
  lastName: string;
  firstName: string;
  registrationNumber: string;
};

/**
 * Response body for the user resource (API contract §3.2). The
 * password hash never appears here — {@link UserHttpMapper} only
 * reads what the domain entity exposes through its getters.
 */
export class UserResponseDto {
  id!: number;
  username!: string;
  lastName!: string;
  firstName!: string;
  email!: string;
  roles!: string[];
  lawyer!: LawyerSummaryDto | null;
  lastLoginAt!: string | null;
  active!: boolean;
}
