import { ValidationError } from "@shared/domain/domain-error";
import { Email } from "./email.vo";

describe("Email", () => {
  it("accepts a valid email and lowercases it", () => {
    const e = Email.create("  FGVazquez@Example.COM  ");
    expect(e.toString()).toBe("fgvazquez@example.com");
  });

  it("rejects strings without @", () => {
    expect(() => Email.create("nothing")).toThrow(ValidationError);
  });

  it("rejects strings without domain suffix", () => {
    expect(() => Email.create("foo@bar")).toThrow(ValidationError);
  });

  it("rejects non-string input", () => {
    expect(() => Email.create(null as unknown as string)).toThrow(
      ValidationError,
    );
  });

  it("equals by normalized value", () => {
    expect(Email.create("A@b.com").equals(Email.create("a@B.COM"))).toBe(true);
    expect(Email.create("a@b.com").equals(Email.create("c@d.com"))).toBe(false);
  });
});
