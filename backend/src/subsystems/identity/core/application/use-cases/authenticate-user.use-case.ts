import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { InvalidCredentialsError } from '../../domain/errors/identity.errors';
import { PASSWORD_HASHER, PasswordHasher } from '../../domain/ports/password-hasher.port';
import { REFRESH_TOKEN_STORE, RefreshTokenStore } from '../../domain/ports/refresh-token-store.port';
import { ROLE_REPOSITORY, RoleRepository } from '../../domain/ports/role.repository';
import { TOKEN_ISSUER, TokenIssuer } from '../../domain/ports/token-issuer.port';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';
import { Username } from '../../domain/value-objects/username.vo';
import { LAWYER_LOOKUP, LawyerLookupPort, LawyerSummary } from '../../domain/ports/lawyer-lookup.port';

/**
 * Input command for {@link AuthenticateUserUseCase}. Raw strings from
 * the HTTP layer; the use case parses them via value objects so the
 * boundary remains self-defending even when called outside HTTP.
 */
export type AuthenticateUserCommand = {
  username: string;
  password: string;
};

/**
 * Output of a successful authentication.
 *
 * - `previousLoginAt` is what the API v2 login response exposes as
 *   `lastLoginAt`: the timestamp of the *previous* session, so the
 *   user can spot access they did not perform.
 * - `refreshExpiresIn` carries the moment the refresh token expires;
 *   the controller uses it to set the cookie's `Expires` attribute.
 * - `user.lawyer` is the professional record behind the user's
 *   `lawyerId`, resolved here through {@link LawyerLookupPort}. The
 *   contract embeds it (§3.1) and states this `user` has the same
 *   shape `/users` returns, so it is resolved in the use case exactly
 *   as `GetUserUseCase` does — not in the mapper, which does no I/O.
 */
export type AuthenticateUserResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: Date;
  user: {
    id: number;
    username: string;
    fullName: string;
    email: string;
    roleNames: string[];
    lawyer: LawyerSummary | null;
    previousLoginAt: Date | null;
    active: boolean;
  };
};

/**
 * Login use case (HU1). Coordinates every identity port to
 * authenticate a user and emit a fresh session:
 *
 * 1. Parse the username via {@link Username.create}. Format issues
 *    collapse into the opaque credentials error (D-18).
 * 2. Resolve the user by username.
 * 3. Verify the plain password against the stored hash via the
 *    injected {@link PasswordHasher}.
 * 4. Reject inactive users behind the same opaque error.
 * 5. Batch-load the user's roles and union their permissions,
 *    deduplicating. If any role id does not resolve, fail hard: it
 *    is a data-integrity failure and issuing a token with a partial
 *    permission set would be worse than a 500.
 * 6. Issue an access JWT and a refresh token (fresh family).
 * 7. Rotate `lastLoginAt` on the aggregate (return the previous,
 *    save the current) and persist the update.
 * 8. Resolve the linked professional record so the response can embed
 *    it under `user.lawyer`. A link that does not resolve renders
 *    `null` rather than failing the login: a deactivated lawyer must
 *    not lock its user out.
 *
 * Steps 1–4 collapse into a single {@link InvalidCredentialsError}
 * on failure: the client cannot distinguish "user does not exist"
 * from "password wrong" from "inactive", which is the standard
 * OWASP guidance for login endpoints.
 */
@Injectable()
export class AuthenticateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly rolesRepo: RoleRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer,
    @Inject(REFRESH_TOKEN_STORE)
    private readonly refreshStore: RefreshTokenStore,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(LAWYER_LOOKUP) private readonly lawyerLookup: LawyerLookupPort,
  ) {}

  async execute(command: AuthenticateUserCommand): Promise<AuthenticateUserResult> {
    let username: Username;

    try {
      username = Username.create(command.username);
    } catch {
      throw new InvalidCredentialsError();
    }

    const user = await this.users.findByUsername(username);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const passwordOk = await user.verifyPassword(command.password, this.hasher);

    if (!passwordOk) {
      throw new InvalidCredentialsError();
    }

    if (!user.isActive()) {
      throw new InvalidCredentialsError();
    }

    const roles = await this.rolesRepo.findByIds(user.roleIds);
    if (roles.length !== user.roleIds.length) {
      // Data-integrity failure: the user references a role that does
      // not exist. Fail hard rather than emit a token with a partial
      // permission set. The global filter logs this with the request's
      // correlation id and returns an opaque 500.
      throw new Error(
        `User ${user.id} references role ids that do not resolve: expected ${user.roleIds.length}, got ${roles.length}`,
      );
    }

    const roleNames = roles.map((r) => r.getName());
    const permissions = Array.from(new Set(roles.flatMap((r) => r.getPermissions())));

    const accessToken = await this.tokenIssuer.issue({
      sub: user.id,
      roles: roleNames,
      lawyerId: user.lawyerId,
      permissions,
    });

    const refresh = await this.refreshStore.issue({
      userId: user.id,
      familyId: null,
    });

    const now = this.clock.now();
    const previousLoginAt = user.registerLogin(now);
    await this.users.save(user);

    const lawyer = await this.resolveLawyer(user.lawyerId);

    return {
      accessToken: accessToken.token,
      expiresIn: accessToken.expiresIn,
      refreshToken: refresh.token,
      refreshExpiresIn: refresh.expiresAt,
      user: {
        id: user.id,
        username: user.username.toString(),
        fullName: user.fullName,
        email: user.email.toString(),
        roleNames,
        lawyer,
        previousLoginAt,
        active: user.isActive(),
      },
    };
  }

  /**
   * The contract embeds the linked professional record under
   * `user.lawyer` (§3.1, same shape as §3.2). A user without a link,
   * and one whose lawyer was deactivated, both render `null` — the
   * lookup reports a logically deleted record as absent, and neither
   * case is a reason to refuse the login.
   */
  private async resolveLawyer(lawyerId: number | null): Promise<LawyerSummary | null> {
    if (lawyerId === null) {
      return null;
    }

    const summaries = await this.lawyerLookup.findSummaries([lawyerId]);
    return summaries.get(lawyerId) ?? null;
  }
}
