import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ForbiddenActionError, ValidationError } from '@shared/domain/domain-error';

/** The jurisdictions a template can apply to (contract `Jurisdiction`). */
export const TEMPLATE_JURISDICTIONS = ['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO'] as const;
export type TemplateJurisdiction = (typeof TEMPLATE_JURISDICTIONS)[number];

/** The only accepted file: a Word document (CA-34.3). */
export const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOCX_EXTENSION = '.docx';
const NAME_MAX_LENGTH = 150;
const FILE_NAME_MAX_LENGTH = 255;

/** The profiles that manage formal templates (matrix §5.1, D-90). */
const MANAGING_ROLES: readonly string[] = ['ADMINISTRATOR', 'LAWYER'];

/** The file as it arrives: its original name and the type the client declared. */
export interface TemplateFileInput {
  originalName: string;
  mimeType: string;
}

/** What the user enters in the form (HU34). Everything optional: the entity says what is missing. */
export interface NewDocumentTemplateInput {
  name?: string | null;
  jurisdictions?: readonly string[] | null;
  copyToNewCases?: boolean | null;
  file?: TemplateFileInput | null;
  lastVersionByUserId: number;
  now: Date;
}

/** What the user sends to modify a template (HU36). Anything left out stays as it is. */
export interface TemplateModificationInput {
  name?: string | null;
  jurisdictions?: readonly string[] | null;
  copyToNewCases?: boolean | null;
  file?: TemplateFileInput | null;
  /** Who and when, for the "last version", if the file is replaced. */
  byUserId: number;
  now: Date;
}

/**
 * What a modification changes in the cloud storage (HU36, CA-36.4, CA-36.6): a
 * new file, jurisdictions that were added and jurisdictions that were removed.
 * Changing only the name or `copyToNewCases` touches nothing there.
 */
export interface TemplateModification {
  readonly fileReplaced: boolean;
  readonly jurisdictionsAdded: readonly TemplateJurisdiction[];
  readonly jurisdictionsRemoved: readonly TemplateJurisdiction[];
  /** Whether a file has to be uploaded, copied or moved. */
  readonly touchesStorage: boolean;
}

export interface DocumentTemplateProps {
  name: string;
  jurisdictions: TemplateJurisdiction[];
  fileName: string;
  copyToNewCases: boolean;
  lastVersionByUserId: number;
  lastVersionAt: Date;
}

/**
 * A formal template of the study (HU34, contract V4 §3.10): a `.docx` that
 * applies to one or more jurisdictions. A template for several jurisdictions
 * is **one** template with one file (CA-34.2, D-55).
 *
 * Built through {@link create}, which checks every field and reports all the
 * problems at once (CA-34.4), or rebuilt from the database with {@link hydrate}
 * and changed with {@link modify} (HU36). The unique name needs the other
 * templates, so the use case checks it; the file itself lives in the cloud storage.
 */
export class DocumentTemplate {
  private constructor(private readonly props: DocumentTemplateProps) {}

  /**
   * Formal templates are for administrators and lawyers, to read and download
   * as much as to register (CA-34.8, CA-35.7, CA-23.2, D-90): the first
   * resource whose **reading** is not open to the three profiles. A user with
   * several roles passes if one of them is allowed. It does not depend on any
   * template, so the refusal comes before one is read (403 before 404).
   * @throws {ForbiddenActionError} 403 `FORBIDDEN`.
   */
  static assertCanBeManagedBy(actor: AuthenticatedUser): void {
    if (!actor.roleNames.some((role) => MANAGING_ROLES.includes(role))) {
      throw new ForbiddenActionError(
        'FORBIDDEN',
        'Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación.',
      );
    }
  }

  /**
   * @throws {ValidationError} `VALIDATION_ERROR`, with one message per field.
   */
  static create(input: NewDocumentTemplateInput): DocumentTemplate {
    const errors: Record<string, string> = {};

    const name = input.name?.trim() ?? '';
    const jurisdictions = input.jurisdictions ?? [];
    const fileName = input.file?.originalName.trim() ?? '';

    DocumentTemplate.collect(errors, 'name', DocumentTemplate.nameError(name));
    DocumentTemplate.collect(errors, 'jurisdictions', DocumentTemplate.jurisdictionsError(jurisdictions));
    DocumentTemplate.collect(errors, 'file', DocumentTemplate.fileError(input.file, fileName));

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('VALIDATION_ERROR', 'Los datos enviados no son válidos.', errors);
    }

