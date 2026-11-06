import { ValidationError } from "@shared/domain/domain-error";
import { LawyerRegistrationAlreadyExistsError } from "../../domain/errors/people.errors";
import { RegisterLawyerUseCase } from "./register-lawyer.use-case";
import { FakeLawyerRepository } from "./test-support/people-fakes";

describe("RegisterLawyerUseCase", () => {
  const baseCommand = {
    lastName: "Peralta",
    firstName: "Ignacio",
    registrationNumber: "1-35207",
  };

  function build() {
    const lawyers = new FakeLawyerRepository();
    return { useCase: new RegisterLawyerUseCase(lawyers), lawyers };
  }

  it("registers a lawyer and assigns it an id", async () => {
    const { useCase, lawyers } = build();

    const result = await useCase.execute(baseCommand);

    expect(result.lawyer.id).toBe(1);
    expect(result.lawyer.lastName).toBe("Peralta");
    expect(result.lawyer.firstName).toBe("Ignacio");
    expect(result.lawyer.registrationNumber?.toString()).toBe("1-35207");
    expect(result.lawyer.isActive()).toBe(true);
    expect(lawyers.byId.size).toBe(1);
  });

  // D-107 — la matrícula es opcional.
  describe("without a registration number (D-107)", () => {
    it.each([
      ["left out", {}],
      ["null", { registrationNumber: null }],
      ["empty", { registrationNumber: "" }],
      ["blank", { registrationNumber: "   " }],
    ])("registers the lawyer when it is %s", async (_, extra) => {
      const { useCase, lawyers } = build();

      const result = await useCase.execute({ lastName: "Gómez", firstName: "Ana", ...extra });

      expect(result.lawyer.registrationNumber).toBeNull();
      expect(lawyers.byId.size).toBe(1);
    });

    it("lets several lawyers have none, because uniqueness only applies to those that have one", async () => {
      const { useCase, lawyers } = build();

      await useCase.execute({ lastName: "Gómez", firstName: "Ana" });
      await useCase.execute({ lastName: "Ruiz", firstName: "Luis" });

      expect(lawyers.byId.size).toBe(2);
    });
  });

  it("rejects a duplicate registration number", async () => {
    const { useCase } = build();
    await useCase.execute(baseCommand);

    await expect(
      useCase.execute({ ...baseCommand, lastName: "Otro", firstName: "Nombre" }),
    ).rejects.toBeInstanceOf(LawyerRegistrationAlreadyExistsError);
  });

  it("rejects a malformed registration number", async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({ ...baseCommand, registrationNumber: "28114" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects an empty last name", async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({ ...baseCommand, lastName: "   " }),
    ).rejects.toMatchObject({ details: { field: "lastName" } });
  });

  it("rejects empty first names", async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({ ...baseCommand, firstName: "   " }),
    ).rejects.toMatchObject({ details: { field: "firstName" } });
  });

  it("trims surrounding whitespace before storing", async () => {
    const { useCase } = build();

    const result = await useCase.execute({
      lastName: "  Gómez  ",
      firstName: "  Ana  ",
      registrationNumber: "  2-12345  ",
    });

    expect(result.lawyer.lastName).toBe("Gómez");
    expect(result.lawyer.firstName).toBe("Ana");
    expect(result.lawyer.registrationNumber?.toString()).toBe("2-12345");
  });
});
