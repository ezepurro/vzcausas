import { IsNotEmpty, IsString } from "class-validator";

/**
 * Body of `PATCH /auth/password` (API v2 §3.1).
 *
 * The password policy (min 8 chars, at least one digit, max 72 bytes
 * — D-24) is intentionally **not** duplicated here. It lives in
 * `User.validatePasswordRules`, and `WeakPasswordError` already
 * surfaces as a 400 `VALIDATION_ERROR`. Restating the rules in a
 * decorator would create a second source of truth that drifts the
 * first time the policy changes.
 */
export class ChangePasswordRequestDto {
  @IsString()
  @IsNotEmpty({ message: "Current password is required." })
  currentPassword!: string;

  @IsString()
  @IsNotEmpty({ message: "New password is required." })
  newPassword!: string;
}
