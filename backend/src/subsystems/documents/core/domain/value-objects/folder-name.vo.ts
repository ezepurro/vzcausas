import { InvalidCloudFolderError } from '../errors/documents.errors';

/** Longest folder name accepted (`cloud_folders.name` is `VARCHAR(255)`). */
export const MAX_FOLDER_NAME_LENGTH = 255;

// Characters cloud providers reject or mishandle in names, plus control characters.
// eslint-disable-next-line no-control-regex
const FORBIDDEN_CHARACTERS = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;

/**
 * A folder name safe to send to the cloud provider (CA-39.2). For a case it is
 * the caption alone: neither the internal id nor the SAC number take part.
 */
export class FolderName {
  private constructor(private readonly value: string) {}

  /**
   * Removes the characters the provider does not admit, collapses whitespace
   * and truncates to {@link MAX_FOLDER_NAME_LENGTH}.
   *
   * @throws {InvalidCloudFolderError} if nothing usable remains.
   */
  static of(raw: string): FolderName {
    const cleaned = (raw ?? '')
      .replace(FORBIDDEN_CHARACTERS, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_FOLDER_NAME_LENGTH)
      .trim();
    if (cleaned.length === 0) {
      throw new InvalidCloudFolderError('El nombre de la carpeta no puede quedar vacío.');
    }
    return new FolderName(cleaned);
  }

  toString(): string {
    return this.value;
  }
}
