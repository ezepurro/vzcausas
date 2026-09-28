import { LawyerSummaryDto } from "./user.response.dto";

/**
 * Response shapes for `/auth` (API v2 §3.1). Plain types rather than
 * classes: nothing validates them at runtime, they exist to keep the
 * mapper honest about what goes on the wire.
 *
 * Every successful payload is wrapped by the controller in the
 * `{ data: ... }` envelope the contract mandates (§5.1).
 */

/**
 * The `user` block of the login response.
 *
 * Reuses {@link LawyerSummaryDto} from the user resource on purpose:
 * the contract states this `user` has the same structure `/users`
 * returns (§3.1), and sharing the type is what keeps that sentence
 * true instead of merely aspirational. Two independent declarations
 * is how they drifted apart the first time.
 *
 * It shipped as a bare `lawyerId` while `people` did not exist
 * (D-52, C-09) — the nested object was always the target, pending a
 * resource to resolve it from. HU-12 landed `/lawyers`, so the
 * divergence is closed.
 *
 * `lastLoginAt` is the timestamp of the session *before* this one, so
 * the user can spot access they did not perform. `null` on first
 * login. Serialized with the study's offset (D-53).
 */
export type LoginUserResponseDto = {
  id: number;
  username: string;
  fullName: string;
  email: string;
  roles: string[];
  lawyer: LawyerSummaryDto | null;
  lastLoginAt: string | null;
  active: boolean;
};

export type LoginResponseDto = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: LoginUserResponseDto;
};

/**
 * The `user` block of the refresh response — a reduced projection:
 * only the fields that can change between sessions and that drive
 * authorization. The stable ones are retained by the client from the
 * login response.
 *
 * The role list is keyed `roles`, the same as in
 * {@link LoginUserResponseDto} and in the `/users` resource. It was
 * briefly `roleNames` here only, which meant the same data arrived
 * under two names depending on which endpoint answered.
 *
 * `lawyerId` stays a bare id here, unlike {@link LoginUserResponseDto}:
 * this projection mirrors the access token's claims, not the user
 * resource. The client already holds the professional record from
 * login and a refresh has no reason to re-send it.
 */
export type RefreshUserResponseDto = {
  id: number;
  username: string;
  roles: string[];
  lawyerId: number | null;
  permissions: string[];
};

export type RefreshResponseDto = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: RefreshUserResponseDto;
};
