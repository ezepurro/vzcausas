import { Injectable } from "@nestjs/common";
import { FindLawyerUseCase } from "@subsystems/people/core/application/use-cases/find-lawyer.use-case";
import { FindLawyersUseCase } from "@subsystems/people/core/application/use-cases/find-lawyers.use-case";
import { RegisterLawyerUseCase } from "@subsystems/people/core/application/use-cases/register-lawyer.use-case";
import {
  LawyerLookupPort,
  LawyerSummary,
} from "../../core/domain/ports/lawyer-lookup.port";
import {
  LawyerRegistrarPort,
  NewLawyer,
} from "../../core/domain/ports/lawyer-registrar.port";

/**
 * Anti-corruption adapter: implements `identity`'s
 * {@link LawyerLookupPort} by calling `people`'s `FindLawyer` use
 * case (HU-12 replaced the stub that stood here while `people` did
 * not exist).
 *
 * This is the only file in `identity` that knows anything about
 * `people`. It depends on an exported **use case**, never on that
 * subsystem's repository or entity, and it translates the answer
 * into `identity`'s own vocabulary — a plain boolean, because that
 * is all `RegisterUser`/`UpdateUser` ever need to know.
 *
 * A deactivated lawyer counts as "does not exist": the professional
 * record is logically deleted (RN12), so a new user must not be
 * linked to it.
 */
@Injectable()
export class PeopleLawyerLookupAdapter
  implements LawyerLookupPort, LawyerRegistrarPort
{
  constructor(
    private readonly findLawyer: FindLawyerUseCase,
    private readonly findLawyers: FindLawyersUseCase,
    private readonly registerLawyer: RegisterLawyerUseCase,
  ) {}

  /**
   * Creates the lawyer through `people`'s own use case, so the
   * matrícula's format and uniqueness are enforced by the subsystem
   * that owns them rather than re-checked here.
   *
   * `people`'s error is not caught: a duplicate registration number
   * has to reach the client with the same code `POST /lawyers`
   * returns, and swallowing it into an `identity` error would make
   * the frontend handle the same failure two different ways.
   */
  async register(lawyer: NewLawyer): Promise<LawyerSummary> {
    const { lawyer: created } = await this.registerLawyer.execute({
      fullName: lawyer.fullName,
      registrationNumber: lawyer.registrationNumber,
    });

    return {
      id: created.id,
      fullName: created.fullName,
      registrationNumber: created.registrationNumber.toString(),
    };
  }

  async existsById(lawyerId: number): Promise<boolean> {
    const lawyer = await this.findLawyer.execute({ id: lawyerId });
    return lawyer !== null && lawyer.active;
  }

  /**
   * Deactivated lawyers are dropped here too, for the same reason
   * {@link existsById} treats them as absent: the professional record
   * is logically deleted (RN12), so a user should not render a link
   * to it. That user's `lawyer` comes back `null`.
   *
   * Duplicate ids in the input are harmless — the result is a map, so
   * a lawyer shared by two users is fetched and stored once.
   */
  async findSummaries(
    lawyerIds: readonly number[],
  ): Promise<Map<number, LawyerSummary>> {
    const lawyers = await this.findLawyers.execute({ ids: lawyerIds });

    return new Map(
      lawyers
        .filter((lawyer) => lawyer.active)
        .map((lawyer) => [
          lawyer.id,
          {
            id: lawyer.id,
            fullName: lawyer.fullName,
            registrationNumber: lawyer.registrationNumber,
          },
        ]),
    );
  }
}
