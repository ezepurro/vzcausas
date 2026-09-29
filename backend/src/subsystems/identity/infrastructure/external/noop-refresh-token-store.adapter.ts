import { Injectable } from "@nestjs/common";
import {
  RefreshTokenStore,
  StoredRefresh,
} from "../../core/domain/ports/refresh-token-store.port";

/**
 * Placeholder {@link RefreshTokenStore}. Exists only so HU7's
 * `DeactivateUser` can be wired and tested on this branch: the real
 * implementation belongs to EP-01/login, which is being built on the
 * `feat/auth` branch (it already has an in-memory store and the JWT
 * adapters) and has not been merged yet.
 *
 * ⚠️ SECURITY: this adapter revokes NOTHING. While it is bound,
 * deactivating a user does NOT close their open sessions, even
 * though the API contract requires it. This must be replaced before
 * anything resembling a real deployment — swap the binding in
 * `identity.module.ts` for the real store as soon as `feat/auth`
 * lands. It is safe today only because the app cannot reach the
 * database at all (pending the `schema.prisma` fix), so no session
 * can exist in the first place.
 *
 * The read/issue methods throw instead of returning fake data: a
 * silent wrong answer here would be a login bug that is very hard to
 * trace. Only `revokeAllForUser` is a no-op, because that is the one
 * HU7 calls.
 */
@Injectable()
export class NoopRefreshTokenStoreAdapter implements RefreshTokenStore {
  private static notImplemented(method: string): never {
    throw new Error(
      `RefreshTokenStore.${method} is not implemented on this branch — pending EP-01/login (feat/auth).`,
    );
  }

  issue(): Promise<StoredRefresh> {
    NoopRefreshTokenStoreAdapter.notImplemented("issue");
  }

  find(): Promise<StoredRefresh | null> {
    NoopRefreshTokenStoreAdapter.notImplemented("find");
  }

  revoke(): Promise<void> {
    NoopRefreshTokenStoreAdapter.notImplemented("revoke");
  }

  revokeFamily(): Promise<void> {
    NoopRefreshTokenStoreAdapter.notImplemented("revokeFamily");
  }

  /** No-op — see the security warning on the class. */
  async revokeAllForUser(): Promise<void> {}
}
