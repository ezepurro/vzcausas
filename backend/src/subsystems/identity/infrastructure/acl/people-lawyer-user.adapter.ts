import { Injectable } from "@nestjs/common";
import { LawyerUserPort } from "@subsystems/people/core/domain/ports/lawyer-user.port";
import { UnlinkLawyerUserUseCase } from "../../core/application/use-cases/unlink-lawyer-user.use-case";

/**
 * Implements the {@link LawyerUserPort} that `people` declares, so giving a lawyer de baja
 * (HU15, D-133) can take the profile away from their user without `people` knowing what a user,
 * a role or a session is. What losing the profile means is `identity`'s rule: this only
 * translates the port into its use case.
 */
@Injectable()
export class PeopleLawyerUserAdapter implements LawyerUserPort {
  constructor(private readonly unlinkLawyerUser: UnlinkLawyerUserUseCase) {}

  unlinkLawyer(lawyerId: number): Promise<void> {
    return this.unlinkLawyerUser.execute({ lawyerId });
  }
}
