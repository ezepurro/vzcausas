import { ValidationError } from '@shared/domain/domain-error';

/** The jurisdictions a template can apply to (contract `Jurisdiction`). */
export const TEMPLATE_JURISDICTIONS = ['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO'] as const;
export type TemplateJurisdiction = (typeof TEMPLATE_JURISDICTIONS)[number];

/** The only accepted file: a Word document (CA-34.3). */
export const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOCX_EXTENSION = '.docx';
const NAME_MAX_LENGTH = 150;
const FILE_NAME_MAX_LENGTH = 255;

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
 * Built only through {@link create}, which checks every field and reports all
 * the problems at once (CA-34.4). The unique name needs the other templates,
 * so the use case checks it; the file itself lives in the cloud storage.
 */
export class DocumentTemplate {
  private constructor(private readonly props: DocumentTemplateProps) {}

  /**
   * @throws {ValidationError} `VALIDATION_ERROR`, with one message per field.
   */
  static create(input: NewDocumentTemplateInput): DocumentTemplate {
    const errors: Record<string, string> = {};

    const name = input.name?.trim() ?? '';
    if (name.length === 0) {
      errors.name = 'El nombre del modelo es obligatorio.';
    } else if (name.length > NAME_MAX_LENGTH) {
      errors.name = `Debe tener hasta ${NAME_MAX_LENGTH} caracteres.`;
    }

    const jurisdictions = input.jurisdictions ?? [];
    if (jurisdictions.length === 0) {
      errors.jurisdictions = 'Elegí al menos un fuero.';
    } else if (jurisdictions.some((code) => !TEMPLATE_JURISDICTIONS.includes(code as TemplateJurisdiction))) {
      errors.jurisdictions = 'Los fueros válidos son CRIMINAL, ADMINISTRATIVE y AMPARO.';
    } else if (new Set(jurisdictions).size !== jurisdictions.length) {
      errors.jurisdictions = 'Cada fuero se elige una sola vez.';
    }

    const fileName = input.file?.originalName.trim() ?? '';
    if (!input.file) {
      errors.file = 'El archivo del modelo es obligatorio.';
    } else if (!DocumentTemplate.isDocx(fileName, input.file.mimeType)) {
      errors.file = 'El archivo tiene que ser .docx.';
    } else if (fileName.length > FILE_NAME_MAX_LENGTH) {
      errors.file = `El nombre del archivo debe tener hasta ${FILE_NAME_MAX_LENGTH} caracteres.`;
    }

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
