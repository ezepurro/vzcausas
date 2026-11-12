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

/** ¿El servidor tiene más resultados que los que trajo esta página? Sin respuesta todavía, `false`. */
export function hasMorePages(list: { data: unknown[]; pagination: { totalItems: number } } | undefined): boolean {
    return list !== undefined && list.pagination.totalItems > list.data.length
}
