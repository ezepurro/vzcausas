import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { personName, personNameIn } from '../../setup/names'
import { server } from '@/shared/mocks/server'
import { db, errorBody, LAWYERS } from '@/shared/mocks'
import { LawyersPage } from '@/features/lawyers/pages/LawyersPage'

function renderPage(as = 'fvazquez') {
    return renderWithProviders(<LawyersPage />, {
        as,
        path: '/abogados',
        route: '/abogados',
    })
}

/* El nombre se muestra con el tratamiento que pone el frontend, o sin él
   (V4 D-68, D-81): ver `personName`. */
const VAZQUEZ = personName('Vázquez', 'Fernando G.')
const RIOS = personName('Ríos', 'Malena')

/** Completa el alta con apellido y nombres separados (V4 D-68). */
async function fillLawyer(user: ReturnType<typeof renderPage>['user'], dialog: HTMLElement, lastName: string, firstName: string, registrationNumber: string) {
    await user.type(within(dialog).getByLabelText(/^apellido/i), lastName)
    await user.type(within(dialog).getByLabelText(/^nombres/i), firstName)
    await user.type(within(dialog).getByLabelText(/^matrícula/i), registrationNumber)
}

async function openCreate(user: ReturnType<typeof renderPage>['user']) {
    await user.click(await screen.findByRole('button', { name: 'Registrar abogado' }))
    return screen.getByRole('dialog')
}

describe('LawyersPage', () => {
    describe('listado', () => {
        it('muestra los abogados del estudio', async () => {
            renderPage()

            expect(await screen.findByText(VAZQUEZ)).toBeInTheDocument()
            expect(screen.getAllByRole('row')).toHaveLength(LAWYERS.length + 1)
            expect(screen.getByText(`${LAWYERS.length}`, { selector: '.vz-pager__count' })).toBeInTheDocument()
        })

        it('filtra con el buscador', async () => {
            const { user } = renderPage()
            await screen.findByText(VAZQUEZ)

            await user.type(screen.getByRole('searchbox', { name: 'Buscar abogado' }), 'Ríos')

            // Mientras llega la búsqueda la tabla sigue mostrando lo anterior: hay que esperar.
            await waitFor(() =>
                expect(screen.queryByText(VAZQUEZ)).not.toBeInTheDocument(),
            )
            expect(screen.getByText(RIOS)).toBeInTheDocument()
        })

        /* Leer abogados está abierto a cualquier perfil (V3 D-03), así que el
           mock ya no responde 403 a un abogado: el rechazo se fuerza. */
        it('si el servidor rechaza la consulta, muestra el error', async () => {
            server.use(
                http.get('*/lawyers', () =>
                    HttpResponse.json(errorBody('FORBIDDEN', 'Rechazo de prueba.'), { status: 403 }),
                ),
            )
            renderPage()

            expect(await screen.findByText('No se pudieron cargar los abogados')).toBeInTheDocument()
        })
    })

    describe('quién puede registrar', () => {
        /* Matriz de permisos del 11/10/2026 (V3 §4): consultar abogados es de
           los tres perfiles; registrarlos, sólo del Administrador. */
        it('el Administrador tiene habilitado "Registrar abogado"', async () => {
            renderPage('supervision')
            await screen.findByText(VAZQUEZ)

            expect(screen.getByRole('button', { name: 'Registrar abogado' })).toBeEnabled()
        })

        it.each([
            ['un abogado', 'mrios'],
            ['la Secretaría', 'gestion'],
        ])('%s ve el listado, con "Registrar abogado" deshabilitado', async (_, username) => {
            renderPage(username)
            await screen.findByText(VAZQUEZ)

            expect(screen.getByRole('button', { name: 'Registrar abogado' })).toBeDisabled()
        })
    })

    describe('alta', () => {
        it('registra el abogado, avisa y lo muestra en la tabla', async () => {
            const { user } = renderPage()
            await screen.findByText(VAZQUEZ)

            const dialog = await openCreate(user)
            await fillLawyer(user, dialog, 'Pérez', 'Ana', '1-50000')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar abogado' }))

            expect(
                await screen.findByText(new RegExp(`^Abogado ${personNameIn('Pérez', 'Ana')} registrado con matrícula 1-50000\\.$`)),
            ).toBeInTheDocument()
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
            expect(await screen.findByRole('cell', { name: personName('Pérez', 'Ana') })).toBeInTheDocument()
            // Se guarda sin tratamiento (V4 D-81).
            expect(db.lawyers.find((l) => l.registrationNumber === '1-50000')).toMatchObject({ lastName: 'Pérez', firstName: 'Ana' })
        })

        it('enviado vacío marca los campos y no llama al servidor', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await user.click(within(dialog).getByRole('button', { name: 'Registrar abogado' }))

            expect(within(dialog).getByText('El apellido es obligatorio.')).toBeInTheDocument()
            expect(within(dialog).getByText('Los nombres son obligatorios.')).toBeInTheDocument()
            expect(within(dialog).getByText('La matrícula es obligatoria.')).toBeInTheDocument()
            expect(db.lawyers).toHaveLength(LAWYERS.length)
        })

        it('una matrícula ya registrada se marca en el campo', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fillLawyer(user, dialog, 'Vázquez', 'Otro', '1-28114')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar abogado' }))

            expect(
                await within(dialog).findByText(/matrícula/i, { selector: '.vz-error' }),
            ).toBeInTheDocument()
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })

        it('si el servidor falla, avisa y deja el modal abierto', async () => {
            server.use(
                http.post('*/lawyers', () =>
                    HttpResponse.json(errorBody('INTERNAL_SERVER_ERROR', 'Error del servidor de prueba.'), {
                        status: 500,
                    }),
                ),
            )
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fillLawyer(user, dialog, 'Pérez', 'Ana', '1-50000')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar abogado' }))

            expect(await screen.findByText('Error del servidor de prueba.')).toBeInTheDocument()
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })
    })
})
