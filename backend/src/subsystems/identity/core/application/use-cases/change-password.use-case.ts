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
import { privateDecrypt } from "crypto";

export type ChangePasswordCommand = {
  userId: number;
  currentPassword: string;
  newPassword: string;
};

export type ChangePasswordResult = {
  refreshToken: string;
  refreshExpiresIn: Date;
};

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

    await user.changePassword(
      command.currentPassword,
      command.newPassword,
      this.hasher,
    );
    await this.users.save(user);

    await this.refreshStore.revokeAllForUser(command.userId);

    const newRefresh = await this.refreshStore.issue({
      userId: command.userId,
      familyId: null,
    });

    return {
      refreshToken: newRefresh.token,
      refreshExpiresIn: newRefresh.expiresAt,
    };
  }
}
