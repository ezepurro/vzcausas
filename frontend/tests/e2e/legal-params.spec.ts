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
        // Crear, en el fuero Amparo, al inicio del ciclo.
        await page.getByRole('tab', { name: 'Amparo' }).click()
        await expect(page.getByText('Ciclo de vida del fuero Amparo')).toBeVisible()

        await page.getByRole('button', { name: 'Registrar estado' }).click()
        const dialog = page.getByRole('dialog')
        await dialog.getByLabel(/^Nombre del estado/).fill('Informe del artículo 8')
        await dialog.getByLabel(/Dónde va este estado/).selectOption({ label: 'Al inicio del ciclo' })
        await dialog.getByLabel(/^Días/).fill('5')
        await dialog.getByLabel(/Se cuentan en días/).selectOption({ label: 'Corridos' })
        await dialog.getByRole('button', { name: 'Registrar estado' }).click()

        await expect(
            page.getByText('Estado "Informe del artículo 8" agregado al fuero Amparo, en la posición 1.'),
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

    test('un estado con causas asociadas no se puede eliminar', async ({ page }) => {
        const name = 'Oposición al requerimiento de elevación'

        await rowOf(page, name).getByRole('button', { name: 'Eliminar' }).click()
        await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click()

        await expect(page.getByRole('alert')).toBeVisible()
        await expect(rowOf(page, name)).toBeVisible()
    })
})
