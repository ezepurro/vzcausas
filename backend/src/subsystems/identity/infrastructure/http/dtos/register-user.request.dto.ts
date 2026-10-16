import { Type } from "class-transformer";
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
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

const ROLE_CODES = ["ADMINISTRATOR", "LAWYER", "SECRETARY"] as const;

/**
 * The professional record to create alongside the user. Same fields
 * as the body of `POST /lawyers` (§3.3), deliberately validated with
 * the same rules so a matrícula rejected there is rejected here too.
 */
export class NewLawyerDto {
  @IsString()
  @IsNotEmpty({ message: "El apellido es obligatorio." })
  @MaxLength(100)
  lastName!: string;

  @IsString()
  @IsNotEmpty({ message: "Los nombres son obligatorios." })
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @Matches(/^\d+-\d+$/, {
    message: "El formato de la matrícula no es válido.",
  })
  registrationNumber!: string;
}

/**
 * Enforces that `lawyerId` and `lawyer` never arrive together.
 *
 * Written as a constraint rather than with `@ValidateIf`, which only
 * decides *whether* a field is validated and so cannot report that
 * two fields conflict: with `@ValidateIf` a request carrying both
 * would simply skip a check and pass.
 */
@ValidatorConstraint({ name: "lawyerLinkIsExclusive", async: false })
export class LawyerLinkIsExclusive implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as RegisterUserRequestDto;
    return dto.lawyerId === undefined || dto.lawyer === undefined;
  }

  defaultMessage(): string {
    return "lawyerId y lawyer son mutuamente excluyentes: enviar solo uno.";
  }
}

/**
 * Request body of `POST /users` (API contract §3.2).
 *
 * The lawyer link comes in one of two shapes, never both: `lawyerId`
 * points at a record that already exists, `lawyer` carries the data
 * to create one in the same transaction. Which of the two is required
 * depends on the roles, and that rule belongs to the domain —
 * `RegisterUser` enforces it, because "a LAWYER needs a professional
 * record" is a business rule, not a shape.
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
  @IsNotEmpty({ message: "El apellido es obligatorio." })
  @MaxLength(100)
  lastName!: string;

  @IsString()
  @IsNotEmpty({ message: "Los nombres son obligatorios." })
  @MaxLength(100)
  firstName!: string;

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

  /** Links to a lawyer that already exists. */
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Validate(LawyerLinkIsExclusive)
  lawyerId?: number;

  /**
   * Registers the professional record together with the user.
   *
   * `@ValidateNested` with `@Type` is what makes the inner object be
   * checked at all: without them `class-validator` sees a plain
   * object and waves it through, so a lawyer missing its matrícula
   * would reach the use case.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => NewLawyerDto)
  lawyer?: NewLawyerDto;
}
