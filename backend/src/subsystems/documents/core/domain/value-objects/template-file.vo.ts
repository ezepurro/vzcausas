import { DOCX_MIME_TYPE } from '../entities/document-template.entity';

export interface TemplateFileProps {
  fileName: string;
  cloudFileId: string;
}

/**
 * The file of a formal template: the name the user uploaded and where it is in
 * the cloud storage (HU35, HU23).
 *
 * **A value object.** It has no identity of its own — it is the file of one
 * template — and the API never changes it apart from its template. It knows
 * its type: every template is a Word document, checked when it is registered
 * (CA-34.3), so the download needs nothing else to say what it hands over.
 */
export class TemplateFile {
  private constructor(private readonly props: TemplateFileProps) {}

  /** Rebuilds the file of a stored template, without validation. */
  static hydrate(props: TemplateFileProps): TemplateFile {
    return new TemplateFile({ ...props });
  }

  get fileName(): string {
    return this.props.fileName;
  }

  get cloudFileId(): string {
    return this.props.cloudFileId;
  }

  /** Always `.docx` (CA-34.3). */
  get mimeType(): string {
    return DOCX_MIME_TYPE;
  }

  equals(other: TemplateFile): boolean {
    return this.props.fileName === other.props.fileName && this.props.cloudFileId === other.props.cloudFileId;
  }
}
