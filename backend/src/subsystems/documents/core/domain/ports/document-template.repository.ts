import { DocumentTemplate, TemplateJurisdiction } from '../entities/document-template.entity';

/** DI token for {@link DocumentTemplateRepository}. */
export const DOCUMENT_TEMPLATE_REPOSITORY = Symbol('DOCUMENT_TEMPLATE_REPOSITORY');

/**
 * Where the template's file is for one jurisdiction: its file and the folder
 * `Modelos formales/{fuero}` it is in.
 */
export interface TemplateFilePlacement {
  jurisdiction: TemplateJurisdiction;
  cloudFileId: string;
  cloudFolderId: string;
}

/** A registered template, as the contract shows it (V4 §3.10). */
export interface DocumentTemplateView {
  id: number;
  name: string;
  jurisdictions: TemplateJurisdiction[];
  fileName: string;
  copyToNewCases: boolean;
  lastVersionAt: Date;
  lastVersionBy: { id: number; lastName: string; firstName: string };
  /** Cases the template was copied to (HU40). */
  usageCount: number;
  active: boolean;
}

/** Filters and page of `GET /document-templates` (HU35). */
export interface DocumentTemplateSearch {
  /** Only the templates that apply to it; a template of several jurisdictions matches each one (CA-35.2). */
  jurisdiction?: TemplateJurisdiction;
  copyToNewCases?: boolean;
  page: number;
  limit: number;
}

/** Where the file of a template is, to download it (CA-35.6). */
export interface TemplateFile {
  fileName: string;
  cloudFileId: string;
}

/** Persistence of the formal templates (`document_templates` and its jurisdictions). */
export interface DocumentTemplateRepository {
  /**
   * One page of the **active** templates, alphabetical by name (CA-35.1,
   * CA-35.3), and how many match in total (CA-35.4).
   */
  findPage(search: DocumentTemplateSearch): Promise<{ items: DocumentTemplateView[]; totalItems: number }>;

  /** The active template with that id; `null` if it does not exist or was given de baja. */
  findById(id: number): Promise<DocumentTemplateView | null>;

  /** The file of the active template with that id; `null` like {@link findById}. */
  findFileById(id: number): Promise<TemplateFile | null>;

  /** Whether an active template already has this name, ignoring case (D-71). */
  existsByName(name: string): Promise<boolean>;

  /**
   * The ids of the jurisdictions with those codes (`jurisdictions.name` holds
   * the contract's code). A code that has no row is not in the result.
   */
  findJurisdictionIds(codes: readonly TemplateJurisdiction[]): Promise<Map<TemplateJurisdiction, number>>;

  /**
   * Stores the template, its jurisdictions and its file of each jurisdiction,
   * in one write. The **first** placement is the template's main file, the one
   * that is downloaded (CA-35.6).
   *
   * @throws {DocumentTemplateAlreadyExistsError} if the name was taken in the
   *   meantime (the unique index on `lower(name)`).
   */
  save(template: DocumentTemplate, placements: readonly TemplateFilePlacement[]): Promise<DocumentTemplateView>;
}
