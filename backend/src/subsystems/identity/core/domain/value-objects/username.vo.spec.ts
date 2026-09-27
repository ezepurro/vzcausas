import { ValidationError } from "@shared/domain/domain-error";
import { Username } from "./username.vo";

describe("Username", () => {
  it("accepts a valid username and lowercases it", () => {
    const u = Username.create("  Admin  ");
    expect(u.toString()).toBe("admin");
  });

  it("rejects if too short", () => {
    expect(() => Username.create("ab")).toThrow(ValidationError);
  });

  // Boundary rather than a round number: `repeat(51)` passed under both
  // the old 50-char limit and the current one, so it never actually
  // pinned the bound it was meant to guard.
  it("accepts the longest allowed username", () => {
    expect(() => Username.create("a".repeat(30))).not.toThrow();
  });

  it("rejects one character past the limit", () => {
    expect(() => Username.create("a".repeat(31))).toThrow(ValidationError);
  });

  it("accepts the shortest allowed username", () => {
    expect(() => Username.create("abc")).not.toThrow();
  });

  it("rejects disallowed characters", () => {
    expect(() => Username.create("ad min")).toThrow(ValidationError);
    expect(() => Username.create("ad@min")).toThrow(ValidationError);
    expect(() => Username.create("ádmin")).toThrow(ValidationError);
  });

  it("accepts allowed punctuation", () => {
    expect(() => Username.create("a.b-c_d")).not.toThrow();
  });

  it("equals by value, ignoring original case", () => {
    expect(Username.create("admin").equals(Username.create("ADMIN"))).toBe(
      true,
    );
    expect(Username.create("admin").equals(Username.create("root"))).toBe(
      false,
    );
  });
});
