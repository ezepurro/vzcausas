import { PasswordHasher } from "../ports/password-hasher.port";
import { Username } from "../value-objects/username.vo";
import { User } from "./user.entity";
import {
  InvalidCurrentPasswordError,
  WeakPasswordError,
} from "../errors/identity.errors";

class FakeHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}

describe("User", () => {
  const hasher = new FakeHasher();
  const username = Username.create("admin");

  describe("hydrate", () => {
    it("constructs without validating (trusts the DB)", () => {
      const user = User.hydrate({
        id: 1,
        username,
        passwordHash: "anything",
        roleId: 1,
        lawyerId: null,
        active: true,
      });
      expect(user.id).toBe(1);
      expect(user.isActive()).toBe(true);
    });
  });

  describe("create", () => {
    it("hashes the plain password and defaults active=true", async () => {
      const user = await User.create(
        {
          id: 1,
          username,
          plainPassword: "password-123",
          roleId: 1,
          lawyerId: null,
        },
        hasher,
      );
      expect(user.isActive()).toBe(true);
      expect(await user.verifyPassword("password-123", hasher)).toBe(true);
      expect(await user.verifyPassword("wrong", hasher)).toBe(false);
    });

    it("rejects short password", async () => {
      await expect(
        User.create(
          {
            id: 1,
            username,
            plainPassword: "short",
            roleId: 1,
            lawyerId: null,
          },
          hasher,
        ),
      ).rejects.toBeInstanceOf(WeakPasswordError);
    });

    it("rejects password longer than 72 bytes", async () => {
      await expect(
        User.create(
          {
            id: 1,
            username,
            plainPassword: "x".repeat(73),
            roleId: 1,
            lawyerId: null,
          },
          hasher,
        ),
      ).rejects.toBeInstanceOf(WeakPasswordError);
    });

    it("rejects negative lawyerId", async () => {
      await expect(
        User.create(
          {
            id: 1,
            username,
            plainPassword: "password-123",
            roleId: 1,
            lawyerId: -5,
          },
          hasher,
        ),
      ).rejects.toBeInstanceOf(Error);
    });
  });

  describe("changePassword", () => {
    const build = () =>
      User.create(
        {
          id: 1,
          username,
          plainPassword: "password-123",
          roleId: 1,
          lawyerId: null,
        },
        hasher,
      );

    it("changes when the current password is correct", async () => {
      const user = await build();
      await user.changePassword("password-123", "new-password-456", hasher);
      expect(await user.verifyPassword("new-password-456", hasher)).toBe(true);
      expect(await user.verifyPassword("password-123", hasher)).toBe(false);
    });

    it("throws InvalidCurrentPasswordError when the current is wrong", async () => {
      const user = await build();
      await expect(
        user.changePassword("wrong", "new-password-456", hasher),
      ).rejects.toBeInstanceOf(InvalidCurrentPasswordError);
    });

    it("throws WeakPasswordError when the new one is weak", async () => {
      const user = await build();
      await expect(
        user.changePassword("password-123", "short", hasher),
      ).rejects.toBeInstanceOf(WeakPasswordError);
    });
  });
});