    return new DocumentTemplate({
      name,
      jurisdictions: [...jurisdictions] as TemplateJurisdiction[],
      fileName,
      // "Copiar en las causas nuevas" comes checked (CA-34.5).
      copyToNewCases: input.copyToNewCases ?? true,
      lastVersionByUserId: input.lastVersionByUserId,
      lastVersionAt: input.now,
    });
  }

  /** Rebuilds a stored template, without validation: what the database holds was valid when it was saved. */
  static hydrate(props: DocumentTemplateProps): DocumentTemplate {
    return new DocumentTemplate({ ...props, jurisdictions: [...props.jurisdictions] });
  }

  /**
   * HU36 (CA-36.1): changes what was sent and leaves the rest as it is. Every
   * field is optional, but at least one must come. The problems of all the
   * fields are reported at once, as in {@link create}.
   *
   * - `jurisdictions` **replaces** the whole list (CA-36.2, D-125).
   * - Only a new file moves `lastVersionAt` and `lastVersionByUserId`: they are
   *   the moment and the user of the replacement (CA-36.4).
   * - A name that is the template's own is no conflict: whether another template
   *   has it needs the others, so the use case checks it (CA-36.3).
   *
   * Nothing changes unless the whole request is valid.
   *
   * @throws {ValidationError} `VALIDATION_ERROR`, with one message per field, or
   *   under `body` if nothing was sent.
   */
  modify(input: TemplateModificationInput): TemplateModification {
    const nothingSent =
      input.name == null && input.jurisdictions == null && input.copyToNewCases == null && input.file == null;
    if (nothingSent) {
      throw new ValidationError('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
        body: 'Debe enviarse al menos un campo para modificar.',
      });
    }

    const name = input.name == null ? null : input.name.trim();
    const fileName = input.file == null ? '' : input.file.originalName.trim();
    const errors: Record<string, string> = {};
    if (name !== null) {
      DocumentTemplate.collect(errors, 'name', DocumentTemplate.nameError(name));
    }
    if (input.jurisdictions != null) {
      DocumentTemplate.collect(errors, 'jurisdictions', DocumentTemplate.jurisdictionsError(input.jurisdictions));
    }
    if (input.file != null) {
      DocumentTemplate.collect(errors, 'file', DocumentTemplate.fileError(input.file, fileName));
    }
    if (Object.keys(errors).length > 0) {
      throw new ValidationError('VALIDATION_ERROR', 'Los datos enviados no son válidos.', errors);
    }

    const before = this.props.jurisdictions;
    const after = input.jurisdictions == null ? before : (input.jurisdictions as TemplateJurisdiction[]);
    const inContractOrder = (list: readonly TemplateJurisdiction[]) =>
      [...list].sort((a, b) => TEMPLATE_JURISDICTIONS.indexOf(a) - TEMPLATE_JURISDICTIONS.indexOf(b));
    const modification: TemplateModification = {
      fileReplaced: input.file != null,
      jurisdictionsAdded: inContractOrder(after.filter((code) => !before.includes(code))),
      jurisdictionsRemoved: inContractOrder(before.filter((code) => !after.includes(code))),
      get touchesStorage(): boolean {
        return this.fileReplaced || this.jurisdictionsAdded.length > 0 || this.jurisdictionsRemoved.length > 0;
      },
    };

    if (name !== null) {
      this.props.name = name;
    }
    if (input.jurisdictions != null) {
      this.props.jurisdictions = [...after];
    }
    if (input.copyToNewCases != null) {
      this.props.copyToNewCases = input.copyToNewCases;
    }
    if (input.file != null) {
      this.props.fileName = fileName;
      this.props.lastVersionByUserId = input.byUserId;
      this.props.lastVersionAt = input.now;
    }
    return modification;
  }

  private static collect(errors: Record<string, string>, field: string, message: string | null): void {
    if (message !== null) {
      errors[field] = message;
    }
  }

  private static nameError(name: string): string | null {
    if (name.length === 0) {
      return 'El nombre del modelo es obligatorio.';
    }
    return name.length > NAME_MAX_LENGTH ? `Debe tener hasta ${NAME_MAX_LENGTH} caracteres.` : null;
  }

  private static jurisdictionsError(jurisdictions: readonly string[]): string | null {
    if (jurisdictions.length === 0) {
      return 'Elegí al menos un fuero.';
    }
    if (jurisdictions.some((code) => !TEMPLATE_JURISDICTIONS.includes(code as TemplateJurisdiction))) {
      return 'Los fueros válidos son CRIMINAL, ADMINISTRATIVE y AMPARO.';
    }
    return new Set(jurisdictions).size !== jurisdictions.length ? 'Cada fuero se elige una sola vez.' : null;
  }

  private static fileError(file: TemplateFileInput | null | undefined, fileName: string): string | null {
    if (!file) {
      return 'El archivo del modelo es obligatorio.';
    }
    if (!DocumentTemplate.isDocx(fileName, file.mimeType)) {
      return 'El archivo tiene que ser .docx.';
    }
    return fileName.length > FILE_NAME_MAX_LENGTH
      ? `El nombre del archivo debe tener hasta ${FILE_NAME_MAX_LENGTH} caracteres.`
      : null;
  }

  /** Both the extension and the declared type: a renamed PDF is not a Word document. */
  private static isDocx(fileName: string, mimeType: string): boolean {
    return fileName.toLowerCase().endsWith(DOCX_EXTENSION) && mimeType === DOCX_MIME_TYPE;
  }

  get name(): string {
    return this.props.name;
  }

  get jurisdictions(): readonly TemplateJurisdiction[] {
    return this.props.jurisdictions;
  }

  /**
   * The jurisdictions in the order of the contract's enum, whatever order they
   * were sent in. The file goes to the folder of the first one and is copied to
   * the rest, so that first jurisdiction holds the template's main file (D-55).
   */
  get jurisdictionsInContractOrder(): readonly TemplateJurisdiction[] {
    return [...this.props.jurisdictions].sort(
      (a, b) => TEMPLATE_JURISDICTIONS.indexOf(a) - TEMPLATE_JURISDICTIONS.indexOf(b),
    );
  }

  get fileName(): string {
    return this.props.fileName;
  }

  get copyToNewCases(): boolean {
    return this.props.copyToNewCases;
  }

  get lastVersionByUserId(): number {
    return this.props.lastVersionByUserId;
  }

  get lastVersionAt(): Date {
    return this.props.lastVersionAt;
  }
}
