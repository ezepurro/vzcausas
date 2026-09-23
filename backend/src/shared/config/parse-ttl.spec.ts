import { parseTtlToSeconds } from "./parse-ttl";

describe("parseTtlToSeconds", () => {
  it("converts each supported unit to seconds", () => {
    expect(parseTtlToSeconds("30s")).toBe(30);
    expect(parseTtlToSeconds("15m")).toBe(900);
    expect(parseTtlToSeconds("2h")).toBe(7_200);
    expect(parseTtlToSeconds("7d")).toBe(604_800);
  });

  it("rejects values that do not match <digits><unit>", () => {
    expect(() => parseTtlToSeconds("fifteen minutes")).toThrow(/TTL/);
    expect(() => parseTtlToSeconds("15")).toThrow(/TTL/);
    expect(() => parseTtlToSeconds("15w")).toThrow(/TTL/);
    expect(() => parseTtlToSeconds("")).toThrow(/TTL/);
  });

  it("rejects a zero-length TTL", () => {
    // Syntactically valid but useless: a token that expires the
    // instant it is minted would break every flow that reads it.
    expect(() => parseTtlToSeconds("0m")).toThrow(/positive/);
  });

  it("rejects negative and fractional forms, which the pattern excludes", () => {
    expect(() => parseTtlToSeconds("-5m")).toThrow(/TTL/);
    expect(() => parseTtlToSeconds("1.5h")).toThrow(/TTL/);
  });
});
