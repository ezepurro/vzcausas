import { ClockPort } from "@shared/domain/clock.port";
import { User } from "../../domain/entities/user.entity";
import {
  LastAdministratorError,
  UserNotFoundError,
} from "../../domain/errors/identity.errors";
import { Email } from "../../domain/value-objects/email.vo";
import { Username } from "../../domain/value-objects/username.vo";
import { DeactivateUserUseCase } from "./deactivate-user.use-case";
import {
  FAKE_ROLE_IDS_BY_NAME,
  FakeHasher,
  FakeRefreshTokenStore,
  FakeRoleRepository,
  FakeUserRepository,
} from "./test-support/identity-fakes";

/** Fixed instant, so CA-7.1's timestamp is assertable. */
const NOW = new Date("2026-10-11T12:00:00.000Z");
const clock: ClockPort = {
  now: () => NOW,
  today: () => new Date("2026-10-11T00:00:00.000Z"),
};

describe("DeactivateUserUseCase", () => {
  const hasher = new FakeHasher();
  const ADMIN = FAKE_ROLE_IDS_BY_NAME.ADMINISTRATOR;
  const SECRETARY = FAKE_ROLE_IDS_BY_NAME.SECRETARY;

  async function seedUser(
    users: FakeUserRepository,
    overrides: {
      id?: number;
      roleIds?: number[];
      active?: boolean;
    } = {},
  ): Promise<User> {
    const id = overrides.id ?? 1;
    const user = await User.create(
      {
        id,
        username: Username.create(`user${id}`),
        plainPassword: "password1",
        fullName: "Ignacio Peralta",
        email: Email.create(`user${id}@vazquezzarate.com`),
        roleIds: overrides.roleIds ?? [SECRETARY],
        lawyerId: null,
        active: overrides.active ?? true,
      },
      hasher,
    );
    await users.create(user);
    return user;
  }

  function build() {
    const users = new FakeUserRepository();
    const roles = new FakeRoleRepository();
    const refreshTokens = new FakeRefreshTokenStore();
    return {
      useCase: new DeactivateUserUseCase(users, roles, refreshTokens, clock),
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

  it("records when the user was deactivated (CA-7.1)", async () => {
    const { useCase, users } = build();
    const user = await seedUser(users);

    await useCase.execute({ id: 1 });

    expect(user.deletedAt).toEqual(NOW);
  });

  it("leaves deletedAt null while the user is active", async () => {
    const { users } = build();
    const user = await seedUser(users);

    expect(user.deletedAt).toBeNull();
  });

  it("does not stamp a date when the deactivation is refused", async () => {
    // The last-administrator check runs first, so a refused request
    // must leave no trace of a baja that never happened.
    const { useCase, users } = build();
    const admin = await seedUser(users, { id: 1, roleIds: [ADMIN] });

    await expect(useCase.execute({ id: 1 })).rejects.toBeInstanceOf(
      LastAdministratorError,
    );
    expect(admin.deletedAt).toBeNull();
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
    await seedUser(users, { active: false });

    await expect(useCase.execute({ id: 1 })).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
    expect(users.saved).toHaveLength(0);
  });

  // CA-7.4 — the system may never be left without an administrator.
  describe("last administrator (CA-7.4)", () => {
    it("refuses to deactivate the only active administrator", async () => {
      const { useCase, users, refreshTokens } = build();
      await seedUser(users, { id: 1, roleIds: [ADMIN] });

      await expect(useCase.execute({ id: 1 })).rejects.toBeInstanceOf(
        LastAdministratorError,
      );
      expect(users.saved).toHaveLength(0);
      expect(refreshTokens.revokedForUsers).toEqual([]);
    });

    it("allows it when another active administrator remains", async () => {
      const { useCase, users } = build();
      const target = await seedUser(users, { id: 1, roleIds: [ADMIN] });
      await seedUser(users, { id: 2, roleIds: [ADMIN] });

      await useCase.execute({ id: 1 });

      expect(target.isActive()).toBe(false);
    });

    /**
     * A deactivated administrator cannot administer anything, so they
     * must not keep the last active one alive by proxy.
     */
    it("does not count deactivated administrators as a replacement", async () => {
      const { useCase, users } = build();
      await seedUser(users, { id: 1, roleIds: [ADMIN] });
      await seedUser(users, { id: 2, roleIds: [ADMIN], active: false });

      await expect(useCase.execute({ id: 1 })).rejects.toBeInstanceOf(
        LastAdministratorError,
      );
    });

    it("does not block deactivating a non-administrator", async () => {
      const { useCase, users } = build();
      await seedUser(users, { id: 1, roleIds: [ADMIN] });
      const secretary = await seedUser(users, { id: 2, roleIds: [SECRETARY] });

      await useCase.execute({ id: 2 });

      expect(secretary.isActive()).toBe(false);
    });
  });
});
