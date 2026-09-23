import { Inject, Injectable } from "@nestjs/common";
import { UserNotFoundError } from "../../domain/errors/identity.errors";
import {
  REFRESH_TOKEN_STORE,
  RefreshTokenStore,
} from "../../domain/ports/refresh-token-store.port";
import { USER_REPOSITORY, UserRepository } from "../../domain/ports/user.repository";

export type DeactivateUserCommand = { id: number };

/**
 * HU7 — logically deletes a user (RN12). The record survives with
 * `active: false`; for the client the user simply ceases to exist.
 *
 * Deactivating an already-deactivated user is rejected as "not
 * found", not as a no-op: per the API contract that user is already
 * invisible, so the caller must not be able to tell the difference
 * between "I just deleted it" and "it was already gone".
 *
 * Revoking the refresh tokens is part of the contract, not an extra:
 * *"No puede iniciar sesión, sus sesiones abiertas se cierran"*. The
 * access JWT is short-lived and stateless, so it is not revoked here
 * — it simply expires; killing the refresh family is what prevents
 * the session from being renewed.
 */
@Injectable()
export class DeactivateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_STORE)
    private readonly refreshTokens: RefreshTokenStore,
  ) {}

  async execute(command: DeactivateUserCommand): Promise<void> {
    const user = await this.users.findById(command.id);
    if (!user || !user.isActive()) {
      throw new UserNotFoundError(command.id);
    }

    user.deactivate();
    await this.users.save(user);
    await this.refreshTokens.revokeAllForUser(user.id);
  }
}
