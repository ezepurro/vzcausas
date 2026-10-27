import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedError } from "@shared/domain/domain-error";
import {
  AccessTokenClaims,
  IssuedAccessToken,
  TokenIssuer,
} from "@subsystems/identity/core/domain/ports/token-issuer.port";
import { parseTtlToSeconds } from "../../../../config/parse-ttl";

const MIN_SECRET_BYTES = 32;

/**
 * Production {@link TokenIssuer} implementation backed by
 * `@nestjs/jwt`. Signs and verifies HS256 access tokens (D-06)
 * using the symmetric key in `JWT_ACCESS_SECRET` and the TTL
 * declared in `JWT_ACCESS_TTL` (D-04).
 *
 * The constructor is strict at bootstrap:
 * - `JWT_ACCESS_SECRET` shorter than 32 bytes (D-43) triggers a
 *   fatal error to prevent minting tokens under a weak key.
 * - `JWT_ACCESS_TTL` is parsed by the shared
 *   {@link parseTtlToSeconds} helper, which accepts only
 *   `<digits>(s|m|h|d)` and needs no external `ms` dependency
 *   (D-41; extracted out of this file in D-47 once the in-memory
 *   refresh store needed the same parsing). Anything else fails
 *   immediately.
 *
 * `verify` collapses every failure — bad signature, expired
 * token, malformed claims (D-42) — into a single opaque
 * {@link UnauthorizedError} so callers cannot distinguish the
 * reason from the outside.
 */
@Injectable()
export class JwtTokenIssuerAdapter implements TokenIssuer {
  private readonly secret: string;
  private readonly ttlSeconds: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>("JWT_ACCESS_SECRET");
    if (Buffer.byteLength(this.secret, "utf8") < MIN_SECRET_BYTES) {
      throw new Error(
        `JWT_ACCESS_SECRET must be at least ${MIN_SECRET_BYTES} bytes long`,
      );
    }

    this.ttlSeconds = parseTtlToSeconds(
      config.getOrThrow<string>("JWT_ACCESS_TTL"),
    );
  }

  async issue(claims: AccessTokenClaims): Promise<IssuedAccessToken> {
    const token = await this.jwt.signAsync(claims, {
      secret: this.secret,
      algorithm: "HS256",
      expiresIn: this.ttlSeconds,
    });
    return { token, expiresIn: this.ttlSeconds };
  }

  async verify(token: string): Promise<AccessTokenClaims> {
    let raw: unknown;
    try {
      raw = await this.jwt.verifyAsync(token, {
        secret: this.secret,
        algorithms: ["HS256"],
      });
    } catch {
      // Bad signature, expired, malformed JWT — every failure
      // funnels to the same opaque error (D-42). No distinction
      // leaks to the client.
      throw new UnauthorizedError(
        "UNAUTHENTICATED",
        "La autenticación es requerida o el token proporcionado no es válido.",
      );
    }

    return assertClaims(raw);
  }
}

/**
 * Defensive claims-shape validation (D-42). A JWT with a valid
 * signature may still carry claims from an older deployment — for
 * example a token minted before `AccessTokenClaims` was narrowed to
 * `{ sub, sid }`, which still carries `roles`/`lawyerId`/`permissions`
 * and no `sid` at all. Rather than pass garbage into the domain,
 * reject with the same opaque error as an invalid signature via
 * {@link invalidClaims}. A pre-existing session is not lost by this:
 * the client's refresh cookie is still valid, so the very next
 * `POST /auth/refresh` mints a fresh token in the new shape.
 */
function assertClaims(raw: unknown): AccessTokenClaims {
  if (typeof raw !== "object" || raw === null) {
    throw invalidClaims();
  }

  const r = raw as Record<string, unknown>;

  if (typeof r.sub !== "number") throw invalidClaims();
  if (typeof r.sid !== "string" || r.sid.length === 0) throw invalidClaims();

  // Strip iat/exp and any other JWT-injected fields: the port
  // contract exposes only these two. Consumers should not be able to
  // peek at token metadata through this surface.
  return {
    sub: r.sub,
    sid: r.sid,
  };
}

/**
 * Single source of truth for the opaque token error. Kept as a
 * helper (rather than inlining `new UnauthorizedError(...)`) so
 * the code and message stay consistent between the catch of
 * `verify` and every branch of {@link assertClaims}.
 */
function invalidClaims(): UnauthorizedError {
  return new UnauthorizedError(
    "UNAUTHENTICATED",
    "La autenticación es requerida o el token proporcionado no es válido.",
  );
}
