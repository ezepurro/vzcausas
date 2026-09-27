import { PaginationQueryDto } from '../../../../../common/pagination/query-pagination.dto';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';
import { Jurisdiction } from '@subsystems/legal-parameters/core/domain/entities/jurisdiction';

export class getStatesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const limpio = value.trim().toUpperCase();
    return limpio === '' ? undefined : limpio; // vacío = "sin filtro"
  })
  @IsEnum(Jurisdiction, {
    message: `jurisdiction must be: ${Object.values(Jurisdiction).join(', ')}`,
  })
  jurisdiction?: Jurisdiction;
}
