import { User } from "../../domain/entities/user.entity";
import {
  EmailAlreadyExistsError,
  EmptyUpdateRequestError,
  InvalidRoleError,
  LawyerAlreadyLinkedError,
  LastAdministratorError,
  LawyerLinkNotAllowedError,
  LawyerLinkRequiredError,
  LawyerNotFoundError,
  UsernameAlreadyExistsError,
  UserNotFoundError,
} from "../../domain/errors/identity.errors";
import { Email } from "../../domain/value-objects/email.vo";
import { Username } from "../../domain/value-objects/username.vo";
import { UpdateUserUseCase } from "./update-user.use-case";
import {
  FAKE_ROLE_IDS_BY_NAME,
  FakeHasher,
  FakeLawyerLookup,
  FakeRoleRepository,
  FakeUserRepository,
} from "./test-support/identity-fakes";

describe("UpdateUserUseCase", () => {
  const hasher = new FakeHasher();

  async function seedUser(
    users: FakeUserRepository,
    overrides: {
      id?: number;
      username?: string;
      email?: string;
      roleIds?: readonly number[];
      lawyerId?: number | null;
    } = {},
  ): Promise<User> {
    const user = await User.create(
      {
        id: overrides.id ?? 1,
        username: Username.create(overrides.username ?? "iperalta"),
        plainPassword: "password1",
        fullName: "Ignacio Peralta",
        email: Email.create(overrides.email ?? "iperalta@vazquezzarate.com"),
        roleIds: overrides.roleIds ?? [3],
        lawyerId: overrides.lawyerId ?? null,
      },
      hasher,
    );
    await users.create(user);
    return user;
  }

  function build(lawyerIds: readonly number[] = []) {
    const users = new FakeUserRepository();
    const roles = new FakeRoleRepository();
    const lawyerLookup = new FakeLawyerLookup(lawyerIds);
    return {
      useCase: new UpdateUserUseCase(users, roles, lawyerLookup),
      users,
      roles,
      lawyerLookup,
    };
  }

  it("rejects an empty request body", async () => {
    const { useCase } = build();

    await expect(useCase.execute({ id: 1 })).rejects.toBeInstanceOf(
      EmptyUpdateRequestError,
    );
  });

  it("rejects updating a nonexistent user", async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({ id: 999, fullName: "New Name" }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it("updates only the fields provided, keeping the rest", async () => {
    const { useCase, users } = build();
    await seedUser(users);

    const result = await useCase.execute({ id: 1, fullName: "New Name" });

    expect(result.user.fullName).toBe("New Name");
    expect(result.user.username.toString()).toBe("iperalta");
    expect(result.roles.map((r) => r.getName())).toEqual(["SECRETARY"]);
    expect(users.saved).toHaveLength(1);
  });

  it("rejects a username already taken by another user", async () => {
    const { useCase, users } = build();
    await seedUser(users, { id: 1, username: "iperalta" });
    await seedUser(users, {
      id: 2,
      username: "other",
      email: "other@vazquezzarate.com",
    });

    await expect(
      useCase.execute({ id: 2, username: "iperalta" }),
    ).rejects.toBeInstanceOf(UsernameAlreadyExistsError);
  });

  it("allows keeping your own username unchanged", async () => {
    const { useCase, users } = build();
    await seedUser(users, { id: 1, username: "iperalta" });

    const result = await useCase.execute({ id: 1, username: "iperalta" });

    expect(result.user.username.toString()).toBe("iperalta");
  });

  it("rejects an email already taken by another user", async () => {
    const { useCase, users } = build();
    await seedUser(users, { id: 1, email: "a@vazquezzarate.com" });
    await seedUser(users, {
      id: 2,
      username: "other",
      email: "b@vazquezzarate.com",
    });

    await expect(
      useCase.execute({ id: 2, email: "a@vazquezzarate.com" }),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError);
  });

  it("rejects an unknown role code", async () => {
    const { useCase, users } = build();
    await seedUser(users);

    await expect(
      useCase.execute({ id: 1, roles: ["NOT_A_ROLE"] }),
    ).rejects.toBeInstanceOf(InvalidRoleError);
  });

  it("rejects switching to LAWYER without a lawyerId", async () => {
    const { useCase, users } = build();
    await seedUser(users);

    await expect(
      useCase.execute({ id: 1, roles: ["LAWYER"] }),
    ).rejects.toBeInstanceOf(LawyerLinkRequiredError);
  });

  it("rejects setting a lawyerId when the final roles do not include LAWYER", async () => {
    const { useCase, users } = build([4]);
    await seedUser(users);

    await expect(
      useCase.execute({ id: 1, lawyerId: 4 }),
    ).rejects.toBeInstanceOf(LawyerLinkNotAllowedError);
  });

  it("rejects a lawyerId that the lookup cannot find", async () => {
    const { useCase, users } = build([]);
    await seedUser(users, { roleIds: [2], lawyerId: null });

    await expect(
      useCase.execute({ id: 1, lawyerId: 4 }),
    ).rejects.toBeInstanceOf(LawyerNotFoundError);
  });

  it("does not re-validate an unchanged lawyerId against the lookup", async () => {
    const { useCase, users } = build([]);
    // Seeded directly with a lawyerId already set — as if `people`
    // had confirmed it at creation time, before today's stub existed.
    await seedUser(users, { roleIds: [2], lawyerId: 4 });

    const result = await useCase.execute({ id: 1, fullName: "New Name" });

    expect(result.user.lawyerId).toBe(4);
  });

  it("unlinks the lawyer when lawyerId is sent as null alongside a non-LAWYER role set", async () => {
    const { useCase, users } = build([4]);
    await seedUser(users, { roleIds: [2], lawyerId: 4 });

    const result = await useCase.execute({
      id: 1,
      roles: ["SECRETARY"],
      lawyerId: null,
    });

    expect(result.user.lawyerId).toBeNull();
  });

  // A lawyer holds at most one live account.
  describe("one active account per lawyer", () => {
    it("rejects pointing at a lawyer another active user already holds", async () => {
      const { useCase, users } = build([4]);
      await seedUser(users, { roleIds: [2], lawyerId: 4 });
      await seedUser(users, {
        id: 2,
        username: "otro",
        email: "otro@vazquezzarate.com",
        roleIds: [3],
      });

      await expect(
        useCase.execute({ id: 2, roles: ["LAWYER"], lawyerId: 4 }),
      ).rejects.toBeInstanceOf(LawyerAlreadyLinkedError);
    });

    /** Re-sending your own link is a no-op, not a conflict with yourself. */
    it("lets a user keep the lawyer it already holds", async () => {
      const { useCase, users } = build([4]);
      await seedUser(users, { roleIds: [2], lawyerId: 4 });

      const result = await useCase.execute({ id: 1, lawyerId: 4 });

      expect(result.user.lawyerId).toBe(4);
    });

    it("lets a deactivated user's lawyer be taken over", async () => {
      const { useCase, users } = build([4]);
      const previous = await seedUser(users, { roleIds: [2], lawyerId: 4 });
      previous.deactivate(new Date("2026-10-11T12:00:00Z"));
      await users.save(previous);
      await seedUser(users, {
        id: 2,
        username: "otro",
        email: "otro@vazquezzarate.com",
        roleIds: [3],
      });

      const result = await useCase.execute({
        id: 2,
        roles: ["LAWYER"],
        lawyerId: 4,
      });

      expect(result.user.lawyerId).toBe(4);
    });
  });

  // CA-6.4 — "si se le quita el perfil, se desvincula la ficha, pero el
  // abogado no se da de baja".
  describe("dropping the LAWYER role (CA-6.4)", () => {
    it("unlinks the lawyer without being told to", async () => {
      const { useCase, users } = build([4]);
      await seedUser(users, { roleIds: [2], lawyerId: 4 });

      const result = await useCase.execute({ id: 1, roles: ["SECRETARY"] });

      expect(result.user.lawyerId).toBeNull();
      expect(result.roles.map((r) => r.getName())).toEqual(["SECRETARY"]);
      expect(users.saved).toHaveLength(1);
    });

    /**
     * The lawyer belongs to `people`; this use case only drops the
     * reference. Nothing here may reach into that subsystem, and the
     * criterion says so explicitly.
     */
    it("does not touch the lawyer record itself", async () => {
      const { useCase, users, lawyerLookup } = build([4]);
      await seedUser(users, { roleIds: [2], lawyerId: 4 });

      await useCase.execute({ id: 1, roles: ["SECRETARY"] });

      expect(await lawyerLookup.existsById(4)).toBe(true);
    });

    it("still rejects pointing at a lawyer without holding the role", async () => {
      const { useCase, users } = build([4]);
      await seedUser(users, { roleIds: [3], lawyerId: null });

      await expect(
        useCase.execute({ id: 1, roles: ["SECRETARY"], lawyerId: 4 }),
      ).rejects.toBeInstanceOf(LawyerLinkNotAllowedError);
    });
  });

  // CA-6.3 — the system may never be left without an administrator.
  describe("last administrator (CA-6.3)", () => {
    const ADMIN = FAKE_ROLE_IDS_BY_NAME.ADMINISTRATOR;

    it("refuses to strip ADMINISTRATOR from the only active administrator", async () => {
      const { useCase, users } = build();
      await seedUser(users, { roleIds: [ADMIN] });

      await expect(
        useCase.execute({ id: 1, roles: ["SECRETARY"] }),
      ).rejects.toBeInstanceOf(LastAdministratorError);
      expect(users.saved).toHaveLength(0);
    });

    it("allows stripping it when another active administrator remains", async () => {
      const { useCase, users } = build();
      await seedUser(users, { roleIds: [ADMIN] });
      await seedUser(users, {
        id: 2,
        username: "other",
        email: "other@vazquezzarate.com",
        roleIds: [ADMIN],
      });

      const result = await useCase.execute({ id: 1, roles: ["SECRETARY"] });

      expect(result.roles.map((r) => r.getName())).toEqual(["SECRETARY"]);
    });

    /**
     * The rule guards against the system losing its administrator, not
     * against the last administrator being edited at all: keeping the
     * role while gaining another leaves the system administered.
     */
    it("allows editing the last administrator while keeping the role", async () => {
      const { useCase, users } = build();
      await seedUser(users, { roleIds: [ADMIN] });

      const result = await useCase.execute({
        id: 1,
        roles: ["ADMINISTRATOR", "SECRETARY"],
      });

      expect(result.roles.map((r) => r.getName()).sort()).toEqual([
        "ADMINISTRATOR",
        "SECRETARY",
      ]);
    });

    it("does not interfere with role changes on a non-administrator", async () => {
      const { useCase, users } = build();
      await seedUser(users, { roleIds: [ADMIN] });
      await seedUser(users, {
        id: 2,
        username: "other",
        email: "other@vazquezzarate.com",
        roleIds: [FAKE_ROLE_IDS_BY_NAME.SECRETARY],
      });

      const result = await useCase.execute({ id: 2, roles: ["ADMINISTRATOR"] });

      expect(result.roles.map((r) => r.getName())).toEqual(["ADMINISTRATOR"]);
    });
  });
});
