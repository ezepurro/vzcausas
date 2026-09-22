import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedError } from "@shared/domain/domain-error";
import {
  AccessTokenClaims,
  IssuedAccessToken,
  TokenIssuer,
} from "@subsystems/identity/core/domain/ports/token-issuer.port";

const TTL_PATTERN = /^(\d+)(s|m|h|d)$/;
const TTL_MULTIPLIERS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3_600,
  d: 86_400,
};
const MIN_SECRET_BYTES = 32;

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
      throw new UnauthorizedError(
        "UNAUTHENTICATED",
        "Invalid or expired access token",
      );
    }

    return assertClaims(raw);
  }
}

function parseTtlToSeconds(value: string): number {
  const match = TTL_PATTERN.exec(value);
  if (!match) {
    throw new Error(
      `Invalid TTL value ${JSON.stringify(value)}: expected <digits>(s|m|h|d) (e.g. "15m", "7d").`,
    );
  }

  const seconds = Number.parseInt(match[1], 10) * TTL_MULTIPLIERS[match[2]];
  if (seconds <= 0) {
    throw new Error(
      `Invalid TTL value ${JSON.stringify(value)}: must resolve to a positive number of seconds.`,
    );
  }

  return seconds;
}

function assertClaims(raw: unknown): AccessTokenClaims {
  if (typeof raw !== "object" || raw === null) {
    throw invalidClaims();
  }

  const r = raw as Record<string, unknown>;

  if (typeof r.sub !== "number") throw invalidClaims();
  if (r.lawyerId !== null && typeof r.lawyerId !== "number") {
    throw invalidClaims();
  }

  if (
    !Array.isArray(r.roles) ||
    !r.roles.every((x): x is string => typeof x === "string")
  ) {
    throw invalidClaims();
  }

  if (
    !Array.isArray(r.permissions) ||
    !r.permissions.every((x): x is string => typeof x === "string")
  ) {
    throw invalidClaims();
  }

  return {
    sub: r.sub,
    roles: r.roles,
    lawyerId: r.lawyerId,
    permissions: r.permissions,
  };
}

function invalidClaims(): UnauthorizedError {
  return new UnauthorizedError(
    "UNAUTHENTICATED",
    "Invalid or expired access token.",
  );
}
