import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@shared/infrastructure/http/pagination';

/**
 * Query of `GET /document-templates` (HU35): pagination plus the two filters.
 *
 * `jurisdiction` is only upper-cased here: whether it names a jurisdiction is
 * checked by the use case, because the contract answers a wrong one with
 * `INVALID_REQUEST`, a code the validation pipe does not produce.
 */
export class ListDocumentTemplatesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const normalized = value.trim().toUpperCase();
    return normalized === '' ? undefined : normalized;
  })
  @IsString()
  jurisdiction?: string;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean({ message: 'Debe ser true o false.' })
  copyToNewCases?: boolean;
}
