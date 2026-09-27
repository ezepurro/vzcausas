// common/dto/pagination-query.dto.ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Debe ser un número entero mayor o igual a 1.' })
  @Min(1, { message: 'Debe ser un número entero mayor o igual a 1.' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Debe ser un número entero entre 1 y 100.' })
  @Min(1, { message: 'Debe ser un número entero entre 1 y 100.' })
  @Max(100, { message: 'Debe ser un número entero entre 1 y 100.' }) // evita que alguien pida 1.000.000 de registros
  limit: number = 20;
}
