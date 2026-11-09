import { DefaultedPaginationQueryDto } from '@shared/infrastructure/http/pagination/defaulted-pagination-query.dto';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class getQualificationsQueryDto extends DefaultedPaginationQueryDto {
  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  @MaxLength(100, { message: 'Debe tener como máximo 100 caracteres.' })
  @Transform(({ value }) => value?.trim())
  search?: string;
}
