import { expect, test, type Page } from '@playwright/test'
import { goTo, loginAs } from './fixtures/auth'
import { personNameIn } from '../setup/names'

/**
 * Causas: HU-20 (Consultar Causas), HU-18 (Registrar causa) y el registro de
 * actos. Un E2E por flujo crítico, sólo el camino feliz: cada flujo dice qué
 * criterios de aceptación recorre.
 *
 * Los casos borde —filtros, errores, perfiles, vencimientos— están en los
 * tests de pantalla de `tests/components/cases/` y `tests/components/proceedings/`,
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
        // Apellido y nombres, sin tratamiento (V4 D-68, D-81).
        await expect(rowOf(page, '12907344')).toContainText(new RegExp(personNameIn('Peralta', 'Ignacio')))

        // Por urgencia: las que no tienen plazo van después de todas las que sí.
        const rows = await caseRows(page).allInnerTexts()
        const firstWithoutDeadline = rows.findIndex((row) => row.includes('Sin plazo abierto'))
        expect(firstWithoutDeadline).toBeGreaterThan(0)
        expect(rows.slice(firstWithoutDeadline).every((row) => row.includes('Sin plazo abierto'))).toBe(true)

        // La carga de trabajo de una abogada: sus tres causas.
        await page
            .getByRole('combobox', { name: 'Filtrar por responsable' })
            .selectOption({ label: 'Ríos, Malena' })
        await expect(caseRows(page)).toHaveCount(3)
        for (const row of await caseRows(page).all()) {
            await expect(row).toContainText(new RegExp(personNameIn('Ríos', 'Malena')))
        }

        await rowOf(page, PROTOTYPE_SAC).getByRole('button', { name: 'Ver detalle' }).click()
        await expect(page).toHaveURL(/\/causas\/1$/)
        await expect(page.getByRole('region', { name: `Causa ${PROTOTYPE_SAC}` })).toBeVisible()
    })

    /* CA-18.1, CA-22.4 y el registro del primer acto (HU-21): la transacción principal de punta a punta. */
    test('una abogada registra una causa y su primer acto procesal', async ({ page }) => {
        await loginAs(page, 'lawyer')
        await openCases(page)

        await page.getByRole('button', { name: 'Registrar causa' }).click()
        await expect(page).toHaveURL(/\/causas\/nueva$/)
        await page.getByLabel(/^Cliente/).selectOption('1')
        await page.getByLabel(/^Abogado responsable/).selectOption('3')
        await page.getByLabel(/^Carátula/).fill('GÓMEZ, Ariel Fernando p.s.a. Estafa')
        await page.getByRole('button', { name: 'Registrar causa' }).click()

        // Nace en "Iniciada", sin vencimiento, y ofrece registrar el primer acto.
        await expect(page).toHaveURL(/\/causas\/\d+$/)
        await expect(page.getByText('Iniciada').first()).toBeVisible()
        await page.getByRole('button', { name: 'Registrar acto procesal' }).click()

        await page.getByRole('combobox').click()
        await page.getByRole('option', { name: /Cédula de notificación/ }).click()
        await page.getByRole('button', { name: 'Registrar acto' }).click()

        // Vuelve al detalle con el estado que dejó el acto.
        await expect(page).toHaveURL(/\/causas\/\d+$/)
        await expect(
            page.getByRole('alert').filter({ hasText: 'Acto registrado. La causa pasó a Cédula de notificación' }),
        ).toBeVisible()
    })
})
