import {
  DocumentTemplate,
  TEMPLATE_JURISDICTIONS,
  TemplateJurisdiction,
} from '../domain/entities/document-template.entity';
import { DocumentTemplateAlreadyExistsError } from '../domain/errors/documents.errors';
import {
  DocumentTemplateRepository,
  DocumentTemplateSearch,
  DocumentTemplateView,
  TemplateFilePlacement,
  TemplateForModification,
  TemplateUpdate,
} from '../domain/ports/document-template.repository';
import { TemplateFile } from '../domain/value-objects/template-file.vo';
import { TemplateStoredFiles } from '../domain/value-objects/template-stored-files.vo';

/**
 * A template as the fake keeps it: the view plus where its main file is, the file
 * of each jurisdiction (none for a template older than the subfolders) and whether
 * its files still wait for the `Papelera` (HU37).
 */
type StoredTemplate = DocumentTemplateView & {
  cloudFileId: string;
  cloudFolderId: string;
  /** The file of each jurisdiction; none for a template older than the subfolders. */
  placements: TemplateFilePlacement[];
  trashPending: boolean;
};

/** In-memory {@link DocumentTemplateRepository} for the use case specs. */
export class FakeDocumentTemplateRepository implements DocumentTemplateRepository {
  readonly saved: Array<{ template: DocumentTemplate; placements: readonly TemplateFilePlacement[] }> = [];
  readonly rows: StoredTemplate[] = [];
  readonly searches: DocumentTemplateSearch[] = [];
  /** Files a modification left without a reference and that still wait for the `Papelera` (HU36). */
  readonly pendingTrash = new Set<string>();
  /** Every `update` that wrote, in order (HU36). */
  readonly updates: TemplateUpdate[] = [];
  failOnSaveWith: Error | null = null;
  failOnUpdateWith: Error | null = null;

  /** Puts a template in the "database", as if it had been registered before. */
  add(overrides: Partial<StoredTemplate> = {}): StoredTemplate {
    const id = overrides.id ?? this.rows.length + 1;
    const row: StoredTemplate = {
      id,
      name: `Modelo ${id}`,
      jurisdictions: ['CRIMINAL'],
      fileName: `modelo-${id}.docx`,
      copyToNewCases: true,
      lastVersionAt: new Date('2026-10-17T12:00:00.000Z'),
      lastVersionBy: { id: 6, lastName: 'Ferreyra', firstName: 'Matías' },
      usageCount: 0,
      active: true,
      cloudFileId: `file-${id}`,
      cloudFolderId: 'templates-folder',
      placements: [],
      trashPending: false,
      ...overrides,
    };
    this.rows.push(row);
    return row;
  }

  async existsByName(name: string, exceptId?: number): Promise<boolean> {
    return this.rows.some(
      (row) => row.active && row.id !== exceptId && row.name.toLowerCase() === name.toLowerCase(),
    );
  }

  async findForModification(id: number): Promise<TemplateForModification | null> {
    const row = this.rows.find((stored) => stored.id === id && stored.active);
    return row
      ? {
          template: DocumentTemplate.hydrate({
            name: row.name,
            jurisdictions: [...row.jurisdictions],
            fileName: row.fileName,
            copyToNewCases: row.copyToNewCases,
            lastVersionByUserId: row.lastVersionBy.id,
            lastVersionAt: row.lastVersionAt,
          }),
          mainFileId: row.cloudFileId,
          placements: [...row.placements],
        }
      : null;
  }

