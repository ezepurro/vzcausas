import { expect, test } from '@playwright/test'
import { goTo, loginAs } from './fixtures/auth'

/**
 * Clientes: HU-8 (Registrar cliente) y HU-9 (Consultar clientes).
 *
 * Los casos borde —validación, perfil, DNI repetido— están en
 * `tests/components/clients/ClientsPage.test.tsx`. Acá van los flujos que
 * atraviesan la aplicación: entrar, llegar por el menú, registrar y buscar.
 */

const FIRST = 'ACOSTA, Jonathan E.'

test.describe('Clientes', () => {
    test('la Secretaría registra un cliente y lo encuentra por DNI', async ({ page }) => {
        await loginAs(page, 'secretary')
        await goTo(page, 'Clientes')
        await expect(page).toHaveURL(/\/clientes$/)
        await expect(page.getByText(FIRST, { exact: true })).toBeVisible()

        await page.getByRole('button', { name: 'Registrar cliente' }).click()
        const dialog = page.getByRole('dialog')
        await dialog.getByLabel(/^Apellido/).fill('ALBORNOZ')
        await dialog.getByLabel(/^Nombres/).fill('Bruno')
        await dialog.getByLabel(/^Número de documento/).fill('35.778.120')
        await dialog.getByLabel(/^Teléfono/).fill('351 400-1122')
        await dialog.getByRole('button', { name: 'Registrar cliente' }).click()

        await expect(page.getByText('Cliente ALBORNOZ, Bruno registrado.')).toBeVisible()
        await expect(dialog).toBeHidden()
        await expect(page.getByText('ALBORNOZ, Bruno', { exact: true })).toBeVisible()

        // Y se lo encuentra con el buscador, por el DNI sin puntos.
        await page.getByRole('searchbox', { name: 'Buscar cliente' }).fill('35778120')
        await expect(page.getByText('ALBORNOZ, Bruno', { exact: true })).toBeVisible()
        await expect(page.getByText(FIRST, { exact: true })).toBeHidden()
        await expect(page.getByRole('cell', { name: 'DNI 35.778.120' })).toBeVisible()
    })
})
