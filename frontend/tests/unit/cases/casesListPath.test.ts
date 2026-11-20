import { describe, expect, it } from 'vitest'
import { casesListPath, rememberCasesList } from '@/features/cases/utils/casesListPath'

/**
 * A dónde vuelve la miga "Causas" (pedido del 19/11/2026, cases/CAMBIOS.md):
 * al último listado de la pestaña, con sus filtros. El setup limpia
 * `sessionStorage` entre tests.
 */
describe('casesListPath', () => {
    it('sin listado guardado, vuelve al listado limpio', () => {
        expect(casesListPath()).toBe('/causas')
    })

    it('vuelve al último listado, con sus filtros', () => {
        rememberCasesList('?responsable=3&pagina=2')
        expect(casesListPath()).toBe('/causas?responsable=3&pagina=2')
    })

    it('acepta la búsqueda sin el signo de pregunta', () => {
        rememberCasesList('fuero=AMPARO')
        expect(casesListPath()).toBe('/causas?fuero=AMPARO')
    })

    // Entrar desde el menú lateral abre limpio y eso pasa a ser lo último visto.
    it('un listado sin filtros pisa el anterior', () => {
        rememberCasesList('?fuero=AMPARO')
        rememberCasesList('')
        expect(casesListPath()).toBe('/causas')
    })
})
