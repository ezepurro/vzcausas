import { expect, test, type Page } from '@playwright/test'
import { goTo, loginAs } from './fixtures/auth'

/** La fila de la tabla que tiene ese nombre de estado. */
function rowOf(page: Page, name: string) {
    return page.getByRole('row').filter({ has: page.getByRole('cell', { name, exact: true }) })
}

test.describe('Estados y plazos', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'admin')
        await goTo(page, 'Estados y plazos')
        await expect(page).toHaveURL(/\/estados-y-plazos$/)
        await expect(page.getByRole('cell', { name: 'Cédula de notificación' })).toBeVisible()
    })

    test('crear, modificar y eliminar un estado procesal', async ({ page }) => {
        // Crear, en el fuero Amparo. No se elige un lugar: los estados no tienen orden.
        await page.getByRole('tab', { name: 'Amparo' }).click()
        await expect(page.getByText('Ciclo de vida del fuero Amparo')).toBeVisible()

        await page.getByRole('button', { name: 'Registrar estado' }).click()
        const dialog = page.getByRole('dialog')
        await dialog.getByLabel(/^Nombre del estado/).fill('Informe del artículo 8')
        await dialog.getByLabel(/^Días/).fill('5')
        await dialog.getByLabel(/Se cuentan en días/).selectOption({ label: 'Corridos' })
        await dialog.getByRole('button', { name: 'Registrar estado' }).click()

        await expect(
            page.getByText('Estado "Informe del artículo 8" agregado al ciclo de vida del fuero Amparo.'),
        ).toBeVisible()
        const created = rowOf(page, 'Informe del artículo 8')
        await expect(created).toBeVisible()
        await expect(created.getByText('Corridos')).toBeVisible()

        // Modificar el plazo.
        await created.getByRole('button', { name: 'Modificar' }).click()
        await expect(dialog.getByLabel(/^Nombre del estado/)).toHaveValue('Informe del artículo 8')
        await dialog.getByLabel(/^Días/).fill('10')
        await dialog.getByRole('button', { name: 'Guardar cambios' }).click()

        await expect(page.getByText('Estado "Informe del artículo 8" actualizado.')).toBeVisible()
        await expect(created.getByRole('cell', { name: '10', exact: true })).toBeVisible()

        // Eliminar.
        await created.getByRole('button', { name: 'Eliminar' }).click()
        await dialog.getByRole('button', { name: 'Eliminar' }).click()

        await expect(
            page.getByText('Estado "Informe del artículo 8" eliminado del fuero Amparo.'),
        ).toBeVisible()
        await expect(created).toBeHidden()
    })

    /* La baja procede aunque haya causas en el estado (V3 D-06): el modal lo
       avisa y el estado sale del listado. */
    test('un estado con causas asociadas también se puede eliminar', async ({ page }) => {
        const name = 'Oposición al requerimiento de elevación'

        await rowOf(page, name).getByRole('button', { name: 'Eliminar' }).click()
        const dialog = page.getByRole('dialog')
        await expect(dialog).toContainText('Hay 1 causa en este estado')
        await dialog.getByRole('button', { name: 'Eliminar' }).click()

        await expect(page.getByText(`Estado "${name}" eliminado del fuero Penal.`)).toBeVisible()
        await expect(rowOf(page, name)).toBeHidden()
    })
})

test.describe('Calificaciones legales', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'admin')
        await goTo(page, 'Calificaciones legales')
        await expect(page).toHaveURL(/\/calificaciones-legales$/)
        await expect(page.getByRole('cell', { name: 'Abuso de armas — art. 104 CP' })).toBeVisible()
    })

    test('registrar una calificación y encontrarla con el buscador', async ({ page }) => {
        await page.getByRole('button', { name: 'Registrar calificación' }).click()
        const dialog = page.getByRole('dialog')
        await dialog.getByLabel(/^Nombre de la calificación legal/).fill('Estafa — art. 172 CP')
        await dialog.getByLabel(/^Años/).fill('6')
        await dialog.getByLabel(/^Meses/).selectOption('6')
        await dialog.getByRole('button', { name: 'Registrar calificación' }).click()

        await expect(page.getByText('Calificación registrada · prescripción 6 años y 6 meses.')).toBeVisible()
        await expect(dialog).toBeHidden()

        await page.getByRole('searchbox', { name: 'Buscar calificación' }).fill('art. 172')
        await expect(rowOf(page, 'Estafa — art. 172 CP')).toBeVisible()
        await expect(page.getByRole('cell', { name: 'Abuso de armas — art. 104 CP' })).toBeHidden()
    })
})