  /** Like the real one: nothing is written if the template is no longer active or the name is taken. */
  async update(id: number, update: TemplateUpdate): Promise<DocumentTemplateView | null> {
    if (this.failOnUpdateWith) throw this.failOnUpdateWith;
    const row = this.rows.find((stored) => stored.id === id && stored.active);
    if (!row) {
      return null;
    }
    const { template, placements, trash } = update;
    if (await this.existsByName(template.name, id)) {
      throw new DocumentTemplateAlreadyExistsError();
    }
    row.name = template.name;
    // Like the real one, the contract's order whatever order they were sent in.
    row.jurisdictions = [...template.jurisdictionsInContractOrder];
    row.fileName = template.fileName;
    row.copyToNewCases = template.copyToNewCases;
    row.lastVersionAt = template.lastVersionAt;
    row.lastVersionBy = { ...row.lastVersionBy, id: template.lastVersionByUserId };
    if (placements) {
      row.placements = [...placements];
      row.cloudFileId = placements[0].cloudFileId;
      row.cloudFolderId = placements[0].cloudFolderId;
    }
    for (const fileId of trash) {
      this.pendingTrash.add(fileId);
    }
    this.updates.push(update);
    return toView(row);
  }

  async clearPendingTrash(fileIds: readonly string[]): Promise<void> {
    for (const fileId of fileIds) {
      this.pendingTrash.delete(fileId);
    }
  }

  async findPage(search: DocumentTemplateSearch): Promise<{ items: DocumentTemplateView[]; totalItems: number }> {
    this.searches.push(search);
    const matching = this.rows
      .filter((row) => row.active)
      .filter((row) => !search.jurisdiction || row.jurisdictions.includes(search.jurisdiction))
      .filter((row) => search.copyToNewCases === undefined || row.copyToNewCases === search.copyToNewCases)
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }) || a.id - b.id);
    const start = (search.page - 1) * search.limit;
    return { items: matching.slice(start, start + search.limit).map(toView), totalItems: matching.length };
  }

  async findById(id: number): Promise<DocumentTemplateView | null> {
    const row = this.rows.find((stored) => stored.id === id && stored.active);
    return row ? toView(row) : null;
  }

  async findFileById(id: number): Promise<TemplateFile | null> {
    const row = this.rows.find((stored) => stored.id === id && stored.active);
    return row ? TemplateFile.hydrate({ fileName: row.fileName, cloudFileId: row.cloudFileId }) : null;
  }

  /** Ids are the position in the contract's enum, from 1: CRIMINAL 1, ADMINISTRATIVE 2, AMPARO 3. */
  async findJurisdictionIds(codes: readonly TemplateJurisdiction[]): Promise<Map<TemplateJurisdiction, number>> {
    return new Map(codes.map((code) => [code, TEMPLATE_JURISDICTIONS.indexOf(code) + 1]));
  }

  async save(template: DocumentTemplate, placements: readonly TemplateFilePlacement[]): Promise<DocumentTemplateView> {
    if (this.failOnSaveWith) throw this.failOnSaveWith;
    this.saved.push({ template, placements });
    const main = placements[0];
    return toView(
      this.add({
        name: template.name,
        jurisdictions: [...template.jurisdictions],
        fileName: template.fileName,
        copyToNewCases: template.copyToNewCases,
        lastVersionAt: template.lastVersionAt,
        lastVersionBy: { id: template.lastVersionByUserId, lastName: 'Ferreyra', firstName: 'Matías' },
        cloudFileId: main.cloudFileId,
        cloudFolderId: main.cloudFolderId,
        placements: [...placements],
      }),
    );
  }

  async deactivate(id: number): Promise<boolean> {
    const row = this.rows.find((stored) => stored.id === id && stored.active);
    if (!row) {
      return false;
    }
    row.active = false;
    row.trashPending = true;
    return true;
  }

  /** Like the real one, active or not. */
  async findStoredFiles(id: number): Promise<TemplateStoredFiles | null> {
    const row = this.rows.find((stored) => stored.id === id);
    return row
      ? TemplateStoredFiles.hydrate({
          mainFileId: row.cloudFileId,
          jurisdictionFileIds: row.placements.map((placement) => placement.cloudFileId),
        })
      : null;
  }

  async markTrashed(id: number): Promise<void> {
    const row = this.rows.find((stored) => stored.id === id);
    if (row) {
      row.trashPending = false;
    }
  }
}

function toView({
  cloudFileId: _file,
  cloudFolderId: _folder,
  placements: _placements,
  trashPending: _pending,
  ...view
}: StoredTemplate): DocumentTemplateView {
  return view;
}
