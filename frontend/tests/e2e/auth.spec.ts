import { expect, test } from '@playwright/test'
import { loginAs, USERS } from './fixtures/auth'

test.describe('Autenticación', () => {
    test('iniciar sesión lleva a inicio y muestra quién está adentro', async ({ page }) => {
        await loginAs(page, 'admin')

        const rail = page.getByRole('navigation', { name: 'Navegación principal' })
        await expect(rail.getByText(USERS.admin.fullName)).toBeVisible()
        await expect(rail.getByText('Administrador')).toBeVisible()
    })

    test('cerrar sesión vuelve al login', async ({ page }) => {
        await loginAs(page, 'admin')

        // El botón del rail abre la confirmación; la sesión se cierra al confirmar.
        await page.getByRole('button', { name: 'Cerrar sesión' }).click()
        await page.getByRole('dialog').getByRole('button', { name: 'Cerrar sesión' }).click()

        await expect(page).toHaveURL(/\/login$/)
        await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
    })
})
