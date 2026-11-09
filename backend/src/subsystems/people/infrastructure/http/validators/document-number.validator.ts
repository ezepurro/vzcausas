import {
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from "class-validator";
import {
  DOCUMENT_NUMBER_FORMATS,
  isDocumentType,
} from "../../../core/domain/value-objects/client-document.vo";

/**
 * Validates a document number against the format of the type sent next to it
 * (D-108): digits for a DNI, capitals and digits for a passport.
 *
 * The number is rejected as typed, never normalized at the edge: accepting two
 * spellings of one document (`34.812.905` and `34812905`) would make the
 * uniqueness rule depend on how the caller typed it.
 *
 * When the type itself is invalid there is nothing to check the number
 * against, so this passes and leaves the error to the type's own validator.
 */
export function IsDocumentNumberOf(
  typeProperty: string,
  options?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: "isDocumentNumberOf",
      target: target.constructor,
      propertyName: propertyName as string,
      constraints: [typeProperty],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const type = (args.object as Record<string, unknown>)[
            args.constraints[0] as string
          ];
          if (!isDocumentType(type)) {
            return true;
          }
          return (
            typeof value === "string" &&
            DOCUMENT_NUMBER_FORMATS[type].pattern.test(value)
          );
        },
        defaultMessage(args: ValidationArguments) {
          const type = (args.object as Record<string, unknown>)[
            args.constraints[0] as string
          ];
          return isDocumentType(type)
            ? DOCUMENT_NUMBER_FORMATS[type].message
            : "El número de documento no es válido.";
        },
      },
    });
  };
}
