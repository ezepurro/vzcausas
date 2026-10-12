import { Inject, Injectable } from "@nestjs/common";
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from "../../domain/ports/password-hasher.port";
import {
  REFRESH_TOKEN_STORE,
  RefreshTokenStore,
} from "../../domain/ports/refresh-token-store.port";
import {
  USER_REPOSITORY,
  UserRepository,
} from "../../domain/ports/user.repository";

/**
 * `refreshToken` mirrors `LogoutCommand` (D-30): the controller reads
 * it from the `refresh_token` cookie, `null` when absent. It is what
 * lets this use case tell *the caller's own* session apart from the
 * ones it is about to wipe.
 */
export type ChangePasswordCommand = {
  userId: number;
  currentPassword: string;
  newPassword: string;
  refreshToken: string | null;
};

export type ChangePasswordResult = {
  refreshToken: string;
  refreshExpiresIn: Date;
};

/**
 * Change-password use case. Revokes every other session of the user
 * (Q-01) while keeping the caller logged in, and issues a fresh
 * refresh value so a stolen cookie identical to the caller's own stops
 * working too.
 *
 * **Reverts D-38.** D-38 wiped every family, including the caller's,
 * and started the replacement in a brand new one — accepted at the
 * time because nothing yet depended on a session's family surviving a
 * password change. That stopped being true once the access token
 * began carrying `sid` (the family id) to let the server revoke a
 * session mid-flight (CA-2.3): starting a new family here would have
 * orphaned the caller's own access token the instant the old family
 * died, directly contradicting the contract's "la sesión permanece
 * abierta" for `PATCH /auth/password`. Continuing the *same* family
 * fixes that without weakening the security property D-38 was built
 * for — see {@link resolveCallerFamily}.
 */
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(REFRESH_TOKEN_STORE)
    private readonly refreshStore: RefreshTokenStore,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<ChangePasswordResult> {
    const user = await this.users.findById(command.userId);

    if (!user) {
      throw new Error(
        `User ${command.userId} was authenticated but findById returned null`,
      );
    }

    // Looked up *before* the wipe (D-36's ordering concern still
    // applies): the caller's family id has to be read while the row
    // that names it still exists.
    const callerFamilyId = await this.resolveCallerFamily(
      command.userId,
      command.refreshToken,
    );

    await user.changePassword(
      command.currentPassword,
      command.newPassword,
      this.hasher,
    );
    await this.users.save(user);

    // Every row in every family is revoked here, including the
    // caller's — an identical copy of their refresh value held by
    // someone else (e.g. captured via XSS, which may be exactly why
    // the password is being changed) must stop working too. What
    // survives is not the old row but a brand new one, below.
    await this.refreshStore.revokeAllForUser(command.userId);

    // Continuing `callerFamilyId` (or opening a fresh one when the
    // caller presented no usable cookie) rather than always starting
    // new: the access token already in the caller's browser carries
    // the old family's id as `sid`, and the very next request would
    // find that family dead and force a spurious re-login otherwise.
    const newRefresh = await this.refreshStore.issue({
      userId: command.userId,
      familyId: callerFamilyId,
    });

    return {
      refreshToken: newRefresh.token,
      refreshExpiresIn: newRefresh.expiresAt,
    };
  }

  /**
   * The family id to continue, or `null` to start a fresh one.
   *
   * Mirrors `Logout`'s D-31 cross-user check: a cookie that does not
   * belong to this user is not trusted with anything, including which
   * family to preserve. Any of "no cookie", "unknown token" or
   * "belongs to someone else" is treated the same way — fall back to
   * a new family — because unlike `Logout`, nothing here depends on
   * the two outcomes being indistinguishable to the caller; the
   * response is always 204 regardless of which branch ran.
   */
  private async resolveCallerFamily(
    userId: number,
    refreshToken: string | null,
  ): Promise<string | null> {
    if (refreshToken === null) {
      return null;
    }

    const stored = await this.refreshStore.find(refreshToken);
    if (!stored || stored.userId !== userId) {
      return null;
    }

    return stored.familyId;
  }
}
