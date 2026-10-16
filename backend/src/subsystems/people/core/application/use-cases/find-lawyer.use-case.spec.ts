import { Lawyer } from "../../domain/entities/lawyer.entity";
import { RegistrationNumber } from "../../domain/value-objects/registration-number.vo";
import { FindLawyerUseCase } from "./find-lawyer.use-case";
import {
  FakeActiveCasesCounter,
  FakeLawyerRepository,
} from "./test-support/people-fakes";

describe("FindLawyerUseCase", () => {
  function build() {
    const lawyers = new FakeLawyerRepository();
    const counter = new FakeActiveCasesCounter();
    return {
      useCase: new FindLawyerUseCase(lawyers, counter),
      lawyers,
      counter,
    };
  }

  async function seed(
    lawyers: FakeLawyerRepository,
    active = true,
  ): Promise<void> {
    await lawyers.create(
      Lawyer.create({
        id: 4,
        lastName: "Peralta",
        firstName: "Ignacio",
        registrationNumber: RegistrationNumber.create("1-35207"),
        active,
      }),
    );
  }

  it("returns a plain view of the lawyer, not the entity", async () => {
    const { useCase, lawyers, counter } = build();
    await seed(lawyers);
    counter.counts.set(4, 7);

    const result = await useCase.execute({ id: 4 });

    expect(result).toEqual({
      id: 4,
      lastName: "Peralta",
      firstName: "Ignacio",
      registrationNumber: "1-35207",
      activeCases: 7,
      active: true,
    });
    expect(result).not.toBeInstanceOf(Lawyer);
  });

  it("asks `cases` for the workload of that lawyer only, in one call", async () => {
    const { useCase, lawyers, counter } = build();
    await seed(lawyers);

    await useCase.execute({ id: 4 });

    expect(counter.calls).toEqual([[4]]);
  });

  it("reports 0 active cases when the lawyer has none", async () => {
    const { useCase, lawyers } = build();
    await seed(lawyers);

    // The port promises every requested id comes back; the use case must not
    // turn a missing key into `undefined` in the payload.
    expect((await useCase.execute({ id: 4 }))?.activeCases).toBe(0);
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
