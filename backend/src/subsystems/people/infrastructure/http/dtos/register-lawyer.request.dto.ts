import { IsNotEmpty, IsString, Matches } from "class-validator";

/** Request body of `POST /lawyers` (API contract §3.3). */
export class RegisterLawyerRequestDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @Matches(/^\d+-\d+$/, {
    message: "El formato de la matrícula no es válido.",
  })
  registrationNumber!: string;
}
