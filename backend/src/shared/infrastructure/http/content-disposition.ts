/** How the browser treats a file: opened in place (`inline`) or saved (`attachment`). */
export type Disposition = 'inline' | 'attachment';

/**
 * The `Content-Disposition` header of a file the API hands over (RFC 6266).
 *
 * `filename` carries an ASCII fallback and `filename*` the real name in UTF-8,
 * so "designación.docx" or "Cédula de notificación.pdf" keeps its accents in
 * every browser and an old one still gets a usable name. Quotes and
 * backslashes are dropped from the fallback, where they would end the quoted
 * string.
 */
export class ContentDisposition {
  private constructor(
    private readonly disposition: Disposition,
    private readonly fileName: string,
  ) {}

  /** The file is opened or saved as the caller asks (HU38, the case file). */
  static of(disposition: Disposition, fileName: string): ContentDisposition {
    return new ContentDisposition(disposition, fileName);
  }

  /** The file is downloaded, with its name (CA-23.1). */
  static attachment(fileName: string): ContentDisposition {
    return new ContentDisposition('attachment', fileName);
  }

  toString(): string {
    return `${this.disposition}; filename="${this.asciiFallback()}"; filename*=UTF-8''${encodeURIComponent(this.fileName)}`;
  }

  /** The name without accents or anything outside printable ASCII. */
  private asciiFallback(): string {
    return this.fileName
      .normalize('NFD')
      .replace(/[^\x20-\x7e]/g, '')
      .replace(/["\\]/g, '');
  }
}
