import { validate } from "class-validator";
import { IsRequiredText } from "./required-text.validator";

class Sample {
  @IsRequiredText(10, { required: "Es obligatoria.", tooLong: "Es muy larga." })
  address?: unknown;
}

async function messagesFor(value: unknown): Promise<string[]> {
  const sample = new Sample();
  if (value !== undefined) sample.address = value;
  const errors = await validate(sample);
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

/* D-109: un solo mensaje por entrada inválida. El pipe global une todos los que fallan. */
describe("IsRequiredText", () => {
  it("accepts a text within the limit", async () => {
    expect(await messagesFor("Calle 1")).toEqual([]);
    expect(await messagesFor("1234567890")).toEqual([]);
  });

  it.each([
    ["missing", undefined],
    ["null", null],
    ["empty", ""],
    ["blank", "   "],
    ["not a text", 42],
  ])("reports exactly one 'required' message when it is %s", async (_case, value) => {
    expect(await messagesFor(value)).toEqual(["Es obligatoria."]);
  });

  it("reports exactly one 'too long' message above the limit", async () => {
    expect(await messagesFor("12345678901")).toEqual(["Es muy larga."]);
  });
});
