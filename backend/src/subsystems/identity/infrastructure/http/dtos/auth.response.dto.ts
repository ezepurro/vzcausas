import { LawyerSummaryDto } from './user.response.dto';

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
 * `lawyerId` is a bare id, not the nested
 * `lawyer: { id, fullName, registrationNumber }` object the contract
 * currently documents (D-52, C-09): the professional record lives in
 * the `/lawyers` resource, which does not exist yet. Adding the
 * nested object later is additive.
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
  tokenType: 'Bearer';
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
  tokenType: 'Bearer';
  expiresIn: number;
  user: RefreshUserResponseDto;
};
