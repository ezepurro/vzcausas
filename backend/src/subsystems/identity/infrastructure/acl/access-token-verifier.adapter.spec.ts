import { UnauthorizedError } from "@shared/domain/domain-error";
import {
  AccessTokenClaims,
  TokenIssuer,
} from "@subsystems/identity/core/domain/ports/token-issuer.port";
import { AccessTokenVerifierAdapter } from "./access-token-verifier.adapter";

const CLAIMS: AccessTokenClaims = {
  sub: 7,
  roles: ["ADMINISTRATOR", "LAWYER"],
  lawyerId: 10,
  permissions: ["user:manage", "case:read"],
};

const build = (verify: jest.Mock) => {
  const issuer = { issue: jest.fn(), verify } as unknown as TokenIssuer;
  return new AccessTokenVerifierAdapter(issuer);
};

describe("AccessTokenVerifierAdapter", () => {
  it("translates JWT claims into the kernel's actor vocabulary", async () => {
    const adapter = build(jest.fn().mockResolvedValue(CLAIMS));

    await expect(adapter.verify("a-token")).resolves.toEqual({
      userId: 7,
      roleNames: ["ADMINISTRATOR", "LAWYER"],
      lawyerId: 10,
      permissions: ["user:manage", "case:read"],
    });
  });

  it("preserves a null lawyerId", async () => {
    const adapter = build(
      jest.fn().mockResolvedValue({ ...CLAIMS, lawyerId: null }),
    );

    const actor = await adapter.verify("a-token");
    expect(actor.lawyerId).toBeNull();
  });

  it("forwards the token it was given to the issuer", async () => {
    const verify = jest.fn().mockResolvedValue(CLAIMS);
    const adapter = build(verify);

    await adapter.verify("the-exact-token");

    expect(verify).toHaveBeenCalledWith("the-exact-token");
  });

  it("lets the issuer's rejection through untouched", async () => {
    const failure = new UnauthorizedError(
      "UNAUTHENTICATED",
      "Invalid or expired access token.",
    );
    const adapter = build(jest.fn().mockRejectedValue(failure));

    await expect(adapter.verify("bad-token")).rejects.toBe(failure);
  });
});
