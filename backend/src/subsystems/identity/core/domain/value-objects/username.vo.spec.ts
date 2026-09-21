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

  it("rejects if too long", () => {
    expect(() => Username.create("a".repeat(51))).toThrow(ValidationError);
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
