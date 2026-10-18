import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

/**
 * Request body of `POST /clients` (API contract §3.6).
 *
 * Deliberately has **no `clientSince`**: the system assigns it and
 * does not offer it for editing (CA-8.7). The global `ValidationPipe`
 * runs with `forbidNonWhitelisted`, so sending it is rejected rather
 * than ignored.
 *
 * Surname and given names stay separate (CA-8.2) — composing
 * `GÓMEZ, Ariel Fernando` is the interface's job.
 */
export class RegisterClientRequestDto {
  @IsString()
  @IsNotEmpty({ message: "El apellido es obligatorio." })
  @MaxLength(100)
  lastName!: string;

  @IsString()
  @IsNotEmpty({ message: "Los nombres son obligatorios." })
  @MaxLength(100)
  firstName!: string;

  /**
   * Digits only. The dots in `34.812.905` are presentation, so they
   * are rejected here rather than silently stripped: accepting two
   * spellings of one document at the edge would make the uniqueness
   * rule depend on how the caller typed it.
   */
  @IsString()
  @Matches(/^[0-9]{7,8}$/, {
    message: "Debe contener 7 u 8 dígitos, sin puntos.",
  })
  dni!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: "El formato del correo electrónico no es válido." })
  email?: string;
}
