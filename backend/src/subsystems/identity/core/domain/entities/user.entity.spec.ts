import { ValidationError } from "@shared/domain/domain-error";
import {
  InvalidCurrentPasswordError,
  WeakPasswordError,
} from "../errors/identity.errors";
import { PasswordHasher } from "../ports/password-hasher.port";
import { Email } from "../value-objects/email.vo";
import { Username } from "../value-objects/username.vo";
import { User } from "./user.entity";

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
  const username = Username.create("fvazquez");
  const email = Email.create("fvazquez@vazquezzarate.com");

  const baseCreateProps = {
    id: 1,
    username,
    plainPassword: "password-123",
    fullName: "Fernando Vázquez",
    email,
    roleIds: [1],
    lawyerId: null,
  };

  describe("hydrate", () => {
    it("constructs without validating (trusts the DB)", () => {
      const user = User.hydrate({
        id: 1,
        username,
        passwordHash: "anything",
        fullName: "Fernando Vázquez",
        email,
        roleIds: [1],
        lawyerId: null,
        lastLoginAt: null,
        active: true,
        deletedAt: null,
      });
      expect(user.id).toBe(1);
      expect(user.isActive()).toBe(true);
      expect(user.lastLoginAt).toBeNull();
    });

    it("keeps the deactivation date it was given", () => {
      const deletedAt = new Date("2026-10-01T09:00:00-03:00");
      const user = User.hydrate({
        id: 1,
        username,
        passwordHash: "anything",
        fullName: "Fernando Vázquez",
        email,
        roleIds: [1],
        lawyerId: null,
        lastLoginAt: null,
        active: false,
        deletedAt,
      });
      expect(user.deletedAt).toEqual(deletedAt);
    });
  });

  // CA-7.1
  describe("deactivate", () => {
    it("flips the vigency flag and records the instant it receives", async () => {
      const user = await User.create(baseCreateProps, hasher);
      const at = new Date("2026-10-11T15:30:00-03:00");

      user.deactivate(at);

      expect(user.isActive()).toBe(false);
      expect(user.deletedAt).toEqual(at);
    });
  });

  describe("create", () => {
    it("hashes the plain password and defaults active=true", async () => {
      const user = await User.create(baseCreateProps, hasher);
      expect(user.isActive()).toBe(true);
      expect(user.lastLoginAt).toBeNull();
      expect(await user.verifyPassword("password-123", hasher)).toBe(true);
      expect(await user.verifyPassword("wrong", hasher)).toBe(false);
    });

    it("rejects short password", async () => {
      await expect(
        User.create({ ...baseCreateProps, plainPassword: "short1" }, hasher),
      ).rejects.toBeInstanceOf(WeakPasswordError);
    });

    it("rejects password without a digit", async () => {
      await expect(
        User.create({ ...baseCreateProps, plainPassword: "abcdefgh" }, hasher),
      ).rejects.toBeInstanceOf(WeakPasswordError);
    });

    it("rejects password longer than 72 bytes", async () => {
      await expect(
        User.create(
          { ...baseCreateProps, plainPassword: "1".repeat(73) },
          hasher,
        ),
      ).rejects.toBeInstanceOf(WeakPasswordError);
    });

    it("rejects negative lawyerId", async () => {
      await expect(
        User.create({ ...baseCreateProps, lawyerId: -5 }, hasher),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("rejects empty roleIds", async () => {
      await expect(
        User.create({ ...baseCreateProps, roleIds: [] }, hasher),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("rejects roleIds with non-positive members", async () => {
      await expect(
        User.create({ ...baseCreateProps, roleIds: [1, 0, 2] }, hasher),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("rejects empty fullName", async () => {
      await expect(
        User.create({ ...baseCreateProps, fullName: "   " }, hasher),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe("changePassword", () => {
    const build = () => User.create(baseCreateProps, hasher);

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

    it("throws WeakPasswordError when the new one lacks a digit", async () => {
      const user = await build();
      await expect(
        user.changePassword("password-123", "abcdefghij", hasher),
      ).rejects.toBeInstanceOf(WeakPasswordError);
    });
  });

  describe("registerLogin", () => {
    it("returns null the first time and stores the current instant", async () => {
      const user = await User.create(baseCreateProps, hasher);
      const now = new Date("2026-09-21T10:00:00Z");

      const previous = user.registerLogin(now);

      expect(previous).toBeNull();
      expect(user.lastLoginAt).toEqual(now);
    });

    it("returns the previously stored instant on subsequent calls", async () => {
      const user = await User.create(baseCreateProps, hasher);
      const first = new Date("2026-09-21T10:00:00Z");
      const second = new Date("2026-09-21T11:00:00Z");

      user.registerLogin(first);
      const previous = user.registerLogin(second);

      expect(previous).toEqual(first);
      expect(user.lastLoginAt).toEqual(second);
    });
  });
});
