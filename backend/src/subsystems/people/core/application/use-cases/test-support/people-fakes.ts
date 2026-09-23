import { Lawyer } from "../../../domain/entities/lawyer.entity";
import { LawyerRepository } from "../../../domain/ports/lawyer.repository";
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
}
