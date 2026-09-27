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
 * Request body of `POST /users` (API contract §3.2). Deliberately has
 * no `lawyer` field: the transactional "register a new lawyer inline"
 * path is out of scope until the `people` subsystem (HU-12) exists.
 * Sending it is rejected automatically by the global `ValidationPipe`
 * (`forbidNonWhitelisted: true` in `main.ts`).
 */
export class RegisterUserRequestDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      "username may only contain letters, digits, dots, hyphens and underscores.",
  })
  username!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @Matches(/\d/, { message: "password must contain at least one digit." })
  password!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(ROLE_CODES, { each: true })
  roles!: string[];

  @IsOptional()
  @IsInt()
  @IsPositive()
  lawyerId?: number;
}
