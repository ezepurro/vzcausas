import { User } from "../../domain/entities/user.entity";
import { UserNotFoundError } from "../../domain/errors/identity.errors";
import { Email } from "../../domain/value-objects/email.vo";
import { Username } from "../../domain/value-objects/username.vo";
import { GetUserUseCase } from "./get-user.use-case";
import {
  FakeHasher,
  FakeLawyerLookup,
  FakeRoleRepository,
  FakeUserRepository,
} from "./test-support/identity-fakes";

describe("GetUserUseCase", () => {
  const hasher = new FakeHasher();

  async function seedUser(
    users: FakeUserRepository,
    overrides: { active?: boolean } = {},
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
    const lawyerLookup = new FakeLawyerLookup();
    return {
      useCase: new GetUserUseCase(users, roles, lawyerLookup),
      users,
      roles,
    };
  }

  it("returns the user with its resolved roles", async () => {
    const { useCase, users } = build();
    await seedUser(users);

    const result = await useCase.execute({ id: 1 });

    expect(result.user.id).toBe(1);
    expect(result.roles.map((r) => r.getName())).toEqual(["SECRETARY"]);
  });

  it("throws UserNotFoundError when no user matches the id", async () => {
    const { useCase } = build();

    await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
  });

  it("throws UserNotFoundError for a logically deleted user (active: false)", async () => {
    const { useCase, users } = build();
    await seedUser(users, { active: false });

    await expect(useCase.execute({ id: 1 })).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
  });
});
