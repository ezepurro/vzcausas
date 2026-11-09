import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body of `DELETE /cases/{caseId}` (HU21, contract V5 §3.7): the "Motivo
 * (opcional)" of the form. The body itself is optional (CA-21.2). Any other
 * field is refused by the global pipe with "No es un campo admitido.".
 *
 * The length is checked here with the contract's text and again in
 * `CaseDeactivation`, which measures it once trimmed.
 */
export class DeactivateCaseRequestDto {
  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  @MaxLength(500, { message: 'Debe tener hasta 500 caracteres.' })
  reason?: string | null;
}
