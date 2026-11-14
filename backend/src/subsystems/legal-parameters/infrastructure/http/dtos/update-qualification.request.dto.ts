import { Transform, Type } from 'class-transformer';
import { ValidateIf } from 'class-validator';
import { IsPrescriptionMonths, IsQualificationName } from '../validators/qualification-fields.validator';

/**
 * Body of `PATCH /legal-qualifications/{qualificationId}` (HU49, contract §3.5).
 *
 * Every field is optional, but at least one must be sent: `UpdateLegalQualification`
 * enforces that, not this DTO (CA-49.1). `@ValidateIf` instead of `@IsOptional()`,
 * as in `UpdateProceduralStateRequestDto`: an absent field means "leave as is",
 * an explicit `null` is rejected.
 *
 * `activeCases` and `active` are not declared on purpose: the global pipe
 * (`forbidNonWhitelisted`) answers "No es un campo admitido." for them, which is
 * what CA-49.5 (the count is not modified) and CA-50.1 (no reactivation through
 * the API) need.
 */
export class UpdateQualificationRequestDto {
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsQualificationName()
  name?: string;

  /** Total months, as in the alta, which also coerces with `@Type` (CA-49.3). */
  @ValidateIf((_, value) => value !== undefined)
  @Type(() => Number)
  @IsPrescriptionMonths()
  prescriptionMonths?: number;
}
