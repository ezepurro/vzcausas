import { User } from "@subsystems/identity/core/domain/entities/user.entity";
import { PasswordHasher } from "@subsystems/identity/core/domain/ports/password-hasher.port";
import { Email } from "@subsystems/identity/core/domain/value-objects/email.vo";
import { Username } from "@subsystems/identity/core/domain/value-objects/username.vo";
import { InMemoryUserRepository } from "./in-memory-user.repository";

class FakeHasher implements PasswordHasher {
  async hash(p: string): Promise<string> {
    return `hashed:${p}`;
  }
  async verify(p: string, h: string): Promise<boolean> {
    return h === `hashed:${p}`;
  }
}

const makeUser = (id = 1, username = "fvazquez"): Promise<User> =>
  User.create(
    {
      id,
      username: Username.create(username),
      plainPassword: "password-123",
      fullName: "Fernando Vázquez",
      email: Email.create(`${username}@vazquezzarate.com`),
      roleIds: [1],
      lawyerId: null,
    },
    new FakeHasher(),
  );

describe("InMemoryUserRepository", () => {
  it("starts empty (D-44)", async () => {
    const repo = new InMemoryUserRepository();

    expect(await repo.findById(1)).toBeNull();
    expect(await repo.findByUsername(Username.create("fvazquez"))).toBeNull();
  });

  it("resolves a seeded user by id and by username", async () => {
    const repo = new InMemoryUserRepository();
    const user = await makeUser();
    repo.seed(user);

    expect(await repo.findById(1)).toBe(user);
    expect(await repo.findByUsername(Username.create("fvazquez"))).toBe(user);
  });

  it("matches usernames through the value object's normalization (D-17)", async () => {
    const repo = new InMemoryUserRepository();
    repo.seed(await makeUser(1, "fvazquez"));

    // The VO lowercases and trims, so these all describe the same
    // login identifier.
    expect(
      await repo.findByUsername(Username.create("FVAZQUEZ")),
    ).not.toBeNull();
    expect(
      await repo.findByUsername(Username.create("  fvazquez  ")),
    ).not.toBeNull();
  });

  it("returns null for ids and usernames that were never stored", async () => {
    const repo = new InMemoryUserRepository();
    repo.seed(await makeUser(1, "fvazquez"));

    expect(await repo.findById(99)).toBeNull();
    expect(await repo.findByUsername(Username.create("nobody"))).toBeNull();
  });

  it("persists mutations through save so later reads observe them", async () => {
    const repo = new InMemoryUserRepository();
    const user = await makeUser();
    repo.seed(user);

    await user.changePassword(
      "password-123",
      "new-password-1",
      new FakeHasher(),
    );
    await repo.save(user);

    const reloaded = await repo.findById(1);
    expect(
      await reloaded!.verifyPassword("new-password-1", new FakeHasher()),
    ).toBe(true);
  });
});
