import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

const ROLE_CODES = ["ADMINISTRATOR", "LAWYER", "SECRETARY"] as const;

/**
 * Request body of `PATCH /users/{userId}` (API contract §3.2). Every
 * field is optional (enforced at the use-case level: at least one
 * must be present). Does not include `password` — that is
 * `PATCH /auth/password`'s concern.
 *
 * `lawyerId` is intentionally `number | null`. `@IsOptional()` treats
 * both `undefined` and `null` as "skip the remaining validators" for
 * that property, so it is never checked against `@IsInt/@IsPositive`
 * in either case — exactly what we want, since `null` is a valid,
 * meaningful value here (unlink), not something to validate as an
 * int. The three states — absent, `null`, a number — carry different
 * meaning downstream and must all reach the use case unchanged. See
 * `UpdateUserCommand` and `UserHttpMapper.toUpdateCommand`.
 */
export class UpdateUserRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      "username may only contain letters, digits, dots, hyphens and underscores.",
  })
  username?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(ROLE_CODES, { each: true })
  roles?: string[];

  @IsOptional()
  @IsInt()
  @IsPositive()
  lawyerId?: number | null;
}
