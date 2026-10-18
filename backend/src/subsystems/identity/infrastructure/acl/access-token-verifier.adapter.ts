import { Inject, Injectable } from "@nestjs/common";
import { AccessTokenVerifier } from "@shared/domain/access-token-verifier.port";
import { AuthenticatedUser } from "@shared/domain/authenticated-user";
import { CLOCK, ClockPort } from "@shared/domain/clock.port";
import { UnauthorizedError } from "@shared/domain/domain-error";
import {
  REFRESH_TOKEN_STORE,
  RefreshTokenStore,
} from "@subsystems/identity/core/domain/ports/refresh-token-store.port";
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from "@subsystems/identity/core/domain/ports/role.repository";
import { SESSION_INACTIVITY_SECONDS } from "@subsystems/identity/core/domain/ports/session-inactivity.port";
import {
  TOKEN_ISSUER,
  TokenIssuer,
} from "@subsystems/identity/core/domain/ports/token-issuer.port";
import {
  USER_REPOSITORY,
  UserRepository,
} from "@subsystems/identity/core/domain/ports/user.repository";

/** Opaque 401, identical to every other rejection the verifier can raise. */
function unauthenticated(): UnauthorizedError {
  return new UnauthorizedError(
    "UNAUTHENTICATED",
    "La autenticación es requerida o el token proporcionado no es válido.",
  );
}

/**
 * Satisfies the kernel's {@link AccessTokenVerifier} port with
 * `identity`'s ports (D-55).
 *
 * Lives in `acl` because that is exactly its role: it bridges two
 * vocabularies so neither side has to learn the other's. `shared`
 * thinks in actors (`userId`, `roleNames`); `identity` thinks in JWT
 * claims (`sub`, `sid`) and database rows. Without this translation
 * the kernel would have to import identity's internals, and they
 * would leak into every controller in the system.
 *
 * **This class is the whole of the revocation story for access
 * tokens** (CA-2.3, CA-6.2, CA-7.3, CA-1.6). `JwtAuthGuard` calls
 * `verify()` on every protected request, so a rejection here is what
 * a deactivated user, a logged-out session, a wiped family or 30
 * minutes of silence actually look like to the client: the same
 * opaque 401 `JwtTokenIssuerAdapter` already uses for a bad signature.
 * Nothing here distinguishes the reasons — that opacity is deliberate
 * and consistent with every other auth failure in this subsystem
 * (D-18, D-26, D-33, D-42).
 *
 * This is also why `roles`/`lawyerId`/`permissions` no longer live in
 * the JWT (see `AccessTokenClaims`): a signed token cannot be told
 * "your role just changed", so authorization has to be read fresh on
 * every request regardless. Once that database read is happening
 * anyway, it is also the cheapest place to settle "is this session
 * still open" — one round trip answers both questions.
 *
 * Checks run in this order, cheapest first:
 *
 * 1. Verify the JWT (signature, expiry, shape) — in-process, no I/O.
 * 2. Load the user; reject if gone or deactivated (CA-7.3).
 * 3. Load the latest row of the token's family (`sid`); reject if the
 *    family never existed or was revoked (CA-2.3: logout, a password
 *    change elsewhere, or theft detection).
 * 4. Reject if that row is older than `SESSION_INACTIVITY_TTL`
 *    (CA-1.6). The timestamp only moves on rotation — which happens
 *    at most every `JWT_ACCESS_TTL`, when the client renews — so an
 *    idle session is cut somewhere between the configured window and
 *    that plus the access TTL. That slack is the cost of this costing
 *    nothing on the far more common path of an active session; see
 *    `.env.example` for the numbers.
 * 5. Resolve roles fresh and build the actor from them (CA-6.2): a
 *    role or permission revoked a minute ago is gone a minute later,
 *    not fifteen minutes later.
 *
 * A role id that fails to resolve at step 5 is a data-integrity
 * failure, not an auth failure, and is thrown as a plain `Error` —
 * mirrors `AuthenticateUser` and `RefreshSession`, which make the same
 * call for the same reason.
 */
@Injectable()
export class AccessTokenVerifierAdapter implements AccessTokenVerifier {
  constructor(
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuer,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(REFRESH_TOKEN_STORE)
    private readonly refreshStore: RefreshTokenStore,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(SESSION_INACTIVITY_SECONDS)
    private readonly inactivitySeconds: number,
  ) {}

  async verify(token: string): Promise<AuthenticatedUser> {
    const claims = await this.tokens.verify(token);

    const user = await this.users.findById(claims.sub);
    if (!user || !user.isActive()) {
      // Covers both "never existed" and CA-7.3's "deactivated after
      // this token was issued" — the client cannot tell which, same
      // as D-18 keeps login from telling them.
      throw unauthenticated();
    }

    const family = await this.refreshStore.findLatestInFamily(claims.sid);
    if (!family || family.revokedAt !== null) {
      // No row: a token minted for a family nobody can produce
      // (should not happen outside tampering). A revoked row: logout,
      // a password change that wiped this session, or reuse detection
      // (CA-2.3) — the access token dies with the refresh family that
      // issued it, not fifteen minutes later.
      throw unauthenticated();
    }

    const idleSeconds =
      (this.clock.now().getTime() - family.createdAt.getTime()) / 1000;
    if (idleSeconds > this.inactivitySeconds) {
      // CA-1.6. The family is left alone — this is not theft, it is
      // the ordinary end of a session nobody renewed. Critically,
      // `RefreshSessionUseCase` enforces the *same* window against
      // the *same* `SESSION_INACTIVITY_SECONDS` value: without that,
      // the frontend's automatic silent renewal — triggered the
      // instant this check starts failing — would mint a fresh access
      // token on the spot and undo this rejection before the caller
      // ever saw it.
      throw unauthenticated();
    }

    const roles = await this.roles.findByIds(user.roleIds);
    if (roles.length !== user.roleIds.length) {
      throw new Error(
        `User ${user.id} references role ids that do not resolve: expected ${user.roleIds.length}, got ${roles.length}`,
      );
    }

    return {
      userId: user.id,
      roleNames: roles.map((r) => r.getName()),
      lawyerId: user.lawyerId,
      permissions: Array.from(
        new Set(roles.flatMap((r) => r.getPermissions())),
      ),
    };
  }
}
