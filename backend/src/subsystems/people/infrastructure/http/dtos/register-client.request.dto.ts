import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import { DOCUMENT_TYPES } from "../../../core/domain/value-objects/client-document.vo";
import { IsDocumentNumberOf } from "../validators/document-number.validator";

/**
 * Request body of `POST /clients` (API contract §3.6).
 *
 * Deliberately has **no `clientSince`**: the system assigns it and
 * does not offer it for editing (CA-8.7). The global `ValidationPipe`
 * runs with `forbidNonWhitelisted`, so sending it is rejected rather
 * than ignored.
 *
 * Surname and given names stay separate (CA-8.2) — composing
 * `GÓMEZ, Ariel Fernando` is the interface's job.
 */
export class RegisterClientRequestDto {
  @IsString()
  @IsNotEmpty({ message: "El apellido es obligatorio." })
  @MaxLength(100)
  lastName!: string;

  @IsString()
  @IsNotEmpty({ message: "Los nombres son obligatorios." })
  @MaxLength(100)
  firstName!: string;

  /** `DNI` or `PASSPORT` (D-108). */
  @IsIn(DOCUMENT_TYPES, { message: "Debe ser DNI o PASSPORT." })
  documentType!: string;

  /**
   * With the format of its type: digits for a DNI, capitals and digits for a
   * passport. The dots in `34.812.905` are presentation, so they are rejected
   * here rather than silently stripped: accepting two spellings of one
   * document at the edge would make the uniqueness rule depend on how the
   * caller typed it.
   */
  @IsDocumentNumberOf("documentType")
  documentNumber!: string;

  /** Required (D-109). A blank one is rejected like an empty one. */
  @IsString({ message: "La dirección es obligatoria." })
  @Matches(/\S/, { message: "La dirección es obligatoria." })
  @MaxLength(255, { message: "La dirección no puede superar los 255 caracteres." })
  address!: string;

  /** Required (D-109). A blank one is rejected like an empty one. */
  @IsString({ message: "El teléfono es obligatorio." })
  @Matches(/\S/, { message: "El teléfono es obligatorio." })
  @MaxLength(50, { message: "El teléfono no puede superar los 50 caracteres." })
  phone!: string;

  @IsOptional()
  @IsEmail({}, { message: "El formato del correo electrónico no es válido." })
  email?: string;
}
