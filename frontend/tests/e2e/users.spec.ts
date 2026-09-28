import { expect, test, type Page } from '@playwright/test'
import { goTo, loginAs } from './fixtures/auth'

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
        await dialog.getByLabel(/^Nombre y apellido\*?$/).fill('Ana Pérez')
        await dialog.getByLabel(/^Nombre de usuario/).fill('aperez')
        await dialog.getByLabel(/^Correo electrónico/).fill('aperez@vazquezzarate.com')
        await dialog.getByLabel(/^Contraseña inicial/).fill('inicial2026')
        await dialog.getByLabel(/^Repetir contraseña/).fill('inicial2026')
        await dialog.getByLabel(/^Ficha de abogado/).selectOption({ label: 'Registrar un abogado nuevo' })
        await dialog.getByLabel(/^Nombre y apellido del abogado/).fill('Dra. Ana Pérez')
        await dialog.getByLabel(/^Matrícula/).fill('1-50000')
        await dialog.getByRole('button', { name: 'Registrar usuario' }).click()

        await expect(page.getByText('Usuario aperez registrado.')).toBeVisible()
        await expect(dialog).toBeHidden()

        await page.getByRole('searchbox', { name: 'Buscar usuario' }).fill('aperez')
        const row = rowOf(page, 'aperez')
        await expect(row).toBeVisible()
        await expect(row.getByText('Dra. Ana Pérez')).toBeVisible()

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

        await expect(page.getByText('Ana Pérez Eliminado correctamente.')).toBeVisible()
        await expect(page.getByText('Sin usuarios')).toBeVisible()
    })

    /* El camino de vincular una ficha **ya registrada**. El test de arriba
       elige "Registrar un abogado nuevo", que esconde el select de abogados —
       y ése era justamente el que estaba roto: sin opción vacía mostraba el
       primer abogado como si estuviera elegido, con el valor en blanco. */
    test('registrar un usuario vinculándolo a una ficha existente', async ({ page }) => {
        await page.getByRole('button', { name: 'Registrar usuario' }).click()
        const dialog = page.getByRole('dialog')
        await dialog.getByLabel(/^Nombre y apellido\*?$/).fill('Bruno Sosa')
        await dialog.getByLabel(/^Nombre de usuario/).fill('bsosa')
        await dialog.getByLabel(/^Correo electrónico/).fill('bsosa@vazquezzarate.com')
        await dialog.getByLabel(/^Contraseña inicial/).fill('inicial2026')
        await dialog.getByLabel(/^Repetir contraseña/).fill('inicial2026')

        // Lo que se ve tiene que ser lo que vale: ningún abogado elegido.
        const lawyer = dialog.getByLabel(/^Abogado\*?$/)
        await expect(lawyer).toHaveValue('')

        // Confirmar sin tocarlo tiene que marcar el campo, no inventar un vínculo.
        await dialog.getByRole('button', { name: 'Registrar usuario' }).click()
        await expect(
            dialog.getByText('Este perfil necesita una ficha de abogado vinculada.'),
        ).toBeVisible()

        await lawyer.selectOption({ label: 'Dr. Ignacio Peralta · matrícula 1-35207' })
        await dialog.getByRole('button', { name: 'Registrar usuario' }).click()

        await expect(page.getByText('Usuario bsosa registrado.')).toBeVisible()
        await page.getByRole('searchbox', { name: 'Buscar usuario' }).fill('bsosa')
        await expect(rowOf(page, 'bsosa').getByText('Dr. Ignacio Peralta')).toBeVisible()
    })

    test('un usuario con causas asignadas no se puede eliminar', async ({ page }) => {
        await rowOf(page, 'mrios').getByRole('button', { name: 'Eliminar' }).click()
        await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click()

        await expect(page.getByRole('alert')).toBeVisible()
        await expect(rowOf(page, 'mrios')).toBeVisible()
    })
})
