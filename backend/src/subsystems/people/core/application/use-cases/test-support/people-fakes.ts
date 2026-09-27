import { Lawyer } from "../../../domain/entities/lawyer.entity";
import {
  LawyerPage,
  LawyerRepository,
  LawyerSearchCriteria,
} from "../../../domain/ports/lawyer.repository";
import { RegistrationNumber } from "../../../domain/value-objects/registration-number.vo";

/**
 * In-memory {@link LawyerRepository} for `people`'s use-case specs —
 * no NestJS, no database. Mirrors `identity`'s `identity-fakes.ts`.
 */
export class FakeLawyerRepository implements LawyerRepository {
  private nextIdValue = 1;
  readonly byId = new Map<number, Lawyer>();

  async nextId(): Promise<number> {
    return this.nextIdValue++;
  }

  async existsByRegistrationNumber(
    registrationNumber: RegistrationNumber,
  ): Promise<boolean> {
    return [...this.byId.values()].some((lawyer) =>
      lawyer.registrationNumber.equals(registrationNumber),
    );
  }

  async create(lawyer: Lawyer): Promise<void> {
    this.byId.set(lawyer.id, lawyer);
  }

  async findById(id: number): Promise<Lawyer | null> {
    return this.byId.get(id) ?? null;
  }

  /**
   * Mirrors what `PrismaLawyerRepository.search` does in SQL: only
   * active lawyers, newest first, case-insensitive match on full name
   * or registration number, then the page slice. Kept faithful on
   * purpose — a fake that filtered differently would let a spec pass
   * against behaviour production does not have.
   */
  async findByIds(ids: readonly number[]): Promise<Lawyer[]> {
    return ids
      .map((id) => this.byId.get(id))
      .filter((lawyer): lawyer is Lawyer => lawyer !== undefined);
  }

  async search(criteria: LawyerSearchCriteria): Promise<LawyerPage> {
    const needle = criteria.search?.toLowerCase();

    const matches = [...this.byId.values()]
      .filter((lawyer) => lawyer.isActive())
      .filter(
        (lawyer) =>
          needle === undefined ||
          lawyer.fullName.toLowerCase().includes(needle) ||
          lawyer.registrationNumber.toString().toLowerCase().includes(needle),
      )
      .sort((a, b) => b.id - a.id);

    const offset = (criteria.page - 1) * criteria.limit;

    return {
      items: matches.slice(offset, offset + criteria.limit),
      totalItems: matches.length,
    };
  }
}
