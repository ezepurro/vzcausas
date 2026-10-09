import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { QUALIFICATION_NAME_MAX_LENGTH } from '@subsystems/legal-parameters/core/domain/entities/legal-qualification';

/**
 * Body of `POST /legal-qualifications` (contract §3.5).
 *
 * Both fields are required (CA-48.5). `name` carries the offence and
 * its article together; it is not split in two because the listing's
 * search filters by either (CA-48.2).
 */
export class RegisterQualificationRequestDto {
  @IsString({ message: 'Debe ser un texto.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Es un campo obligatorio.' })
  @MaxLength(QUALIFICATION_NAME_MAX_LENGTH, {
    message: `Debe tener como máximo ${QUALIFICATION_NAME_MAX_LENGTH} caracteres.`,
  })
  name!: string;

  /**
   * The **total** in months (CA-48.3). The prototype's "years plus
   * months" pair is composed by the client; the API never sees the two
   * halves, so there is nothing here to add up.
   */
  @Type(() => Number)
  @IsInt({ message: 'Debe ser un número entero mayor o igual a 1.' })
  @Min(1, { message: 'Debe ser un número entero mayor o igual a 1.' })
  prescriptionMonths!: number;
}
