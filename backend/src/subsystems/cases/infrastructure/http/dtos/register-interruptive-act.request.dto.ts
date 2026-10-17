import { Type } from 'class-transformer';
import { IsDate, IsDefined, IsOptional, IsString } from 'class-validator';

/**
 * Request body of `POST /cases/{caseId}/interruptive-acts` (contract V4 §3.9).
 *
 * Only presence and types are checked here, in Spanish so the `details` the
 * contract shows read right. Lengths and "not after today" are the domain's
 * (`InterruptiveAct.create`), which reports them by field too.
 */
export class RegisterInterruptiveActRequestDto {
  @IsDefined({ message: 'El acto interruptivo es obligatorio.' })
  @IsString({ message: 'Debe ser un texto.' })
  name!: string;

  @IsDefined({ message: 'La fecha del acto es obligatoria.' })
  @Type(() => Date)
  @IsDate({ message: 'Debe ser una fecha válida (AAAA-MM-DD).' })
  actDate!: Date;

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  notes?: string | null;
}
