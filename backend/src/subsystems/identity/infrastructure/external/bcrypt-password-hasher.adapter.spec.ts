import { ConfigService } from "@nestjs/config";
import { BcryptPasswordHasherAdapter } from "./bcrypt-password-hasher.adapter";

/**
 * `ConfigService` fake with the semantics we depend on: a hit
 * returns the stored value, a miss throws — same contract as the
 * real `getOrThrow`. Enough for the adapter's constructor
 * validation (D-39).
 */
class FakeConfigService {
  constructor(private readonly values: Record<string, unknown>) {}
  getOrThrow<T>(key: string): T {
    if (!(key in this.values)) {
      throw new Error(`Config key "${key}" is not defined`);
    }
    return this.values[key] as T;
  }
}

const buildAdapter = (cost: number | string = 4): BcryptPasswordHasherAdapter =>
  new BcryptPasswordHasherAdapter(
    new FakeConfigService({
      BCRYPT_COST: cost,
    }) as unknown as ConfigService,
  );

describe("BcryptPasswordHasherAdapter", () => {
  // All tests use cost=4 (D-40) so the suite stays sub-second.
  // Production runs with 12 via env; the algorithm is exercised
  // for real here regardless of the cost.

  it("hashes and verifies a password roundtrip", async () => {
    const hasher = buildAdapter(4);
    const hash = await hasher.hash("password-123");

    // Sanity check on the bcrypt hash format so we know the real
    // library ran (and not some accidental stub).
    expect(hash).toMatch(/^\$2[aby]?\$/);
    expect(await hasher.verify("password-123", hash)).toBe(true);
  });

  it("rejects the wrong password on verify", async () => {
    const hasher = buildAdapter(4);
    const hash = await hasher.hash("password-123");

    expect(await hasher.verify("wrong-password", hash)).toBe(false);
  });

  it("refuses to boot with BCRYPT_COST outside the [4, 15] band", () => {
    expect(() => buildAdapter(3)).toThrow(/BCRYPT_COST/);
    expect(() => buildAdapter(16)).toThrow(/BCRYPT_COST/);
  });

  it("refuses to boot when BCRYPT_COST is not an integer", () => {
    expect(() => buildAdapter(4.5)).toThrow(/BCRYPT_COST/);
  });
});
