export interface TemplateStoredFilesProps {
  /** The template's main file (`document_templates.cloud_file_id`). */
  mainFileId: string;
  /** The file of each of its jurisdictions (`document_template_files`); none for a template older than the subfolders. */
  jurisdictionFileIds: readonly string[];
}

/**
 * Every file a formal template has in the cloud storage (HU37, D-131): the one
 * in the `Modelos formales/{fuero}` folder of each jurisdiction in its list.
 *
 * **A value object.** It has no identity — it is what a template owns in the
 * storage — and it knows which files to move to the `Papelera` when the
 * template is given de baja, so no use case has to work that out:
 *
 * - a template with a file per jurisdiction: those files. The main file is the
 *   one of the first jurisdiction (D-109), so it is already among them;
 * - a template older than the subfolders has no such rows and only its main
 *   file, which is the one to move.
 *
 * Each id appears once, whatever the rows say.
 */
export class TemplateStoredFiles {
  private constructor(private readonly props: TemplateStoredFilesProps) {}

  /** Rebuilds the files of a stored template, without validation. */
  static hydrate(props: TemplateStoredFilesProps): TemplateStoredFiles {
    return new TemplateStoredFiles({ ...props, jurisdictionFileIds: [...props.jurisdictionFileIds] });
  }

  /** The ids of the files to move to the `Papelera` (HU37, CA-37.4), without repeats. */
  get fileIds(): readonly string[] {
    return [...new Set([this.props.mainFileId, ...this.props.jurisdictionFileIds])];
  }
}
