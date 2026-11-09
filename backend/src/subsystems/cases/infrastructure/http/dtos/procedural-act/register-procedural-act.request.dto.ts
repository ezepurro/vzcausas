import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * Request body of `POST /cases/{caseId}/procedural-acts` (API contract §3.8).
 *
 * Only the shape and the types are checked here. Which of the two states may
 * be sent, the lengths and the date rules are checked by the domain, which
 * reports them by field as the contract shows.
 */
export class RegisterProceduralActRequestDto {
  // A state of the table of the jurisdiction. Excludes `customState`.
  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  proceduralStateId?: number | null;

  // A hand-written state, kept only in this case. Excludes `proceduralStateId`.
  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  customState?: string | null;

  @Type(() => Date)
  @IsDate({ message: 'Debe ser una fecha válida (AAAA-MM-DD).' })
  actDate!: Date;

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
