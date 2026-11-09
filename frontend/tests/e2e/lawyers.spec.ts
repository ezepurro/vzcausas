import { expect, test } from '@playwright/test'
import { goTo, loginAs } from './fixtures/auth'
import { personName, personNameIn } from '../setup/names'

/* Apellido y nombres van separados y sin tratamiento (V4 D-68, D-81). */
const VAZQUEZ = personName('Vázquez', 'Fernando G.')
const PEREZ = personName('Pérez', 'Ana')

test.describe('Abogados', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'admin')
        await goTo(page, 'Abogados')
        await expect(page).toHaveURL(/\/abogados$/)
        await expect(page.getByRole('cell', { name: VAZQUEZ })).toBeVisible()
    })

    test('registrar un abogado y verlo en la tabla', async ({ page }) => {
        await page.getByRole('button', { name: 'Registrar abogado' }).click()
        const dialog = page.getByRole('dialog')
        await dialog.getByLabel(/^apellido/i).fill('Pérez')
        await dialog.getByLabel(/^nombres/i).fill('Ana')
        await dialog.getByLabel(/^Matrícula/).fill('1-50000')
        await dialog.getByRole('button', { name: 'Registrar abogado' }).click()

        await expect(
            page.getByText(new RegExp(`^Abogado ${personNameIn('Pérez', 'Ana')} registrado con matrícula 1-50000\\.$`)),
        ).toBeVisible()
        await expect(dialog).toBeHidden()
        await expect(page.getByRole('cell', { name: PEREZ })).toBeVisible()

        // Y se puede encontrar con el buscador.
        await page.getByRole('searchbox', { name: 'Buscar abogado' }).fill('50000')
        await expect(page.getByRole('cell', { name: PEREZ })).toBeVisible()
        await expect(page.getByRole('cell', { name: VAZQUEZ })).toBeHidden()
    })
})
