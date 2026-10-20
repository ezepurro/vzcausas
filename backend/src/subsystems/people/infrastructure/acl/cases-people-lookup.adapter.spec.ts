import { Lawyer } from "../../core/domain/entities/lawyer.entity";
import { RegistrationNumber } from "../../core/domain/value-objects/registration-number.vo";
import {
  FakeClientRepository,
  FakeLawyerRepository,
} from "../../core/application/use-cases/test-support/people-fakes";
import { CasesPeopleLookupAdapter } from "./cases-people-lookup.adapter";

describe("CasesPeopleLookupAdapter · abogados", () => {
  function build() {
    const lawyers = new FakeLawyerRepository();
    const adapter = new CasesPeopleLookupAdapter(lawyers, new FakeClientRepository());
    return { lawyers, adapter };
  }

  async function aLawyer(lawyers: FakeLawyerRepository, active: boolean): Promise<Lawyer> {
    const lawyer = Lawyer.create({
      id: 7,
      lastName: "Ríos",
      firstName: "Malena",
      registrationNumber: RegistrationNumber.create("1-35207"),
    });
    if (!active) {
      lawyer.deactivate();
    }
    await lawyers.create(lawyer);
    return lawyer;
  }

  it("findLawyerById devuelve el abogado vigente", async () => {
    const { lawyers, adapter } = build();
    await aLawyer(lawyers, true);

    expect(await adapter.findLawyerById(7)).toEqual({
      id: 7,
      lastName: "Ríos",
      firstName: "Malena",
      registrationNumber: "1-35207",
    });
  });

  it("findLawyerById devuelve también al abogado dado de baja, porque la causa lo sigue mostrando (RN12)", async () => {
    const { lawyers, adapter } = build();
    await aLawyer(lawyers, false);

    expect(await adapter.findLawyerById(7)).toMatchObject({ id: 7, lastName: "Ríos" });
  });

  it("findLawyerById devuelve null si el abogado no existe", async () => {
    expect(await build().adapter.findLawyerById(999)).toBeNull();
  });

  it("findActiveLawyerById sigue tratando al abogado dado de baja como inexistente", async () => {
    const { lawyers, adapter } = build();
    await aLawyer(lawyers, false);

    expect(await adapter.findActiveLawyerById(7)).toBeNull();
  });
});
