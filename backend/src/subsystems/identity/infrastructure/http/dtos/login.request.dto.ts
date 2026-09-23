import { IsNotEmpty, IsString } from "class-validator";

/**
 * Body of `POST /auth/login` (API v2 §3.1).
 *
 * Validation here is presence and type only. Username format is the
 * `Username` value object's job (D-17) and a malformed one
 * deliberately collapses into the opaque `INVALID_CREDENTIALS` (D-18)
 * instead of a descriptive 400 — telling an anonymous caller *why*
 * their username was rejected leaks which identifiers exist.
 */
export class LoginRequestDto {
  @IsString()
  @IsNotEmpty({ message: "Username is required." })
  username!: string;

  @IsString()
  @IsNotEmpty({ message: "Password is required." })
  password!: string;
}
