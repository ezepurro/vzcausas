import { CaseFile } from '../domain/entities/case-file.entity';
import { CaseFileVersionTakenError } from '../domain/errors/documents.errors';
import { CaseFileRef, CaseFileRepository, SavedCaseFile } from '../domain/ports/case-file.repository';

/** In-memory {@link CaseFileRepository}: the case files the system generated, by storage id. */
export class FakeCaseFileRepository implements CaseFileRepository {
  private readonly rows = new Map<string, CaseFileRef & { caseId: number }>();
  private sequence = 0;
  private raceOnNextSave = false;
  /** Every case file saved, in order. */
  readonly saved: CaseFile[] = [];

  /** Registers a file of the storage as a case file, as HU25 would leave it. */
  add(cloudFileId: string, caseFile: CaseFileRef, caseId = 0): void {
    this.rows.set(cloudFileId, { ...caseFile, caseId });
  }

  /** Makes the next `save` lose a race: another generation of the case takes that version first. */
  loseNextRace(): void {
    this.raceOnNextSave = true;
  }

  async findByCloudFileIds(cloudFileIds: readonly string[]): Promise<Map<string, CaseFileRef>> {
    const found = new Map<string, CaseFileRef>();
    for (const id of cloudFileIds) {
      const row = this.rows.get(id);
      if (row) found.set(id, { id: row.id, version: row.version });
    }
    return found;
  }

  async findByCloudFileId(cloudFileId: string): Promise<CaseFileRef | null> {
    const row = this.rows.get(cloudFileId);
    return row ? { id: row.id, version: row.version } : null;
  }

  async nextVersion(caseId: number): Promise<number> {
    const versions = [...this.rows.values()].filter((row) => row.caseId === caseId).map((row) => row.version);
    return Math.max(0, ...versions) + 1;
  }

  async save(caseFile: CaseFile): Promise<SavedCaseFile> {
    if (this.raceOnNextSave) {
      this.raceOnNextSave = false;
      this.add(`raced-${caseFile.version}`, { id: 900 + caseFile.version, version: caseFile.version }, caseFile.caseId);
      throw new CaseFileVersionTakenError(caseFile.version);
    }
    this.sequence += 1;
    this.add(caseFile.cloudFileId, { id: this.sequence, version: caseFile.version }, caseFile.caseId);
    this.saved.push(caseFile);
    return {
      id: this.sequence,
      generatedBy: { id: caseFile.generatedByUserId, lastName: 'Ríos', firstName: 'Malena' },
    };
  }
}
