import { expect, test } from '@playwright/test'
import { goTo, loginAs } from './fixtures/auth'

test.describe('Abogados', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'admin')
        await goTo(page, 'Abogados')
        await expect(page).toHaveURL(/\/abogados$/)
        await expect(page.getByRole('cell', { name: 'Dr. Fernando G. Vázquez' })).toBeVisible()
    })

    test('registrar un abogado y verlo en la tabla', async ({ page }) => {
        await page.getByRole('button', { name: 'Registrar abogado' }).click()
        const dialog = page.getByRole('dialog')
        await dialog.getByLabel(/^apellido y nombre/i).fill('Dra. Ana Pérez')
        await dialog.getByLabel(/^Matrícula/).fill('1-50000')
        await dialog.getByRole('button', { name: 'Registrar abogado' }).click()

        await expect(page.getByText('Abogado Dra. Ana Pérez registrado con matrícula 1-50000.')).toBeVisible()
        await expect(dialog).toBeHidden()
        await expect(page.getByRole('cell', { name: 'Dra. Ana Pérez' })).toBeVisible()

        // Y se puede encontrar con el buscador.
        await page.getByRole('searchbox', { name: 'Buscar abogado' }).fill('50000')
        await expect(page.getByRole('cell', { name: 'Dra. Ana Pérez' })).toBeVisible()
        await expect(page.getByRole('cell', { name: 'Dr. Fernando G. Vázquez' })).toBeHidden()
    })

    test('una matrícula ya registrada no se puede repetir', async ({ page }) => {
        await page.getByRole('button', { name: 'Registrar abogado' }).click()
        const dialog = page.getByRole('dialog')
        await dialog.getByLabel(/^apellido y nombre/i).fill('Otro Vázquez')
        await dialog.getByLabel(/^Matrícula/).fill('1-28114')
        await dialog.getByRole('button', { name: 'Registrar abogado' }).click()

        await expect(dialog.locator('.vz-field--error')).toBeVisible()
        await expect(dialog).toBeVisible()
    })
})
