import { Injectable } from "@nestjs/common";
import { FindLawyerUseCase } from "@subsystems/people/core/application/use-cases/find-lawyer.use-case";
import { LawyerLookupPort } from "../../core/domain/ports/lawyer-lookup.port";

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
export class PeopleLawyerLookupAdapter implements LawyerLookupPort {
  constructor(private readonly findLawyer: FindLawyerUseCase) {}

  async existsById(lawyerId: number): Promise<boolean> {
    const lawyer = await this.findLawyer.execute({ id: lawyerId });
    return lawyer !== null && lawyer.active;
  }
}
