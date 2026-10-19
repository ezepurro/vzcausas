import { Inject, Injectable } from "@nestjs/common";
import {
  LawyerContact,
  LawyerContactLookupPort,
} from "@subsystems/deadlines/core/domain/ports/lawyer-contact-lookup.port";
import { USER_REPOSITORY, UserRepository } from "../../core/domain/ports/user.repository";

/**
 * Anti-corruption adapter: implements `deadlines`' {@link LawyerContactLookupPort}
 * (N-09) by reading `identity`'s own {@link UserRepository} directly —
 * unlike `lawyer-lookup.adapter.ts`, this does not cross into another
 * subsystem, so there is no use case to go through.
 *
 * A lawyer with no linked account, or whose account was deactivated,
 * resolves to `null` — "no copy for this lawyer" (CA-30.5), not an
 * error.
 */
@Injectable()
export class DeadlinesLawyerContactLookupAdapter implements LawyerContactLookupPort {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async findContactByLawyerId(lawyerId: number): Promise<LawyerContact | null> {
    const user = await this.users.findActiveByLawyerId(lawyerId);
    if (!user) {
      return null;
    }

    return {
      fullName: `${user.lastName}, ${user.firstName}`,
      userEmail: user.email.toString(),
    };
  }
}
