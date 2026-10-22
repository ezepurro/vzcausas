import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString } from 'class-validator';

/**
 * Request body of `POST /cases/{caseId}/prescription` (HU33, API contract V4 §3.7).
 *
 * Only the types are checked here. Whether each field is present, the lengths
 * and "not after today" are the domain's (`PrescriptionDeclaration`), so the
 * answer carries the contract's own texts and every wrong field at once — and
 * so the business rules (422) run before the data ones, as the contract orders.
 */
export class DeclarePrescriptionRequestDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Debe ser una fecha válida (AAAA-MM-DD).' })
  prescriptionDate?: Date;

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  resolution?: string;

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  grounds?: string | null;
}
