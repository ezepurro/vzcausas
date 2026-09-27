import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { toIsoWithOffset } from "@shared/infrastructure/http/iso-date";
import { AuthenticateUserResult } from "@subsystems/identity/core/application/use-cases/authenticate-user.use-case";
import { RefreshSessionResult } from "@subsystems/identity/core/application/use-cases/refresh-session.use-case";
import {
  LoginResponseDto,
  RefreshResponseDto,
} from "../dtos/auth.response.dto";

/**
 * Translates use-case results into the wire shapes of `/auth`.
 *
 * Keeping this out of the controller means the HTTP handlers stay
 * three lines long and the contract's field names live in one file —
 * when the shape of a response changes, the diff lands here and
 * nowhere else.
 *
 * Never returns the refresh token: it travels exclusively in the
 * `HttpOnly` cookie (D-08) and must not reach JavaScript.
 */
@Injectable()
export class AuthHttpMapper {
  private readonly timeZone: string;

  constructor(config: ConfigService) {
    this.timeZone = config.getOrThrow<string>("APP_TIMEZONE");
  }

  toLoginResponse(result: AuthenticateUserResult): LoginResponseDto {
    return {
      accessToken: result.accessToken,
      tokenType: "Bearer",
      expiresIn: result.expiresIn,
      user: {
        id: result.user.id,
        username: result.user.username,
        fullName: result.user.fullName,
        email: result.user.email,
        roles: [...result.user.roleNames],
        lawyerId: result.user.lawyerId,
        // `previousLoginAt` is what the contract calls `lastLoginAt`:
        // the prior session, not the one being opened.
        lastLoginAt: result.user.previousLoginAt
          ? toIsoWithOffset(result.user.previousLoginAt, this.timeZone)
          : null,
        active: result.user.active,
      },
    };
  }

  toRefreshResponse(result: RefreshSessionResult): RefreshResponseDto {
    return {
      accessToken: result.accessToken,
      tokenType: "Bearer",
      expiresIn: result.expiresIn,
      user: {
        id: result.user.id,
        username: result.user.username,
        roles: [...result.user.roleNames],
        lawyerId: result.user.lawyerId,
        permissions: [...result.user.permissions],
      },
    };
  }
}
