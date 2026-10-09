/**
 * El número de SAC es opcional (V3 D-33): la causa puede iniciarse antes de que
 * el Poder Judicial se lo asigne. Donde el prototipo lo muestra —el listado, el
 * encabezado de la causa, las migas— va este rótulo en su lugar.
 */

/** Lo que se muestra cuando la causa todavía no tiene SAC. */
export const NO_SAC_LABEL = 'Sin SAC'

export function sacLabel(sacNumber: string | null): string {
    return sacNumber ?? NO_SAC_LABEL
}
