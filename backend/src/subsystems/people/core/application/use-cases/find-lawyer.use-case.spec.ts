import { Lawyer } from "../../domain/entities/lawyer.entity";
import { RegistrationNumber } from "../../domain/value-objects/registration-number.vo";
import { FindLawyerUseCase } from "./find-lawyer.use-case";
import { FakeLawyerRepository } from "./test-support/people-fakes";

describe("FindLawyerUseCase", () => {
  function build() {
    const lawyers = new FakeLawyerRepository();
    return { useCase: new FindLawyerUseCase(lawyers), lawyers };
  }

  async function seed(
    lawyers: FakeLawyerRepository,
    active = true,
  ): Promise<void> {
    await lawyers.create(
      Lawyer.create({
        id: 4,
        fullName: "Dr. Ignacio Peralta",
        registrationNumber: RegistrationNumber.create("1-35207"),
        active,
      }),
    );
  }

  it("returns a plain view of the lawyer, not the entity", async () => {
    const { useCase, lawyers } = build();
    await seed(lawyers);

    const result = await useCase.execute({ id: 4 });

    expect(result).toEqual({
      id: 4,
      fullName: "Dr. Ignacio Peralta",
      registrationNumber: "1-35207",
      active: true,
    });
    expect(result).not.toBeInstanceOf(Lawyer);
  });

  it("returns null when the lawyer does not exist", async () => {
    const { useCase } = build();

    await expect(useCase.execute({ id: 999 })).resolves.toBeNull();
  });

  it("reports a deactivated lawyer with active: false", async () => {
    const { useCase, lawyers } = build();
    await seed(lawyers, false);

    const result = await useCase.execute({ id: 4 });

    expect(result?.active).toBe(false);
  });
});
