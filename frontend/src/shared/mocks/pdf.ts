/**
 * Un PDF mínimo y válido, con una hoja A4 por cada lista de renglones. Es lo
 * que devuelve el mock como carátula (`GET /cases/{caseId}/cover`) y como
 * expediente (`POST /cases/{caseId}/case-files`), así la vista previa y la
 * impresión abren un PDF de verdad (V5 §3.7 y §3.12).
 *
 * No es la hoja del estudio: no lleva logo ni recuadros, sólo el texto de cada
 * recuadro en su orden. Alcanza para ver qué datos van en cada uno.
 *
 * **Sólo ASCII.** El PDF viaja como texto y la tabla `xref` guarda la posición
 * de cada objeto en bytes; un carácter de más de un byte las correría. Por eso
 * se quitan los acentos ("GÓMEZ" → "GOMEZ") y lo que no es ASCII se reemplaza.
 */

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 56;
const FONT_SIZE = 11;
const LEADING = 15;

function toAscii(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^\x20-\x7e]/g, '?')
        .replace(/([\\()])/g, '\\$1');
}

function contentStream(lines: string[]): string {
    const top = PAGE_HEIGHT - MARGIN;
    const body = lines.map((line) => `(${toAscii(line)}) Tj T*`).join(' ');
    return `BT /F1 ${FONT_SIZE} Tf ${MARGIN} ${top} Td ${LEADING} TL ${body} ET`;
}

export function buildPdf(pages: string[][]): string {
    const objects: string[] = [];
    const kids: string[] = [];

    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
    pages.forEach((lines, index) => {
        const pageId = 4 + index * 2;
        const contentId = pageId + 1;
        const stream = contentStream(lines);
        kids.push(`${pageId} 0 R`);
        objects[pageId] =
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
            `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
        objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });
    objects[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`;

    let out = '%PDF-1.4\n';
    const offsets: number[] = [];
    for (let id = 1; id < objects.length; id += 1) {
        offsets.push(out.length);
        out += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }
    const xref = out.length;
    out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    out += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
    out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return out;
}
