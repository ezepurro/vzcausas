import { InvalidJurisdictionFilterError } from '../../domain/errors/case.errors';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code';

/**
 * The `jurisdiction` query parameter of `GET /cases` and `GET /cases/custom-states`
 * into a {@link JurisdictionCode}, or `undefined` when it was not sent or is empty.
 * Accepts any case (`?jurisdiction=criminal`).
 *
 * A value that names no jurisdiction is `400 INVALID_REQUEST` (catalog §5.3,
 * "parámetro de consulta con un valor inexistente"), not the pipe's generic
 * `VALIDATION_ERROR`. That is why it arrives as a plain string and is checked
 * here instead of with `@IsEnum` on the DTO.
 */
export function toJurisdictionFilter(raw: string | undefined): JurisdictionCode | undefined {
  if (raw === undefined) {
    return undefined;
  }

  const normalized = raw.trim().toUpperCase();
  if (normalized === '') {
    return undefined;
  }

  const codes = Object.values(JurisdictionCode) as string[];
  if (!codes.includes(normalized)) {
    throw new InvalidJurisdictionFilterError();
  }

  return normalized as JurisdictionCode;
}
