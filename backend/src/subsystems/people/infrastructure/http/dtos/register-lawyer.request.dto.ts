import { IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";

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

  @IsString()
  @Matches(/^\d+-\d+$/, {
    message: "El formato de la matrícula no es válido.",
  })
  registrationNumber!: string;
}
