import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsString, Min, ValidateIf } from 'class-validator';
import { DayType } from '@subsystems/legal-parameters/core/domain/entities/day-types';
import { JurisdictionCode } from '@subsystems/legal-parameters/core/domain/value-objects/jurisdiction-code';

/**
 * Request body of `POST /procedural-states` (HU45, contract
 * `ProceduralStateCreate`).
 *
 * The optional fields use `@ValidateIf(value !== undefined)` instead of
 * `@IsOptional()`: the latter also lets `null` through, and none of these
 * fields is nullable in the contract. This way an absent field takes the
 * contract's default (applied in `ProceduralStateHttpMapper`) and an
 * explicit `null` is rejected with a 400 on that field.
 *
 * Only the shape is checked here. Business rules (unique name, "Iniciada"
 * reserved, `timeLimitDays` ⇔ `dayType` coherence) belong to the domain.
 */
export class RegisterProceduralStateRequestDto {
  // Trimmed first so a name made only of spaces fails `@IsNotEmpty`.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Debe ser un texto.' })
  @IsNotEmpty({ message: 'La denominación es obligatoria.' })
  name!: string;

  @IsEnum(JurisdictionCode, { message: 'No existe un fuero procesal con ese nombre.' })
  jurisdiction!: JurisdictionCode;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt({ message: 'Debe ser un entero mayor o igual a 0.' })
  @Min(0, { message: 'Debe ser un entero mayor o igual a 0.' })
  timeLimitDays?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(DayType, { message: 'Debe ser BUSINESS, CONSECUTIVE o NONE.' })
  dayType?: DayType;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean({ message: 'Debe ser verdadero o falso.' })
  terminal?: boolean;
}
