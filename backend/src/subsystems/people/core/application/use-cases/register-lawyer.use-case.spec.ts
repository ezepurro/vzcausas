import { ValidationError } from "@shared/domain/domain-error";
import { LawyerRegistrationAlreadyExistsError } from "../../domain/errors/people.errors";
import { RegisterLawyerUseCase } from "./register-lawyer.use-case";
import { FakeLawyerRepository } from "./test-support/people-fakes";

describe("RegisterLawyerUseCase", () => {
  const baseCommand = {
    fullName: "Dr. Ignacio Peralta",
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
    expect(result.lawyer.fullName).toBe("Dr. Ignacio Peralta");
    expect(result.lawyer.registrationNumber.toString()).toBe("1-35207");
    expect(result.lawyer.isActive()).toBe(true);
    expect(lawyers.byId.size).toBe(1);
  });

  it("rejects a duplicate registration number", async () => {
    const { useCase } = build();
    await useCase.execute(baseCommand);

    await expect(
      useCase.execute({ ...baseCommand, fullName: "Otro Nombre" }),
    ).rejects.toBeInstanceOf(LawyerRegistrationAlreadyExistsError);
  });

  it("rejects a malformed registration number", async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({ ...baseCommand, registrationNumber: "28114" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects an empty full name", async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({ ...baseCommand, fullName: "   " }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("trims surrounding whitespace before storing", async () => {
    const { useCase } = build();

    const result = await useCase.execute({
      fullName: "  Dra. Ana Gómez  ",
      registrationNumber: "  2-12345  ",
    });

    expect(result.lawyer.fullName).toBe("Dra. Ana Gómez");
    expect(result.lawyer.registrationNumber.toString()).toBe("2-12345");
  });
});
