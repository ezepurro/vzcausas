import { DefaultedPaginationQueryDto } from '@shared/infrastructure/http/pagination/defaulted-pagination-query.dto';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';
import { JurisdictionCode } from '@subsystems/legal-parameters/core/domain/value-objects/jurisdiction-code';

export class getStatesQueryDto extends DefaultedPaginationQueryDto {
  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  @MaxLength(100, { message: 'Debe tener como máximo 100 caracteres.' })
  @Transform(({ value }) => value?.trim())
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const limpio = value.trim().toUpperCase();
    return limpio === '' ? undefined : limpio; // vacío = "sin filtro"
  })
  @IsEnum(JurisdictionCode, {
    message: 'No existe un fuero procesal con ese nombre.',
  })
  jurisdiction?: JurisdictionCode;
}
