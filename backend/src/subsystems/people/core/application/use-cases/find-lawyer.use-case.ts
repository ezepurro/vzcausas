import { Inject, Injectable } from "@nestjs/common";
import {
  LAWYER_REPOSITORY,
  LawyerRepository,
} from "../../domain/ports/lawyer.repository";

export type FindLawyerQuery = { id: number };

/**
 * What `people` hands to the outside world when asked about a
 * lawyer. Deliberately a plain object, **not** the {@link Lawyer}
 * entity: §6.3 of the architecture states that a subsystem exposes
 * use cases only — never repositories or entities — so another
 * subsystem can never end up depending on our internals.
 */
export type LawyerView = {
  id: number;
  fullName: string;
  registrationNumber: string;
  active: boolean;
};

/**
 * Reads a single lawyer. Exported by `PeopleModule` so `identity`'s
 * anti-corruption adapter can resolve a `lawyerId` when registering
 * or updating a user with the LAWYER role.
 *
 * Returns `null` rather than throwing: "this lawyer does not exist"
 * is a legitimate answer to a lookup, and the meaning of that answer
 * (a 422 when registering a user, say) belongs to whoever asked, not
 * here.
 */
@Injectable()
export class FindLawyerUseCase {
  constructor(
    @Inject(LAWYER_REPOSITORY) private readonly lawyers: LawyerRepository,
  ) {}

  async execute(query: FindLawyerQuery): Promise<LawyerView | null> {
    const lawyer = await this.lawyers.findById(query.id);
    if (!lawyer) {
      return null;
    }

    return {
      id: lawyer.id,
      fullName: lawyer.fullName,
      registrationNumber: lawyer.registrationNumber.toString(),
      active: lawyer.isActive(),
    };
  }
}
