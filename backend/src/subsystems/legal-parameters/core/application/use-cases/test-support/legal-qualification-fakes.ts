import { LegalQualification, LegalQualificationProps } from '@subsystems/legal-parameters/core/domain/entities/legal-qualification';
import { QualificationFilter } from '@subsystems/legal-parameters/core/application/common/get-qualifications.interfaces';
import { LegalQualificationRepository } from '@subsystems/legal-parameters/core/domain/ports/legal-qualification.repository';
import { PaginatedResult } from '@shared/domain/paginated-result';

/** A current qualification, built with `hydrate` so specs can also set up given-up ones. */
export function aLegalQualification(overrides: Partial<LegalQualificationProps> = {}): LegalQualification {
  return LegalQualification.hydrate({
    id: 1,
    name: 'Robo calificado — art. 167 inc. 2 CP',
    prescriptionMonths: 96,
    isActive: true,
    createdAt: new Date('2026-10-08T00:00:00Z'),
    ...overrides,
  });
}

/** The columns the fake keeps per row: what the table holds, not the entity. */
type Row = Pick<LegalQualificationProps, 'id' | 'name' | 'prescriptionMonths' | 'isActive' | 'createdAt'>;

/**
 * In-memory fake of {@link LegalQualificationRepository} for the use-case specs
 * (no NestJS, no database). Mirrors what the Prisma adapter does in SQL on
 * purpose — a fake that behaved differently would let specs pass against
 * behaviour production does not have:
 *
 * - it keeps **copies** of the rows, not the instances it hands out, so an
 *   entity changed by a use case is not "saved" until `update` writes it;
 * - lookups see current qualifications only (CA-47.9);
 * - names compare case-insensitively among current ones, like the partial
 *   unique index `legal_qualifications_name_active_key`;
 * - `update` writes only over a row that is still current, like its
 *   `WHERE active`, and says whether it wrote.
 *
 * `updated` records every row `update` wrote, as it was written.
 */
export class FakeLegalQualificationRepository implements LegalQualificationRepository {
  private readonly rows = new Map<number, Row>();
  public readonly updated = new Array<Row>();
  private nextIdValue = 1;

  /** Arranges the rows a spec starts from, without recording them in `updated`. */
  seed(...qualifications: LegalQualification[]): void {
    for (const qualification of qualifications) {
      this.rows.set(qualification.id, FakeLegalQualificationRepository.toRow(qualification));
      this.nextIdValue = Math.max(this.nextIdValue, qualification.id + 1);
    }
  }

  /** The stored row, for a spec to check what was persisted. */
  rowOf(id: number): Row | undefined {
    const row = this.rows.get(id);
    return row && { ...row };
  }

  async nextId(): Promise<number> {
    return this.nextIdValue++;
  }

  async save(qualification: LegalQualification): Promise<void> {
    if (this.rows.has(qualification.id)) {
      throw new Error(`FakeLegalQualificationRepository: id ${qualification.id} already exists.`);
    }
    this.rows.set(qualification.id, FakeLegalQualificationRepository.toRow(qualification));
  }

  async findPaginated(filter: QualificationFilter, page: number, limit: number): Promise<PaginatedResult<LegalQualification>> {
    const search = filter.search?.toLowerCase();
    const matches = [...this.rows.values()]
      .filter((row) => row.isActive)
      .filter((row) => !search || row.name.toLowerCase().includes(search))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(FakeLegalQualificationRepository.toEntity);
    const start = (page - 1) * limit;

    return {
      items: matches.slice(start, start + limit),
      total: matches.length,
      page,
      limit,
      totalPages: Math.ceil(matches.length / limit),
    };
  }

  async findActiveById(id: number): Promise<LegalQualification | null> {
    const row = this.rows.get(id);
    return row && row.isActive ? FakeLegalQualificationRepository.toEntity(row) : null;
  }

  async existsActiveByName(name: string, excludingId?: number): Promise<boolean> {
    return [...this.rows.values()].some(
      (row) => row.isActive && row.name.toLowerCase() === name.toLowerCase() && row.id !== excludingId,
    );
  }

  async update(qualification: LegalQualification): Promise<boolean> {
    const row = this.rows.get(qualification.id);
    if (!row || !row.isActive) {
      return false;
    }
    const written = FakeLegalQualificationRepository.toRow(qualification);
    this.rows.set(qualification.id, written);
    this.updated.push({ ...written });
    return true;
  }

  private static toRow(qualification: LegalQualification): Row {
    return {
      id: qualification.id,
      name: qualification.name,
      prescriptionMonths: qualification.prescriptionMonths,
      isActive: qualification.isActive,
      createdAt: qualification.createdAt,
    };
  }

  private static toEntity(row: Row): LegalQualification {
    return LegalQualification.hydrate({ ...row });
  }
}
