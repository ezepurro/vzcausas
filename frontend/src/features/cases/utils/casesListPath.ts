/**
 * El último listado de causas que se vio en esta pestaña, con sus filtros
 * (`/causas?responsable=3&pagina=2`). Lo guarda el listado y lo usan las
 * migas "Causas" del detalle, de "Registrar acto procesal" y de "Generar
 * expediente": vuelven a donde se estaba, no al listado limpio.
 *
 * El ítem "Causas" del menú lateral no lo usa: abre siempre limpio, para
 * empezar de cero (decisión del 19/11/2026, `cases/CAMBIOS.md`).
 *
 * Va en `sessionStorage`: es de la pestaña y se va al cerrarla. Si el
 * navegador no deja usarlo, las migas abren el listado limpio, como antes.
 */

const KEY = 'vz-cases-list'
const BASE = '/causas'

/** Guarda la búsqueda del listado (`location.search`, con o sin `?`). */
export function rememberCasesList(search: string): void {
    try {
        sessionStorage.setItem(KEY, search.startsWith('?') || search === '' ? search : `?${search}`)
    } catch {
        // Sin almacenamiento, la miga vuelve al listado limpio.
    }
}

/** A dónde vuelve la miga "Causas": el último listado o, si no hay, el limpio. */
export function casesListPath(): string {
    try {
        return `${BASE}${sessionStorage.getItem(KEY) ?? ''}`
    } catch {
        return BASE
    }
}
