import { Inject, Injectable } from "@nestjs/common";
import { CLOCK, ClockPort } from "@shared/domain/clock.port";
import { SessionExpiredError } from "../../domain/errors/identity.errors";
import {
  REFRESH_TOKEN_STORE,
  RefreshTokenStore,
} from "../../domain/ports/refresh-token-store.port";
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from "../../domain/ports/role.repository";
import {
  TOKEN_ISSUER,
  TokenIssuer,
} from "../../domain/ports/token-issuer.port";
import {
  USER_REPOSITORY,
  UserRepository,
} from "../../domain/ports/user.repository";

/**
 * Input command for {@link RefreshSessionUseCase}. Carries the raw
 * opaque refresh token as extracted from the `refresh_token` cookie
 * by the controller (D-08). Empty or otherwise malformed input is
 * accepted here and collapses to the same opaque 401 downstream
 * (D-28): the use case stays self-defensive and every failure path
 * converges to a single {@link SessionExpiredError}.
 */
export type RefreshSessionCommand = {
  refreshToken: string;
};

/**
 * Output of a successful refresh (D-26). The `user` projection is
 * deliberately reduced to the fields that can change between sessions
 * and affect authorization (`roleNames`, `lawyerId`, `permissions`);
 * the stable fields (`fullName`, `email`, `active`, `lawyer`) are
 * preserved by the client from the previous `POST /auth/login`
 * response. `lastLoginAt` is not returned here because it
 * semantically belongs to login, not to renewal.
 *
 * `refreshExpiresIn` carries the moment the rotated refresh token
 * expires; the controller uses it to set the cookie's `Expires`
 * attribute when writing the new `Set-Cookie` header.
 */
export type RefreshSessionResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: Date;
  user: {
    id: number;
    username: string;
    roleNames: string[];
    lawyerId: number | null;
    permissions: string[];
  };
};

/**
 * Refresh use case. Consumes the opaque refresh token that lived in
 * the client's `HttpOnly` cookie and hands back a new access JWT plus
 * a new refresh token in the same family (D-05, glossary §7.3).
 *
 * All failure paths collapse into {@link SessionExpiredError} (D-26):
 * token absent, unknown, revoked, expired, user gone, or user
 * inactive. Only reuse detection has a side-effect — the whole family
 * is revoked to shut down a suspected theft. Natural expiration does
 * *not* touch the family: the presented token is simply dead.
 *
 * Rotation order is `issue` first, `revoke` second (D-27): if the
 * write of the new record succeeded and the revocation of the old one
 * failed, we prefer to leave two live tokens for an instant rather
 * than a revoked orphan that would be seen as reuse on the next call
 * and kill the family of a legitimate user. Once Prisma lands (P-10)
 * these two writes will run inside a transaction and the concern
 * goes away.
 *
 * A role id that fails to resolve is treated as a data-integrity
 * failure and thrown as a plain `Error`, mirroring `AuthenticateUser`:
 * the global filter maps it to an opaque 500 with the correlation id
 * in the log. It is deliberately not folded into the 401 path — a
 * partial permission set is worse than a hard failure.
 */
@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_STORE)
    private readonly refreshStore: RefreshTokenStore,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly rolesRepo: RoleRepository,
    @Inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(command: RefreshSessionCommand): Promise<RefreshSessionResult> {
    const stored = await this.refreshStore.find(command.refreshToken);

    if (!stored) {
      // Unknown token: never issued, or purged. Nothing to revoke.
      throw new SessionExpiredError();
    }

    if (stored.revokedAt !== null) {
      // Reuse detected: a previously revoked token was presented
      // again. Treat as theft and kill the whole family (D-05).
      // `revokeFamily` is idempotent and also covers the presented
      // token, which is already revoked (D-29) — no separate
      // `revoke(token)` call is needed.
      await this.refreshStore.revokeFamily(stored.familyId);
      throw new SessionExpiredError();
    }

    const now = this.clock.now();
    if (stored.expiresAt.getTime() <= now.getTime()) {
      // Natural expiration. The family is left alone: only the
      // presented token is dead. This is the ordinary end-of-life
      // for a session that outlived `JWT_REFRESH_TTL` (D-04).
      throw new SessionExpiredError();
    }

    const user = await this.users.findById(stored.userId);
    if (!user) {
      // The user was hard-deleted after the last login. Refresh
      // records may outlive their owner briefly; refuse and let the
      // client redirect to login.
      throw new SessionExpiredError();
    }

    if (!user.isActive()) {
      // The user was soft-deleted (see API v2 §4 "Bajas"). Same
      // opaque 401 as the other paths — we do not distinguish
      // "deleted" from "expired" to the client.
      throw new SessionExpiredError();
    }

    const roles = await this.rolesRepo.findByIds(user.roleIds);
    if (roles.length !== user.roleIds.length) {
      // Data-integrity failure: the user references a role that does
      // not resolve. Mirrors `AuthenticateUser`: fail hard so the
      // global filter maps it to an opaque 500 instead of issuing a
      // token with a partial permission set.
      throw new Error(
        `User ${user.id} references role ids that do not resolve: expected ${user.roleIds.length}, got ${roles.length}`,
      );
    }

    const roleNames = roles.map((r) => r.getName());
    const permissions = Array.from(
      new Set(roles.flatMap((r) => r.getPermissions())),
    );

    // Issue-then-revoke (D-27). New refresh continues the family of
    // the presented one, so a subsequent reuse of any ancestor still
    // triggers the whole-family kill.
    const newRefresh = await this.refreshStore.issue({
      userId: user.id,
      familyId: stored.familyId,
    });
    await this.refreshStore.revoke(stored.token);

    const accessToken = await this.tokenIssuer.issue({
      sub: user.id,
      roles: roleNames,
      lawyerId: user.lawyerId,
      permissions,
    });

    return {
      accessToken: accessToken.token,
      expiresIn: accessToken.expiresIn,
      refreshToken: newRefresh.token,
      refreshExpiresIn: newRefresh.expiresAt,
      user: {
        id: user.id,
        username: user.username.toString(),
        roleNames,
        lawyerId: user.lawyerId,
        permissions,
      },
    };
  }
}
