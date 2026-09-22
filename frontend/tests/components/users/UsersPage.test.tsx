import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { server } from '@/shared/mocks/server'
import { db, errorBody } from '@/shared/mocks'
import { UsersPage } from '@/features/users/pages/UsersPage'

function renderPage(as = 'fvazquez') {
    return renderWithProviders(<UsersPage />, {
        as,
        path: '/usuarios',
        route: '/usuarios',
        routes: [{ path: '/abogados', element: <p>Pantalla de abogados</p> }],
    })
}

type User = ReturnType<typeof renderPage>['user']

/* Los rótulos llevan el asterisco de obligatorio pegado: "Matrícula*". */
const label = {
    fullName: /^nombre y apellido\*?$/i,
    username: /^nombre de usuario/i,
    email: /^correo electrónico/i,
    password: /^contraseña inicial/i,
    passwordConfirm: /^repetir contraseña/i,
    lawyerMode: /^ficha de abogado/i,
    lawyerId: /^abogado\*?$/i,
    lawyerFullName: /^nombre y apellido del abogado/i,
    registrationNumber: /^matrícula/i,
}

function rowOf(username: string) {
    return screen.getByRole('cell', { name: username }).closest('tr') as HTMLElement
}

async function openCreate(user: User) {
    await screen.findByRole('cell', { name: 'fvazquez' })
    await user.click(screen.getByRole('button', { name: 'Registrar usuario' }))
    return screen.getByRole('dialog')
}

/** Completa los datos personales y la contraseña del alta. */
async function fillPersonalData(user: User, dialog: HTMLElement, username = 'aperez') {
    await user.type(within(dialog).getByLabelText(label.fullName), 'Ana Pérez')
    await user.type(within(dialog).getByLabelText(label.username), username)
    await user.type(within(dialog).getByLabelText(label.email), `${username}@vazquezzarate.com`)
    await user.type(within(dialog).getByLabelText(label.password), 'inicial2026')
    await user.type(within(dialog).getByLabelText(label.passwordConfirm), 'inicial2026')
}

/** Deja tildado sólo el perfil Secretaría (el alta arranca con Abogado). */
async function chooseSecretary(user: User, dialog: HTMLElement) {
    await user.click(within(dialog).getByRole('checkbox', { name: /^abogado/i }))
    await user.click(within(dialog).getByRole('checkbox', { name: /^secretaría/i }))
}

const activeUsers = () => db.users.filter((u) => u.active)

