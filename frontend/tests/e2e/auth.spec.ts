import { expect, test } from '@playwright/test'
import { goTo, loginAs, USERS } from './fixtures/auth'

test.describe('Autenticación', () => {
    test('iniciar sesión lleva a inicio y muestra quién está adentro', async ({ page }) => {
        await loginAs(page, 'admin')

        const rail = page.getByRole('navigation', { name: 'Navegación principal' })
        await expect(rail.getByText(USERS.admin.fullName)).toBeVisible()
        await expect(rail.getByText('Administrador')).toBeVisible()
    })

    test('con credenciales inválidas se queda en el login con un aviso', async ({ page }) => {
        await page.goto('/login')
        await page.getByLabel('Usuario').fill('fvazquez')
        await page.getByLabel('Contraseña').fill('incorrecta1')
        await page.getByRole('button', { name: 'Ingresar' }).click()

        await expect(page.getByRole('alert')).toBeVisible()
        await expect(page).toHaveURL(/\/login$/)
        await expect(page.getByLabel('Contraseña')).toHaveValue('')
    })

    test('sin sesión, una pantalla privada manda al login y después vuelve a ella', async ({ page }) => {
        await page.goto('/usuarios')
        await expect(page).toHaveURL(/\/login$/)

        await page.getByLabel('Usuario').fill(USERS.admin.username)
        await page.getByLabel('Contraseña').fill(USERS.admin.password)
        await page.getByRole('button', { name: 'Ingresar' }).click()

        await expect(page).toHaveURL(/\/usuarios$/)
        await expect(page.getByRole('cell', { name: 'fvazquez' })).toBeVisible()
    })

    test('cerrar sesión vuelve al login', async ({ page }) => {
        await loginAs(page, 'admin')

        await page.getByRole('button', { name: 'Cerrar sesión' }).click()

        await expect(page).toHaveURL(/\/login$/)
        await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
    })

    test('cambiar la contraseña y volver a entrar con la nueva', async ({ page }) => {
        await loginAs(page, 'admin')

        await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
        const dialog = page.getByRole('dialog')
        await dialog.getByLabel(/^Contraseña actual/).fill(USERS.admin.password)
        await dialog.getByLabel(/^Contraseña nueva/).fill('nueva2026')
        await dialog.getByLabel(/^Repetir la nueva/).fill('nueva2026')
        await dialog.getByRole('button', { name: 'Cambiar contraseña' }).click()

        await expect(page.getByText('Contraseña actualizada. La sesión sigue abierta.')).toBeVisible()
        await expect(dialog).toBeHidden()

        // Salir y entrar sin recargar: el mock conserva la contraseña nueva en memoria.
        await page.getByRole('button', { name: 'Cerrar sesión' }).click()
        await page.getByLabel('Usuario').fill(USERS.admin.username)
        await page.getByLabel('Contraseña').fill('nueva2026')
        await page.getByRole('button', { name: 'Ingresar' }).click()

        await expect(page).toHaveURL(/\/inicio$/)
    })

    test('si la sesión se revoca, la próxima pantalla manda al login', async ({ page }) => {
        await loginAs(page, 'admin')

        // Vence los tokens y cierra las sesiones del lado del mock, como si el
        // backend hubiera revocado la sesión.
        // Corre dentro del navegador: es el módulo que sirve Vite, el mismo que usa la app.
        await page.evaluate(async (path) => {
            const mocks = await import(/* @vite-ignore */ path)
            mocks.expireIssuedTokens()
            mocks.db.sessions.clear()
        }, '/src/shared/mocks/index.ts')

        await goTo(page, 'Usuarios')

        await expect(page).toHaveURL(/\/login$/)
    })

    test('con la sesión abierta, entrar al login manda a inicio', async ({ page }) => {
        await loginAs(page, 'secretary')

        // Se navega con el historial del navegador para no recargar la página.
        await page.evaluate(() => {
            window.history.pushState({}, '', '/login')
            window.dispatchEvent(new PopStateEvent('popstate'))
        })

        await expect(page).toHaveURL(/\/inicio$/)
    })
})
