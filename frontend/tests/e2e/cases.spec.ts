import { expect, test, type Page } from '@playwright/test'
import { goTo, loginAs } from './fixtures/auth'

/**
 * Causas: HU-20 (Consultar Causas). Cada flujo dice qué criterios de
 * aceptación recorre.
 *
 * Los casos borde —cada filtro por separado, el orden exacto, los textos del
 * vencimiento, cada perfil— están en `tests/components/cases/CasesPage.test.tsx`,
 * con el reloj fijo en el día del prototipo. Acá el día es el de hoy, y los
 * vencimientos de las causas semilla se mueven con él: sólo se afirma lo que
 * vale cualquier día. Las 23 causas son siempre las mismas, 14 tienen
 * vencimiento y 9 no, y la primera página trae 20.
 */

/** La causa del prototipo. Siempre tiene vencimiento, así que siempre está en la primera página. */
const PROTOTYPE_SAC = '13284571'

/** Las filas de causas: las que traen su botón "Ver detalle". */
function caseRows(page: Page) {
    return page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Ver detalle' }) })
}

/** La fila de la causa con ese número de SAC. */
function rowOf(page: Page, sac: string) {
    return page.getByRole('row').filter({ has: page.getByRole('cell', { name: sac, exact: true }) })
}

/** Llega al listado por el menú y espera a que cargue la primera página. */
async function openCases(page: Page) {
    await goTo(page, 'Causas')
    await expect(page).toHaveURL(/\/causas$/)
    await expect(page.getByRole('heading', { name: 'Causas', level: 1 })).toBeVisible()
    await expect(caseRows(page)).toHaveCount(20)
}

test.describe('Causas', () => {
    /* CA-20.7, CA-20.1 y CA-20.8 */
    test('un abogado consulta todas las causas, filtra por responsable y abre un detalle', async ({ page }) => {
        await loginAs(page, 'lawyer')
        await openCases(page)

        // Ve las 23 del estudio, también las que no lleva.
        await expect(page.getByText('23 causas · página 1 de 2')).toBeVisible()
        await expect(rowOf(page, '12907344')).toContainText('Dr. Ignacio Peralta')

        // Por urgencia: las que no tienen plazo van después de todas las que sí.
        const rows = await caseRows(page).allInnerTexts()
        const firstWithoutDeadline = rows.findIndex((row) => row.includes('Sin plazo abierto'))
        expect(firstWithoutDeadline).toBeGreaterThan(0)
        expect(rows.slice(firstWithoutDeadline).every((row) => row.includes('Sin plazo abierto'))).toBe(true)

        // La carga de trabajo de una abogada: sus tres causas.
        await page
            .getByRole('combobox', { name: 'Filtrar por responsable' })
            .selectOption({ label: 'Dra. Malena Ríos' })
        await expect(caseRows(page)).toHaveCount(3)
        for (const row of await caseRows(page).all()) {
            await expect(row).toContainText('Dra. Malena Ríos')
        }

        await rowOf(page, PROTOTYPE_SAC).getByRole('button', { name: 'Ver detalle' }).click()
        await expect(page).toHaveURL(/\/causas\/1$/)
        await expect(page.getByRole('region', { name: `Causa ${PROTOTYPE_SAC}` })).toBeVisible()
    })

    /* CA-20.2, CA-20.6 y CA-20.7 */
    test('la Secretaría busca por SAC y por carátula, y una búsqueda sin coincidencias lo informa', async ({ page }) => {
        await loginAs(page, 'secretary')
        await openCases(page)

        const search = page.getByRole('searchbox', { name: 'Buscar causa' })

        await search.fill('1328')
        await expect(caseRows(page)).toHaveCount(1)
        await expect(rowOf(page, PROTOTYPE_SAC)).toBeVisible()

        await search.fill('apross')
        await expect(caseRows(page)).toHaveCount(3)
        for (const row of await caseRows(page).all()) {
            await expect(row).toContainText('APROSS')
        }

        await search.fill('zzzz')
        await expect(page.getByText('Ninguna causa coincide con los filtros.')).toBeVisible()
        await expect(caseRows(page)).toHaveCount(0)

        // Al borrar la búsqueda vuelve el listado completo.
        await search.fill('')
        await expect(caseRows(page)).toHaveCount(20)
    })

    /* CA-20.3 y CA-20.4 */
    test('filtra por fuero, por cada clase de estado procesal y por plazo por vencer', async ({ page }) => {
        await loginAs(page, 'admin')
        await openCases(page)

        const jurisdiction = page.getByRole('combobox', { name: 'Filtrar por fuero' })
        const state = page.getByRole('combobox', { name: 'Filtrar por estado procesal' })

        await jurisdiction.selectOption({ label: 'Amparo' })
        await expect(caseRows(page)).toHaveCount(6)

        // "Iniciada" se combina con el fuero…
        await state.selectOption({ label: 'Iniciada' })
        await expect(caseRows(page)).toHaveCount(1)
        await expect(rowOf(page, '13619027')).toBeVisible()

        // …y no depende de él: sin fuero, son las cuatro causas que siguen en el estado inicial.
        await jurisdiction.selectOption({ label: 'Todos los fueros' })
        await expect(caseRows(page)).toHaveCount(4)
        for (const row of await caseRows(page).all()) {
            await expect(row).toContainText('Iniciada')
        }

        // Un estado escrito a mano reemplaza a "Iniciada": se aplica una sola clase.
        await state.selectOption({ label: 'Con acusación, pero con oposición' })
        await expect(caseRows(page)).toHaveCount(1)
        await expect(rowOf(page, '13077215')).toContainText('Con acusación, pero con oposición')

        await page.getByRole('button', { name: 'Limpiar filtros' }).click()
        await expect(caseRows(page)).toHaveCount(20)
        await expect(page.getByRole('button', { name: 'Limpiar filtros' })).toBeHidden()

        // Las 14 que tienen vencimiento, vencidas incluidas.
        await page.getByRole('button', { name: 'Solo con plazo por vencer' }).click()
        await expect(caseRows(page)).toHaveCount(14)
        await expect(page.getByText('Sin plazo abierto')).toHaveCount(0)
    })
})