describe('UsersPage', () => {
    describe('listado', () => {
        it('muestra la primera página de usuarios', async () => {
            renderPage()

            expect(await screen.findByRole('cell', { name: 'fvazquez' })).toBeInTheDocument()
            expect(screen.getAllByRole('row')).toHaveLength(20 + 1)
            expect(screen.getByText(/usuarios · página/)).toHaveTextContent(
                `${activeUsers().length} usuarios · página 1 de 2`,
            )
        })

        it('no muestra a los usuarios dados de baja', async () => {
            const { user } = renderPage()
            await screen.findByRole('cell', { name: 'fvazquez' })

            await user.click(screen.getByRole('button', { name: /siguiente/i }))

            // El texto está partido en varios <span>: se mira el renglón entero.
            await waitFor(() =>
                expect(screen.getByText(/usuarios · página/)).toHaveTextContent('página 2 de 2'),
            )
            expect(screen.queryByRole('cell', { name: 'vsosa' })).not.toBeInTheDocument()
        })

        it('pasa de página', async () => {
            const { user } = renderPage()
            await screen.findByRole('cell', { name: 'fvazquez' })

            await user.click(screen.getByRole('button', { name: /siguiente/i }))

            await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(activeUsers().length - 20 + 1))
            expect(screen.getByRole('button', { name: /siguiente/i })).toBeDisabled()
        })

        it('filtra con el buscador', async () => {
            const { user } = renderPage()
            await screen.findByRole('cell', { name: 'fvazquez' })

            await user.type(screen.getByRole('searchbox', { name: 'Buscar usuario' }), 'ríos')

            await waitFor(() => expect(screen.queryByRole('cell', { name: 'fvazquez' })).not.toBeInTheDocument())
            expect(screen.getByRole('cell', { name: 'mrios' })).toBeInTheDocument()
        })

        it('filtra por perfil', async () => {
            const { user } = renderPage()
            await screen.findByRole('cell', { name: 'gestion' })

            await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por perfil' }), 'Administrador')

            await waitFor(() => expect(screen.queryByRole('cell', { name: 'gestion' })).not.toBeInTheDocument())
            const admins = activeUsers().filter((u) => u.roles.includes('ADMINISTRATOR'))
            expect(screen.getAllByRole('row')).toHaveLength(admins.length + 1)
        })

        it('si la búsqueda no encuentra nada, muestra el estado vacío', async () => {
            const { user } = renderPage()
            await screen.findByRole('cell', { name: 'fvazquez' })

            await user.type(screen.getByRole('searchbox', { name: 'Buscar usuario' }), 'zzzz')

            expect(await screen.findByText('Sin usuarios')).toBeInTheDocument()
        })

        it('si no tiene permiso, muestra el error', async () => {
            renderPage('gestion')

            expect(await screen.findByText('No se pudieron cargar los usuarios')).toBeInTheDocument()
        })

        it('la pestaña Abogados navega a su pantalla', async () => {
            const { user } = renderPage()

            await user.click(screen.getByRole('tab', { name: 'Abogados' }))

            expect(await screen.findByText('Pantalla de abogados')).toBeInTheDocument()
        })
    })

    describe('alta', () => {
        it('registra una persona de secretaría', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fillPersonalData(user, dialog)
            await chooseSecretary(user, dialog)
            await user.click(within(dialog).getByRole('button', { name: 'Registrar usuario' }))

            expect(await screen.findByText('Usuario aperez registrado.')).toBeInTheDocument()
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
            expect(db.users.find((u) => u.username === 'aperez')).toMatchObject({
                roles: ['SECRETARY'],
                lawyerId: null,
            })
        })

        it('registra un abogado vinculándolo a una ficha existente', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fillPersonalData(user, dialog)
            await user.selectOptions(
                within(dialog).getByLabelText(label.lawyerId),
                'Dr. Ignacio Peralta · matrícula 1-35207',
            )
            await user.click(within(dialog).getByRole('button', { name: 'Registrar usuario' }))

            expect(await screen.findByText('Usuario aperez registrado.')).toBeInTheDocument()
            expect(db.users.find((u) => u.username === 'aperez')?.lawyerId).toBe(4)
        })

        it('registra un abogado junto con su ficha nueva', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fillPersonalData(user, dialog)
            await user.selectOptions(within(dialog).getByLabelText(label.lawyerMode), 'Registrar un abogado nuevo')
            await user.type(within(dialog).getByLabelText(label.lawyerFullName), 'Dra. Ana Pérez')
            await user.type(within(dialog).getByLabelText(label.registrationNumber), '1-50000')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar usuario' }))

            expect(await screen.findByText('Usuario aperez registrado.')).toBeInTheDocument()
            const lawyer = db.lawyers.find((l) => l.registrationNumber === '1-50000')
            expect(lawyer?.fullName).toBe('Dra. Ana Pérez')
            expect(db.users.find((u) => u.username === 'aperez')?.lawyerId).toBe(lawyer?.id)
        })

        it('enviado vacío marca los campos y no llama al servidor', async () => {
            const { user } = renderPage()
            const before = db.users.length
            const dialog = await openCreate(user)

            await user.click(within(dialog).getByRole('button', { name: 'Registrar usuario' }))

            expect(within(dialog).getByText('El nombre y apellido es obligatorio.')).toBeInTheDocument()
            expect(within(dialog).getByText('El nombre de usuario es obligatorio.')).toBeInTheDocument()
            expect(within(dialog).getByText('El correo electrónico es obligatorio.')).toBeInTheDocument()
            expect(within(dialog).getByText('La contraseña es obligatoria.')).toBeInTheDocument()
            expect(
                within(dialog).getByText('Este perfil necesita una ficha de abogado vinculada.'),
            ).toBeInTheDocument()
            expect(db.users).toHaveLength(before)
        })

        it('sin ningún perfil tildado, lo pide', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fillPersonalData(user, dialog)
            await user.click(within(dialog).getByRole('checkbox', { name: /^abogado/i }))
            await user.click(within(dialog).getByRole('button', { name: 'Registrar usuario' }))

            // Se vuelve a buscar el diálogo: con este error, UserFormModal se remonta
            // (esparce un elemento JSX como props) y la referencia anterior queda vieja.
            expect(
                within(screen.getByRole('dialog')).getAllByText('Elegí al menos un perfil.').length,
            ).toBeGreaterThan(0)
        })

        it('un nombre de usuario ya registrado se marca en el campo', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fillPersonalData(user, dialog, 'mrios')
            await chooseSecretary(user, dialog)
            await user.click(within(dialog).getByRole('button', { name: 'Registrar usuario' }))

            await waitFor(() =>
                expect(within(dialog).getByLabelText(label.username).closest('.vz-field')).toHaveClass(
                    'vz-field--error',
                ),
            )
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })

        it('si el servidor falla, avisa y deja el modal abierto', async () => {
            server.use(
                http.post('*/users', () =>
                    HttpResponse.json(errorBody('INTERNAL_SERVER_ERROR', 'Error del servidor de prueba.'), {
                        status: 500,
                    }),
                ),
            )
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fillPersonalData(user, dialog)
            await chooseSecretary(user, dialog)
            await user.click(within(dialog).getByRole('button', { name: 'Registrar usuario' }))

            expect(await screen.findByText('Error del servidor de prueba.')).toBeInTheDocument()
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })
    })

    describe('edición', () => {
        it('precarga el usuario y guarda los cambios', async () => {
            const { user } = renderPage()
            await screen.findByRole('cell', { name: 'ravila' })

            await user.click(within(rowOf('ravila')).getByRole('button', { name: 'Modificar' }))
            const dialog = screen.getByRole('dialog')

            expect(dialog).toHaveTextContent('Romina Ávila · ravila')
            const fullName = within(dialog).getByLabelText(label.fullName)
            expect(fullName).toHaveValue('Romina Ávila')
            expect(within(dialog).getByRole('checkbox', { name: /^secretaría/i })).toBeChecked()

            await user.clear(fullName)
            await user.type(fullName, 'Romina B. Ávila')
            await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

            expect(await screen.findByText('Usuario ravila actualizado.')).toBeInTheDocument()
            expect(db.users.find((u) => u.username === 'ravila')?.fullName).toBe('Romina B. Ávila')
        })

        it('sin cambios cierra el modal sin llamar al servidor', async () => {
            let patched = false
            server.use(
                http.patch('*/users/:id', () => {
                    patched = true
                    return HttpResponse.json({})
                }),
            )
            const { user } = renderPage()
            await screen.findByRole('cell', { name: 'ravila' })

            await user.click(within(rowOf('ravila')).getByRole('button', { name: 'Modificar' }))
            await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
            expect(patched).toBe(false)
        })
    })

    describe('baja', () => {
        it('elimina al usuario, avisa y lo saca del listado', async () => {
            const { user } = renderPage()
            await screen.findByRole('cell', { name: 'gestion' })

            await user.click(within(rowOf('gestion')).getByRole('button', { name: 'Eliminar' }))
            await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }))

            expect(await screen.findByText('Gestión Estudio Eliminado correctamente.')).toBeInTheDocument()
            await waitFor(() => expect(screen.queryByRole('cell', { name: 'gestion' })).not.toBeInTheDocument())
            expect(db.users.find((u) => u.username === 'gestion')?.active).toBe(false)
        })

        it('si el usuario tiene causas asignadas, avisa el error y no lo elimina', async () => {
            const { user } = renderPage()
            await screen.findByRole('cell', { name: 'mrios' })

            await user.click(within(rowOf('mrios')).getByRole('button', { name: 'Eliminar' }))
            await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }))

            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
            expect(await screen.findByRole('alert')).toBeInTheDocument()
            expect(db.users.find((u) => u.username === 'mrios')?.active).toBe(true)
        })

        it('cancelar no elimina nada', async () => {
            const { user } = renderPage()
            await screen.findByRole('cell', { name: 'gestion' })

            await user.click(within(rowOf('gestion')).getByRole('button', { name: 'Eliminar' }))
            await user.click(screen.getByRole('button', { name: 'Cancelar' }))

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
            expect(db.users.find((u) => u.username === 'gestion')?.active).toBe(true)
        })
    })
})
