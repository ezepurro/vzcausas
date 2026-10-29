/**
 * Abre el diálogo de impresión con un archivo que ya se bajó con `http` (el
 * expediente, HU25). Como `saveFile`, hace falta porque esas descargas llevan
 * el encabezado `Authorization`: no sirve un enlace directo (D-103).
 *
 * Imprime desde un iframe oculto y no desde una pestaña nueva: la descarga es
 * asíncrona, y para cuando termina el navegador ya no la toma como un click y
 * bloquea la ventana emergente.
 */
export function printFile(file: Blob): void {
    // jsdom (los tests) no implementa createObjectURL: ahí no hay qué imprimir.
    if (typeof URL.createObjectURL !== 'function') return

    const url = URL.createObjectURL(file)
    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.style.position = 'fixed'
    frame.style.right = '0'
    frame.style.bottom = '0'
    frame.style.width = '0'
    frame.style.height = '0'
    frame.style.border = '0'
    frame.onload = () => {
        frame.contentWindow?.focus()
        frame.contentWindow?.print()
    }
    frame.src = url
    document.body.appendChild(frame)
    /* El visor de PDF no avisa cuándo se cerró el diálogo: se limpia con
       margen, cuando la impresión ya tomó el archivo. */
    setTimeout(() => {
        frame.remove()
        URL.revokeObjectURL(url)
    }, 60_000)
}
