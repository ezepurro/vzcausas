import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body of `DELETE /cases/{caseId}/procedural-acts/{actId}` (HU29, contract V6
 * §3.8): the "Motivo de la anulación (opcional)" of the form. The body itself
 * is optional (CA-29.10). Any other field is refused by the global pipe with
 * "No es un campo admitido.".
 *
 * The length is checked here with the contract's text and again in
 * `Deactivation`, which measures it once trimmed.
 */
export class DeactivateProceduralActRequestDto {
  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  @MaxLength(500, { message: 'Debe tener hasta 500 caracteres.' })
  reason?: string | null;
}
