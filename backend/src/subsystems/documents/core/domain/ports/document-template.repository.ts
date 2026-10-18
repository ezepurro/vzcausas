import { DocumentTemplate, TemplateJurisdiction } from '../entities/document-template.entity';

/** DI token for {@link DocumentTemplateRepository}. */
export const DOCUMENT_TEMPLATE_REPOSITORY = Symbol('DOCUMENT_TEMPLATE_REPOSITORY');

/** Where the template's file was stored. */
export interface TemplateFileLocation {
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

/** Persistence of the formal templates (`document_templates` and its jurisdictions). */
export interface DocumentTemplateRepository {
  /** Whether an active template already has this name, ignoring case (D-71). */
  existsByName(name: string): Promise<boolean>;

  /**
   * Stores the template with its jurisdictions, in one write.
   *
   * @throws {DocumentTemplateAlreadyExistsError} if the name was taken in the
   *   meantime (the unique index on `lower(name)`).
   */
  save(template: DocumentTemplate, file: TemplateFileLocation): Promise<DocumentTemplateView>;
}
