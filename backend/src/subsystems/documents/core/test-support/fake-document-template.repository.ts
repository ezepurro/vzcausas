import { DocumentTemplate } from '../domain/entities/document-template.entity';
import {
  DocumentTemplateRepository,
  DocumentTemplateSearch,
  DocumentTemplateView,
  TemplateFileLocation,
} from '../domain/ports/document-template.repository';
import { TemplateFile } from '../domain/value-objects/template-file.vo';

/** A template as the fake keeps it: the view plus where its file is. */
type StoredTemplate = DocumentTemplateView & TemplateFileLocation;

/** In-memory {@link DocumentTemplateRepository} for the use case specs. */
export class FakeDocumentTemplateRepository implements DocumentTemplateRepository {
  readonly saved: Array<{ template: DocumentTemplate; file: TemplateFileLocation }> = [];
  readonly rows: StoredTemplate[] = [];
  readonly searches: DocumentTemplateSearch[] = [];
  failOnSaveWith: Error | null = null;

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
      ...overrides,
    };
    this.rows.push(row);
    return row;
  }

  async existsByName(name: string): Promise<boolean> {
    return this.rows.some((row) => row.active && row.name.toLowerCase() === name.toLowerCase());
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

  async save(template: DocumentTemplate, file: TemplateFileLocation): Promise<DocumentTemplateView> {
    if (this.failOnSaveWith) throw this.failOnSaveWith;
    this.saved.push({ template, file });
    return toView(
      this.add({
        name: template.name,
        jurisdictions: [...template.jurisdictions],
        fileName: template.fileName,
        copyToNewCases: template.copyToNewCases,
        lastVersionAt: template.lastVersionAt,
        lastVersionBy: { id: template.lastVersionByUserId, lastName: 'Ferreyra', firstName: 'Matías' },
        ...file,
      }),
    );
  }
}

function toView({ cloudFileId: _file, cloudFolderId: _folder, ...view }: StoredTemplate): DocumentTemplateView {
  return view;
}
