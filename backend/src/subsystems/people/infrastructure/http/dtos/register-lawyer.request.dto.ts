import { IsNotEmpty, IsString, Matches, MaxLength, ValidateIf } from "class-validator";

/** Request body of `POST /lawyers` (API contract §3.3). */
export class RegisterLawyerRequestDto {
  @IsString()
  @IsNotEmpty({ message: "El apellido es obligatorio." })
  @MaxLength(100)
  lastName!: string;

  @IsString()
  @IsNotEmpty({ message: "Los nombres son obligatorios." })
  @MaxLength(100)
  firstName!: string;

  /**
   * Optional (D-107): left out, empty, blank or `null` the lawyer is registered
   * without one. Only a value that is sent is checked against the format.
   */
  @ValidateIf(
    (_: unknown, value: unknown) =>
      typeof value === "string" ? value.trim() !== "" : value !== undefined && value !== null,
  )
  @IsString()
  @Matches(/^\d+-\d+$/, {
    message: "El formato de la matrícula no es válido.",
  })
  registrationNumber?: string | null;
}
