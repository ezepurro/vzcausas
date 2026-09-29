import { Inject, Injectable } from "@nestjs/common";
import { AccessTokenVerifier } from "@shared/domain/access-token-verifier.port";
import { AuthenticatedUser } from "@shared/domain/authenticated-user";
import {
  TOKEN_ISSUER,
  TokenIssuer,
} from "@subsystems/identity/core/domain/ports/token-issuer.port";

/**
 * Satisfies the kernel's {@link AccessTokenVerifier} port with
 * `identity`'s {@link TokenIssuer} (D-55).
 *
 * Lives in `acl` because that is exactly its role: it bridges two
 * vocabularies so neither side has to learn the other's. `shared`
 * thinks in actors (`userId`, `roleNames`); `identity` thinks in JWT
 * claims (`sub`, `roles`). Without this translation the kernel would
 * have to import `AccessTokenClaims`, and the subsystem's token format
 * would leak into every controller in the system.
 *
 * The class holds no logic beyond that mapping — signature and expiry
 * checks belong to the `TokenIssuer` adapter, and its
 * `UnauthorizedError` is allowed to propagate unchanged, which is what
 * the port promises its callers.
 */
@Injectable()
export class AccessTokenVerifierAdapter implements AccessTokenVerifier {
  constructor(@Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuer) {}

  async verify(token: string): Promise<AuthenticatedUser> {
    const claims = await this.tokens.verify(token);

    return {
      userId: claims.sub,
      roleNames: claims.roles,
      lawyerId: claims.lawyerId,
      permissions: claims.permissions,
    };
  }
}
