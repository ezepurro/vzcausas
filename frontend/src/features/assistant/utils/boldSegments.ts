/** Un tramo del texto de una respuesta: en negrita o no. */
export interface TextSegment {
    text: string
    bold: boolean
}

/**
 * Parte una respuesta en tramos según `**…**`, la única marca que se dibuja:
 * el asistente nombra así los botones y las secciones. Nada se interpreta como
 * HTML; un `**` sin cerrar queda como texto.
 */
export function boldSegments(text: string): TextSegment[] {
    const segments: TextSegment[] = []
    const pattern = /\*\*(.+?)\*\*/gs
    let last = 0
    for (const match of text.matchAll(pattern)) {
        const start = match.index ?? 0
        if (start > last) segments.push({ text: text.slice(last, start), bold: false })
        segments.push({ text: match[1], bold: true })
        last = start + match[0].length
    }
    if (last < text.length) segments.push({ text: text.slice(last), bold: false })
    return segments
}
