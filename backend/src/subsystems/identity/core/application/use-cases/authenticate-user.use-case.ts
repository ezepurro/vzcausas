import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import {
  InvalidCredentialsError,
  TooManyLoginAttemptsError,
} from '../../domain/errors/identity.errors';
import {
  LOGIN_THROTTLE,
  LoginAttemptContext,
  LoginThrottle,
} from '../../domain/ports/login-throttle.port';
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
 *
 * `ip` is the caller's address, used only as a counter key by the
 * progressive lockout (Q-03). It is part of the command rather than
 * read from an ambient request because that is how this codebase
 * passes request context into a use case (`MODULO_AUTH.md` §5): the
 * dependency stays visible in the signature and the use case remains
 * callable from a test without HTTP.
 */
export type AuthenticateUserCommand = {
  username: string;
  password: string;
  ip: string;
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
 * 5. Batch-load the user's roles to resolve their names for the
 *    response (§3.1's `roles` field). If any role id does not
 *    resolve, fail hard: it is a data-integrity failure, and the same
 *    check guards every other path that reads a user's roles
 *    (`RefreshSession`, `AccessTokenVerifierAdapter`).
 * 6. Issue a refresh token (fresh family) and then an access JWT
 *    carrying that family's id as `sid` — refresh first, precisely
 *    because the access token cannot be minted without knowing which
 *    family it belongs to.
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
 *
 * Wrapped around all of it is the progressive lockout of Q-03, which
 * this use case orchestrates in three places:
 *
 * - **Before step 3**, it refuses a locked caller outright. Placed
 *   ahead of the password check on purpose: bcrypt at cost 12 (D-07)
 *   is a few hundred milliseconds of CPU per call, and spending it on
 *   a caller already known to be locked out is exactly the work an
 *   attacker wants the server to do.
 * - **On every failed path**, through {@link failAttempt}, so a wrong
 *   password, an unknown username and an inactive account all count.
 *   Counting the unknown username matters: see `LoginThrottle` for why
 *   skipping it would re-open the account enumeration that D-18 closes.
 * - **On success**, by clearing the counters, so four mistyped
 *   attempts followed by the right password leave nothing behind.
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
    @Inject(LOGIN_THROTTLE) private readonly throttle: LoginThrottle,
  ) {}

  async execute(command: AuthenticateUserCommand): Promise<AuthenticateUserResult> {
    let username: Username;

    try {
      username = Username.create(command.username);
    } catch {
      // Not counted against the lockout: a malformed username has no
      // normalized form, so there is no stable key to count it under,
      // and the request never reached the password check anyway.
      throw new InvalidCredentialsError();
    }

    const attempt: LoginAttemptContext = {
      username: username.toString(),
      ip: command.ip,
    };

    const waitSeconds = await this.throttle.remainingLockSeconds(attempt);
    if (waitSeconds > 0) {
      throw new TooManyLoginAttemptsError(waitSeconds);
    }

    const user = await this.users.findByUsername(username);

    if (!user) {
      throw await this.failAttempt(attempt);
    }

    const passwordOk = await user.verifyPassword(command.password, this.hasher);

    if (!passwordOk) {
      throw await this.failAttempt(attempt);
    }

    if (!user.isActive()) {
      throw await this.failAttempt(attempt);
    }

    // The credentials were right, so the slate is wiped here rather
    // than at the end: everything below can still fail on a data
    // integrity problem, and a 500 is no reason to hold failures
    // against someone who typed their password correctly.
    await this.throttle.recordSuccess(attempt);

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

    // Refresh before access: the access token's `sid` claim is the
    // family this login opens, so the family has to exist first.
    const refresh = await this.refreshStore.issue({
      userId: user.id,
      familyId: null,
    });

    const accessToken = await this.tokenIssuer.issue({
      sub: user.id,
      sid: refresh.familyId,
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
   * Counts one failed attempt and returns the error to throw.
   *
   * It returns the error instead of throwing it so each call site
   * reads `throw await this.failAttempt(...)` — the `throw` stays
   * visible where the branch is, which is what keeps the three
   * failure paths obviously terminal.
   *
   * Which error depends on whether this attempt was the one that
   * tripped the lock. Reporting "invalid credentials" on the fifth try
   * and "too many attempts" on the sixth would read as two unrelated
   * problems to somebody who simply forgot their password; telling
   * them immediately that the account is now closed for 90 seconds is
   * both true and actionable.
   */
  private async failAttempt(
    attempt: LoginAttemptContext,
  ): Promise<InvalidCredentialsError | TooManyLoginAttemptsError> {
    const waitSeconds = await this.throttle.recordFailure(attempt);

    return waitSeconds > 0
      ? new TooManyLoginAttemptsError(waitSeconds)
      : new InvalidCredentialsError();
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
