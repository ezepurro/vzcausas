import { Transform } from 'class-transformer';
import { Allow, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsString, Min, ValidateIf } from 'class-validator';
import { DayType } from '@subsystems/legal-parameters/core/domain/entities/day-types';

/**
 * Request body of `PATCH /procedural-states/{stateId}` (HU17, contract
 * `ProceduralStateUpdate`). Every field is optional, but at least one must
 * be sent: `UpdateProceduralState` enforces that, not this DTO.
 *
 * Same `@ValidateIf` instead of `@IsOptional()` as in
 * `RegisterProceduralStateRequestDto`: an absent field means "leave as is",
 * an explicit `null` is rejected.
 */
export class UpdateProceduralStateRequestDto {
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Debe ser un texto.' })
  @IsNotEmpty({ message: 'La denominación es obligatoria.' })
  name?: string;

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

  /**
   * Not modifiable (contract V3, D-36), yet declared on purpose. Without it,
   * `forbidNonWhitelisted` would answer "property should not exist"; the
   * contract asks for its own message instead, which
   * `ProceduralStateHttpMapper.toUpdateCommand` raises whenever this field
   * arrives, whatever its value. `@Allow()` only whitelists it.
   */
  @Allow()
  jurisdiction?: unknown;
}
