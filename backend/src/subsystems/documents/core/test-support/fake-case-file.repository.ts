import { CaseFileRef, CaseFileRepository } from '../domain/ports/case-file.repository';

/** In-memory {@link CaseFileRepository}: the case files the system generated, by storage id. */
export class FakeCaseFileRepository implements CaseFileRepository {
  private readonly rows = new Map<string, CaseFileRef>();

  /** Registers a file of the storage as a case file, as HU25 would leave it. */
  add(cloudFileId: string, caseFile: CaseFileRef): void {
    this.rows.set(cloudFileId, caseFile);
  }

  async findByCloudFileIds(cloudFileIds: readonly string[]): Promise<Map<string, CaseFileRef>> {
    const found = new Map<string, CaseFileRef>();
    for (const id of cloudFileIds) {
      const row = this.rows.get(id);
      if (row) found.set(id, row);
    }
    return found;
  }

  async findByCloudFileId(cloudFileId: string): Promise<CaseFileRef | null> {
    return this.rows.get(cloudFileId) ?? null;
  }
}
