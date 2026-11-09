import { expect, test, type Page } from '@playwright/test'
import { goTo, loginAs } from './fixtures/auth'
import { personName, personNameIn } from '../setup/names'

/** La fila de la tabla de ese nombre de usuario. */
function rowOf(page: Page, username: string) {
    return page.getByRole('row').filter({ has: page.getByRole('cell', { name: username, exact: true }) })
}

test.describe('Usuarios', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'admin')
        await goTo(page, 'Usuarios')
        await expect(page).toHaveURL(/\/usuarios$/)
        await expect(page.getByRole('cell', { name: 'fvazquez' })).toBeVisible()
    })

    test('registrar, modificar y eliminar un usuario', async ({ page }) => {
        // Registrar: un abogado nuevo, con su ficha, en una sola operación.
        await page.getByRole('button', { name: 'Registrar usuario' }).click()
        const dialog = page.getByRole('dialog')
        await dialog.getByLabel(/^apellido\*?$/i).fill('Pérez')
        await dialog.getByLabel(/^nombres\*?$/i).fill('Ana')
        await dialog.getByLabel(/^Nombre de usuario/).fill('aperez')
        await dialog.getByLabel(/^Correo electrónico/).fill('aperez@vazquezzarate.com')
        await dialog.getByLabel(/^Contraseña inicial/).fill('inicial2026')
        await dialog.getByLabel(/^Repetir contraseña/).fill('inicial2026')
        await dialog.getByLabel(/^Ficha de abogado/).selectOption({ label: 'Registrar un abogado nuevo' })
        // La ficha nueva sólo pide la matrícula: el apellido y los nombres son los del usuario.
        await dialog.getByLabel(/^Matrícula/).fill('1-50000')
        await dialog.getByRole('button', { name: 'Registrar usuario' }).click()

        await expect(page.getByText('Usuario aperez registrado.')).toBeVisible()
        await expect(dialog).toBeHidden()

        await page.getByRole('searchbox', { name: 'Buscar usuario' }).fill('aperez')
        const row = rowOf(page, 'aperez')
        await expect(row).toBeVisible()
        await expect(row.getByText(personName('Pérez', 'Ana')).first()).toBeVisible()

        // Modificar: sumarle el perfil de administrador.
        await row.getByRole('button', { name: 'Modificar' }).click()
        await dialog.getByRole('checkbox', { name: /^Administrador/ }).check()
        await dialog.getByRole('button', { name: 'Guardar cambios' }).click()

        await expect(page.getByText('Usuario aperez actualizado.')).toBeVisible()
        await expect(row.getByText('Administrador')).toBeVisible()
        await expect(row.getByText('Abogado', { exact: true })).toBeVisible()

        // Eliminar.
        await row.getByRole('button', { name: 'Eliminar' }).click()
        await dialog.getByRole('button', { name: 'Eliminar' }).click()

        await expect(page.getByText(new RegExp(`^${personNameIn('Pérez', 'Ana')} Eliminado correctamente\\.$`))).toBeVisible()
        await expect(page.getByText('Sin usuarios')).toBeVisible()
    })
})
