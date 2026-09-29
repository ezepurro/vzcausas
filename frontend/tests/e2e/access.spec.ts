import { expect, test, type Page } from '@playwright/test'
import { goTo, loginAs, type UserKey } from './fixtures/auth'

/**
 * Qué ve cada perfil en el menú.
 *
 * La pantalla de "sin acceso" al escribir una URL a mano no se prueba acá: con
 * los mocks, un `page.goto()` después del login pierde la sesión (ver
 * `fixtures/auth.ts`). Esa parte la cubre `tests/components/app/RequireAccess.test.tsx`.
 */

const ADMINISTRATION = ['Usuarios', 'Abogados', 'Estados y plazos', 'Reportes']

function rail(page: Page) {
    return page.getByRole('navigation', { name: 'Navegación principal' })
}

test.describe('Acceso por perfil', () => {
    test('el administrador ve la administración y puede entrar', async ({ page }) => {
        await loginAs(page, 'admin')

        await expect(rail(page).getByText('Administración')).toBeVisible()
        for (const label of ADMINISTRATION) {
            await expect(rail(page).getByRole('button', { name: label, exact: true })).toBeVisible()
        }

        await goTo(page, 'Usuarios')
        await expect(page).toHaveURL(/\/usuarios$/)
        await expect(page.getByRole('cell', { name: 'fvazquez' })).toBeVisible()
    })

    const withoutAdministration: [string, UserKey][] = [
        ['un abogado', 'lawyer'],
        ['una persona de secretaría', 'secretary'],
    ]

    for (const [who, key] of withoutAdministration) {
        test(`${who} no ve la administración en el menú`, async ({ page }) => {
            await loginAs(page, key)

            await expect(rail(page).getByRole('button', { name: 'Inicio', exact: true })).toBeVisible()
            await expect(rail(page).getByText('Administración')).toHaveCount(0)
            for (const label of ADMINISTRATION) {
                await expect(rail(page).getByRole('button', { name: label, exact: true })).toHaveCount(0)
            }
        })
    }
})
