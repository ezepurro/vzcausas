import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedError } from "@shared/domain/domain-error";
import { AccessTokenClaims } from "../../core/domain/ports/token-issuer.port";
import { JwtTokenIssuerAdapter } from "./jwt-token-issuer.adapter";

/** Exactly 32 ASCII bytes — the minimum accepted by the adapter (D-43). */
const SECRET_32B = "0123456789abcdef0123456789abcdef";

class FakeConfigService {
  constructor(private readonly values: Record<string, unknown>) {}
  getOrThrow<T>(key: string): T {
    if (!(key in this.values)) {
      throw new Error(`Config key "${key}" is not defined`);
    }
    return this.values[key] as T;
  }
}

const buildIssuer = (
  overrides: { secret?: string; ttl?: string } = {},
): JwtTokenIssuerAdapter =>
  new JwtTokenIssuerAdapter(
    new JwtService({}),
    new FakeConfigService({
      JWT_ACCESS_SECRET: overrides.secret ?? SECRET_32B,
      JWT_ACCESS_TTL: overrides.ttl ?? "15m",
    }) as unknown as ConfigService,
  );

const CLAIMS: AccessTokenClaims = {
  sub: 1,
  roles: ["ADMINISTRATOR", "LAWYER"],
  lawyerId: 10,
  permissions: ["user:manage", "case:read"],
};

describe("JwtTokenIssuerAdapter", () => {
  it("issues a token and verifies it back to the same claims", async () => {
    const issuer = buildIssuer();

    const issued = await issuer.issue(CLAIMS);
    expect(issued.token).toBeTruthy();
    expect(issued.expiresIn).toBe(900); // 15m == 900s

    // The adapter strips iat/exp on the way out (assertClaims
    // returns only the fields declared in AccessTokenClaims), so
    // toEqual is exact.
    const verified = await issuer.verify(issued.token);
    expect(verified).toEqual(CLAIMS);
  });

  it("parses TTL from the env: 7d yields 604800 seconds", async () => {
    const issuer = buildIssuer({ ttl: "7d" });

    const issued = await issuer.issue(CLAIMS);
    expect(issued.expiresIn).toBe(7 * 24 * 60 * 60);
  });

  it("rejects a token signed with a different secret", async () => {
    const alice = buildIssuer({ secret: SECRET_32B });
    const bob = buildIssuer({
      secret: SECRET_32B.replace("0", "z"), // still 32 bytes, but different
    });

    const issued = await alice.issue(CLAIMS);

    await expect(bob.verify(issued.token)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("rejects a token with claims of the wrong shape (D-42)", async () => {
    // Sign with the JWT service directly to bypass the adapter's
    // shape enforcement on the issue side, and confirm the guard
    // on the verify side rejects malformed claims (`sub` here is
    // a string instead of a number).
    const jwt = new JwtService({});
    const badToken = await jwt.signAsync(
      { sub: "not-a-number", roles: [], permissions: [] },
      { secret: SECRET_32B, algorithm: "HS256", expiresIn: 900 },
    );

    const issuer = buildIssuer();
    await expect(issuer.verify(badToken)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("refuses to boot with a secret shorter than 32 bytes (D-43)", () => {
    expect(() => buildIssuer({ secret: "too-short" })).toThrow(
      /at least 32 bytes/,
    );
  });

  it("refuses to boot with an unparseable TTL (D-41)", () => {
    expect(() => buildIssuer({ ttl: "fifteen minutes" })).toThrow(/TTL/);
  });
});
