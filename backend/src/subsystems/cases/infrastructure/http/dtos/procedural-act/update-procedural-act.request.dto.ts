import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * Request body of `PATCH /cases/{caseId}/procedural-acts/{actId}` (HU28, API
 * contract V5 §3.8): the fields of the registration, all optional.
 *
 * Only the shape and the types are checked here, with the registration's
 * messages. `null` is let through on purpose: where the contract allows it, it
 * empties the field; on the others the domain refuses it. Whether at least one
 * field came, and every rule of the act as it would end up, are the domain's
 * (`Case.planActModification`), which reports them all at once. A field the DTO
 * does not declare is refused by the global pipe ("No es un campo admitido.").
 */
export class UpdateProceduralActRequestDto {
  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  proceduralStateId?: number | null;

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  customState?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Debe ser una fecha válida (AAAA-MM-DD).' })
  actDate?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Debe ser una fecha válida (AAAA-MM-DD).' })
  notificationDate?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Debe ser una fecha válida (AAAA-MM-DD).' })
  manualDueDate?: Date | null;

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  notes?: string | null;
}
