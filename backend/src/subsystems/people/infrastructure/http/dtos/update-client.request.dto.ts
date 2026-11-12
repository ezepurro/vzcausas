import { IsEmail, IsIn, IsOptional, IsString, ValidateIf } from "class-validator";
import { DOCUMENT_TYPES } from "../../../core/domain/value-objects/client-document.vo";

/**
 * Request body of `PATCH /clients/{clientId}` (HU10, contract V6 §3.6).
 *
 * Only the **shape** is checked here: that what came is text, and a known
 * document type. Whether a field is empty or too long, and whether the number
 * fits the type that results, is decided by `Client.update`, so every problem
 * comes back in one `400` (CA-10.4) — and the number may be checked against
 * the type the client already had (CA-10.3), which this DTO does not know.
 * `null` is let through on purpose: on `email` it clears it; on the others it
 * is an attempt to empty them, which the domain refuses.
 *
 * Not declared, so the global pipe refuses them with "No es un campo
 * admitido.": `clientSince` (CA-10.8), `active` and anything else.
 */
export class UpdateClientRequestDto {
  /** A field sent with a value: `null` passes through, so the domain rejects it as "empty". */
  static sentWithValue(_: unknown, value: unknown): boolean {
    return value !== undefined && value !== null;
  }

  @ValidateIf(UpdateClientRequestDto.sentWithValue)
  @IsString({ message: "Debe ser un texto." })
  lastName?: string | null;

  @ValidateIf(UpdateClientRequestDto.sentWithValue)
  @IsString({ message: "Debe ser un texto." })
  firstName?: string | null;

  /** `DNI` or `PASSPORT` (D-108). */
  @ValidateIf(UpdateClientRequestDto.sentWithValue)
  @IsIn(DOCUMENT_TYPES, { message: "Debe ser DNI o PASSPORT." })
  documentType?: string | null;

  @ValidateIf(UpdateClientRequestDto.sentWithValue)
  @IsString({ message: "Debe ser un texto." })
  documentNumber?: string | null;

  @ValidateIf(UpdateClientRequestDto.sentWithValue)
  @IsString({ message: "Debe ser un texto." })
  address?: string | null;

  @ValidateIf(UpdateClientRequestDto.sentWithValue)
  @IsString({ message: "Debe ser un texto." })
  phone?: string | null;

  @IsOptional()
  @IsEmail({}, { message: "El formato del correo electrónico no es válido." })
  email?: string | null;
}
