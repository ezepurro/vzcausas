import { User } from "../../domain/entities/user.entity";
import { UserNotFoundError } from "../../domain/errors/identity.errors";
import { Email } from "../../domain/value-objects/email.vo";
import { Username } from "../../domain/value-objects/username.vo";
import { DeactivateUserUseCase } from "./deactivate-user.use-case";
import {
  FakeHasher,
  FakeRefreshTokenStore,
  FakeUserRepository,
} from "./test-support/identity-fakes";

describe("DeactivateUserUseCase", () => {
  const hasher = new FakeHasher();

  async function seedUser(
    users: FakeUserRepository,
    active = true,
  ): Promise<User> {
    const user = await User.create(
      {
        id: 1,
        username: Username.create("iperalta"),
        plainPassword: "password1",
        fullName: "Ignacio Peralta",
        email: Email.create("iperalta@vazquezzarate.com"),
        roleIds: [3],
        lawyerId: null,
        active,
      },
      hasher,
    );
    await users.create(user);
    return user;
  }

  function build() {
    const users = new FakeUserRepository();
    const refreshTokens = new FakeRefreshTokenStore();
    return {
      useCase: new DeactivateUserUseCase(users, refreshTokens),
      users,
      refreshTokens,
    };
  }

  it("deactivates the user, persists it and revokes their sessions", async () => {
    const { useCase, users, refreshTokens } = build();
    const user = await seedUser(users);

    await useCase.execute({ id: 1 });

    expect(user.isActive()).toBe(false);
    expect(users.saved).toHaveLength(1);
    expect(refreshTokens.revokedForUsers).toEqual([1]);
  });

  it("throws UserNotFoundError when no user matches the id", async () => {
    const { useCase, refreshTokens } = build();

    await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
    expect(refreshTokens.revokedForUsers).toEqual([]);
  });

  it("throws UserNotFoundError for an already deactivated user", async () => {
    const { useCase, users } = build();
    await seedUser(users, false);

    await expect(useCase.execute({ id: 1 })).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
    expect(users.saved).toHaveLength(0);
  });
});
