/** How the browser treats a file: opened in place (`inline`) or saved (`attachment`). */
export type Disposition = 'inline' | 'attachment';

/**
 * The `Content-Disposition` of a file the API hands out. `filename` carries
 * an ASCII fallback and `filename*` the real name in UTF-8 (RFC 6266), so
 * "designación.docx" or "Cédula de notificación.pdf" keeps its accents in
 * every browser.
 */
export function contentDisposition(disposition: Disposition, fileName: string): string {
  const fallback = fileName.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/["\\]/g, '');
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
