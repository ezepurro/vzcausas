import { ValidationOptions, registerDecorator } from 'class-validator';
import { QUALIFICATION_NAME_MAX_LENGTH } from '@subsystems/legal-parameters/core/domain/entities/legal-qualification';

/**
 * Validators of the fields of `PATCH /legal-qualifications/{qualificationId}`
 * (HU49, contract §3.5).
 *
 * **One validator per field, on purpose.** The global pipe joins every message
 * that fails on a field (`app.setup.ts`, `flatten`), so stacking `@IsString`,
 * `@IsNotEmpty` and `@MaxLength` made a `null` name report "Debe ser un texto.
 * No puede estar vacío.", and `@IsInt` plus `@Min` repeated the same sentence
 * twice. Here each failing input gets exactly one message, the contract's.
 * Same reasoning as `people/infrastructure/http/validators/required-text.validator.ts`,
 * which is not imported: it belongs to another subsystem's infrastructure.
 */

const NAME_MESSAGES = {
  /** Contract §3.5, `PATCH` example (`API_CONTRACT_V6.md:2867`). */
  empty: 'No puede estar vacío.',
  /** Same text as the alta (`register-qualification.request.dto.ts`). */
  notText: 'Debe ser un texto.',
  tooLong: `Debe tener como máximo ${QUALIFICATION_NAME_MAX_LENGTH} caracteres.`,
} as const;

/** Contract §3.5 (`API_CONTRACT_V6.md:2628`), the same text as the alta. */
const PRESCRIPTION_MONTHS_MESSAGE = 'Debe ser un número entero mayor o igual a 1.';

/**
 * A denomination sent to be changed: text, not blank, at most 255 characters.
 * `null` counts as empty, which is what the contract answers for it. Expects
 * the value already trimmed by the DTO's `@Transform`.
 */
export function IsQualificationName(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isQualificationName',
      target: target.constructor,
      propertyName: propertyName as string,
      options,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && value.trim() !== '' && value.length <= QUALIFICATION_NAME_MAX_LENGTH;
        },
        defaultMessage(args) {
          const value: unknown = args?.value;
          if (value === null || (typeof value === 'string' && value.trim() === '')) {
            return NAME_MESSAGES.empty;
          }
          return typeof value === 'string' ? NAME_MESSAGES.tooLong : NAME_MESSAGES.notText;
        },
      },
    });
  };
}

/**
 * A prescription term in total months: an integer ≥ 1 (CA-49.3). The years
 * plus 0–11 months of the prototype are composed by the client.
 */
export function IsPrescriptionMonths(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isPrescriptionMonths',
      target: target.constructor,
      propertyName: propertyName as string,
      options,
      validator: {
        validate(value: unknown) {
          return typeof value === 'number' && Number.isInteger(value) && value >= 1;
        },
        defaultMessage() {
          return PRESCRIPTION_MONTHS_MESSAGE;
        },
      },
    });
  };
}
