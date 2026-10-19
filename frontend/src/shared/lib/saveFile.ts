/**
 * Entrega al usuario un archivo que ya se bajó con `http` (por ejemplo, el
 * `.docx` de un modelo formal). Hace falta porque esas descargas llevan el
 * encabezado `Authorization`: no sirve un enlace directo (V4 D-58).
 */
export function saveFile(file: Blob, fileName: string): void {
    // jsdom (los tests) no implementa createObjectURL: ahí no hay qué guardar.
    if (typeof URL.createObjectURL !== 'function') return

    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    // Se libera después de que el navegador tomó la descarga.
    setTimeout(() => URL.revokeObjectURL(url), 0)
}
