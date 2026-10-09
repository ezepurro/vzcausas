import { PaginationQueryDto } from '@shared/infrastructure/http/pagination';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { JurisdictionCode } from '../../../core/domain/value-objects/jurisdiction-code';

/** Query strings carry `"true"` / `"false"`, not booleans. Absent stays absent. */
const toBoolean = ({ value }: { value: unknown }): boolean | undefined =>
  value === undefined ? undefined : value === true || value === 'true';

/**
 * Query parameters of `GET /cases` (§3.7). `page`, `limit` and `search` come
 * from {@link PaginationQueryDto}, which already carries the contract's
 * defaults and bounds.
 *
 * `responsibleLawyerId`, `clientId` and `proceduralStateId` are only checked
 * to be integers: whether such a lawyer, client or state exists is **not**
 * this endpoint's problem. The contract is explicit that a filter by a
 * nonexistent one yields an empty collection, not a `404` or a `400`.
 * `jurisdiction` is the exception — it is a closed set, so a wrong value is a
 * malformed request.
 */
export class ListCasesQueryDto extends PaginationQueryDto {
  /** Accepts `?jurisdiction=criminal`: the value is normalised before validating. */
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const normalized = value.trim().toUpperCase();
    return normalized === '' ? undefined : normalized;
  })
  @IsEnum(JurisdictionCode, { message: 'No existe un fuero procesal con ese nombre.' })
  jurisdiction?: JurisdictionCode;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Debe ser un número entero.' })
  responsibleLawyerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Debe ser un número entero.' })
  clientId?: number;

  // --- Filtro de estado: los tres de abajo son excluyentes entre sí (CA-20.4).
  // La exclusividad no se puede expresar con class-validator sin un decorador
  // propio, así que la verifica el mapper, que es quien los colapsa en uno solo.

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Debe ser un número entero.' })
  proceduralStateId?: number;

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  @MaxLength(255, { message: 'Debe tener como máximo 255 caracteres.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  customState?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: 'Debe ser true o false.' })
  withoutProceduralActs?: boolean;

  // ---

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: 'Debe ser true o false.' })
  openDeadline?: boolean;
}
