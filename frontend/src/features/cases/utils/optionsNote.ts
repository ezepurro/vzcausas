/** El `limit` máximo que acepta el contrato en un listado. */
export const OPTIONS_PAGE_SIZE = 100

/**
 * La nota al pie de un selector cuando el servidor tiene más resultados que
 * los que entraron en la página: "Se muestran 100 de 240 clientes. Escribí
 * para buscar entre todos.". Sin más resultados, `null`.
 */
export function moreResultsNote(shown: number, total: number | undefined, plural: string): string | null {
    if (total === undefined || total <= shown) return null
    return `Se muestran ${shown} de ${total} ${plural}. Escribí para buscar entre todos.`
}

/**
 * Lo que dice un selector cuando su lista no se pudo cargar: "No se pudieron
 * cargar los clientes. …". Sin esto decía "Ningún cliente coincide." o quedaba
 * vacío, y parecía que no había ninguno cargado (tanda 14 de
 * `docs/auditoria-front`).
 */
export function optionsFailedText(what: 'los clientes' | 'las calificaciones' | 'los abogados'): string {
    return `No se pudieron cargar ${what}. Recargá la página para volver a intentar.`
}

/** ¿El servidor tiene más resultados que los que trajo esta página? Sin respuesta todavía, `false`. */
export function hasMorePages(list: { data: unknown[]; pagination: { totalItems: number } } | undefined): boolean {
    return list !== undefined && list.pagination.totalItems > list.data.length
}
