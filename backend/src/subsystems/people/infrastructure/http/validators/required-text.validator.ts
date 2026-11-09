import { ValidationOptions, registerDecorator } from "class-validator";

type RequiredTextMessages = {
  /** The field is missing, not a text, empty or blank. */
  required: string;
  /** The text is longer than `max`. */
  tooLong: string;
};

/**
 * A text that is required and bounded: present, with something other than
 * whitespace, and at most `max` characters (D-109: `address`, `phone`).
 *
 * It is **one** validator on purpose. The global pipe joins every message that
 * fails on a field (`app.setup.ts`, `flatten`), so stacking `@IsString`,
 * `@Matches` and `@MaxLength` made a missing field report the same sentence
 * twice plus a "too long" that did not apply. Here each failing input gets
 * exactly one message.
 */
export function IsRequiredText(
  max: number,
  messages: RequiredTextMessages,
  options?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: "isRequiredText",
      target: target.constructor,
      propertyName: propertyName as string,
      constraints: [max],
      options,
      validator: {
        validate(value: unknown) {
          return typeof value === "string" && value.trim() !== "" && value.length <= max;
        },
        defaultMessage(args) {
          const value = args?.value;
          return typeof value === "string" && value.trim() !== ""
            ? messages.tooLong
            : messages.required;
        },
      },
    });
  };
}
