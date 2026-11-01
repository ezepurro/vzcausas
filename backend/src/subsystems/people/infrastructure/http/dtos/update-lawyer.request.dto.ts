import { IsString, ValidateIf } from "class-validator";

/** A field sent with a value: `null` passes through, so the domain rejects it as "empty". */
const sentWithValue = (_: unknown, value: unknown) => value !== undefined && value !== null;

/**
 * Request body of `PATCH /lawyers/{lawyerId}` (HU14, contract V5 §3.3).
 *
 * Only the **shape** is checked here: that what came is text. Whether a field
 * is empty, too long, carries "Dr." or breaks the registration number format
 * is decided by `Lawyer.update`, so every problem comes back in one `400`
 * (CA-14.4). `null` is let through on purpose: to the domain it is an attempt
 * to empty the field, with the same message as an empty string.
 *
 * `activeCases` is not declared: the global pipe rejects any field the DTO does
 * not declare (`forbidNonWhitelisted`) with "No es un campo admitido."
 * (CA-14.10).
 */
export class UpdateLawyerRequestDto {
  @ValidateIf(sentWithValue)
  @IsString({ message: "Debe ser un texto." })
  lastName?: string | null;

  @ValidateIf(sentWithValue)
  @IsString({ message: "Debe ser un texto." })
  firstName?: string | null;

  @ValidateIf(sentWithValue)
  @IsString({ message: "Debe ser un texto." })
  registrationNumber?: string | null;
}
