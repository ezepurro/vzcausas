import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { personName } from '../../setup/names'
import { db } from '@/shared/mocks'
import { LawyersPage } from '@/features/lawyers/pages/LawyersPage'

/**
 * Modificar abogado (HU-14), desde la acción "Modificar" de cada fila. Va en
 * su propio archivo para no pasar el techo de `LawyersPage.test.tsx`
 * (TESTING.md §4). Los textos salen del formulario "Modificar abogado" del
 * prototipo: Apellido, Nombres y Matrícula, y el botón "Guardar cambios".
 *
 * @backend CA-14.2 CA-14.5
 * (las causas referencian al abogado y no lo copian; la auditoría no tiene
 * pantalla, V5 §3.3)
 */

function renderPage(as = 'fvazquez') {
    return renderWithProviders(<LawyersPage />, {
        as,
        path: '/abogados',
        route: '/abogados',
    })
}

const PERALTA = personName('Peralta', 'Ignacio', { exact: false })

async function openEdit(user: ReturnType<typeof renderPage>['user']) {
    const row = (await screen.findByText(PERALTA)).closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Modificar' }))
    return screen.getByRole('dialog', { name: /Modificar abogado/ })
}

describe('LawyersPage · modificar abogado', () => {
    // CA-14.1
    it('el Administrador modifica los datos y quedan guardados', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        const firstName = within(dialog).getByLabelText(/^nombres/i)
        await user.clear(firstName)
        await user.type(firstName, 'Ignacio José')
        await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

        expect(await screen.findByText('Datos de Peralta, Ignacio José actualizados.')).toBeInTheDocument()
        expect(db.lawyers.find((l) => l.id === 4)?.firstName).toBe('Ignacio José')
    })

    // CA-14.4: los tres campos son obligatorios; el mensaje es el del alta (TESTING.md §11).
    it('vaciar el apellido no deja guardar y lo marca en su campo', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        await user.clear(within(dialog).getByLabelText(/^apellido/i))
        await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

        expect(await within(dialog).findByText('El apellido es obligatorio.')).toBeInTheDocument()
        expect(db.lawyers.find((l) => l.id === 4)?.lastName).toBe('Peralta')
    })

    // CA-14.3: la matrícula de otro abogado se marca en su campo.
    it('una matrícula que ya tiene otro abogado se rechaza en su campo', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        const registration = within(dialog).getByLabelText(/^matrícula/i)
        await user.clear(registration)
        await user.type(registration, '1-28114')
        await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

        expect(await within(dialog).findByText('La matrícula del abogado ya se encuentra registrada.')).toBeInTheDocument()
        expect(db.lawyers.find((l) => l.id === 4)?.registrationNumber).toBe('1-35207')
    })

    // CA-14.6: modificar abogados es sólo del Administrador.
    it('un abogado ve "Modificar" deshabilitado', async () => {
        renderPage('mrios')
        const row = (await screen.findByText(PERALTA)).closest('tr') as HTMLElement

        expect(within(row).getByRole('button', { name: 'Modificar' })).toBeDisabled()
    })
})
