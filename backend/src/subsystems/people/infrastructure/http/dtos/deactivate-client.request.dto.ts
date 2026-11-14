import { IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Body of `DELETE /clients/{clientId}` (HU11, contract V6 §3.6): the "Motivo
 * (opcional)" of the "Eliminar cliente" form. The body itself is optional
 * (CA-11.7). Any other field is refused by the global pipe with "No es un
 * campo admitido.".
 *
 * The length is checked here with the contract's text and again in
 * `ClientDeactivation`, which measures it once trimmed.
 */
export class DeactivateClientRequestDto {
  @IsOptional()
  @IsString({ message: "Debe ser un texto." })
  @MaxLength(500, { message: "Debe tener hasta 500 caracteres." })
  reason?: string | null;
}
