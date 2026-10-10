import { PaginationQueryDto } from '../../../../../common/pagination/query-pagination.dto';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class getQualificationsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  @MaxLength(100, { message: 'Debe tener como máximo 100 caracteres.' })
  @Transform(({ value }) => value?.trim())
  search?: string;
}
