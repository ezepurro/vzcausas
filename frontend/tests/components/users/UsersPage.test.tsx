import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { personNameIn } from '../../setup/names'
import { server } from '@/shared/mocks/server'
import { db, errorBody } from '@/shared/mocks'
import { UsersPage } from '@/features/users/pages/UsersPage'

/* Estos tests llenan el formulario de alta tecla por tecla y, con la suite
   entera corriendo en paralelo, alguno pasaba los 5 s por defecto y fallaba
   al azar. No es un error de la pantalla: tardan. Sólo para este archivo. */
vi.setConfig({ testTimeout: 15_000 })

function renderPage(as = 'fvazquez') {
    return renderWithProviders(<UsersPage />, {
        as,
        path: '/usuarios',
        route: '/usuarios',
    })
}

type User = ReturnType<typeof renderPage>['user']

/* Los rótulos llevan el asterisco de obligatorio pegado: "Matrícula*".
   Apellido y nombres van separados (V4 D-68), como en "Modificar usuario"
   del prototipo. */
const label = {
    lastName: /^apellido\*?$/i,
    firstName: /^nombres\*?$/i,
    username: /^nombre de usuario/i,
    email: /^correo electrónico/i,
    password: /^contraseña inicial/i,
    passwordConfirm: /^repetir contraseña/i,
    lawyerMode: /^ficha de abogado/i,
    lawyerId: /^abogado\*?$/i,
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

/** Elige una ficha de abogado del select, por su nombre (V4 D-68, D-81). */
async function chooseLawyer(user: User, dialog: HTMLElement, lastName: string, firstName: string) {
    const select = within(dialog).getByLabelText(label.lawyerId)
    const option = within(select).getByRole('option', { name: new RegExp(personNameIn(lastName, firstName)) })
    await user.selectOptions(select, option)
}

/** Completa los datos personales y la contraseña del alta. */
async function fillPersonalData(user: User, dialog: HTMLElement, username = 'aperez') {
    await user.type(within(dialog).getByLabelText(label.lastName), 'Pérez')
    await user.type(within(dialog).getByLabelText(label.firstName), 'Ana')
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
    })

    describe('alta', () => {
        it('registra un abogado vinculándolo a una ficha existente', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fillPersonalData(user, dialog)
            // Una ficha sin cuenta: las que ya tienen una no se pueden vincular.
            await chooseLawyer(user, dialog, 'Campos', 'Julieta')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar usuario' }))

            expect(await screen.findByText('Usuario aperez registrado.')).toBeInTheDocument()
            expect(db.users.find((u) => u.username === 'aperez')?.lawyerId).toBe(9)
        })

        /* Es un 409, pero el problema es de UN campo: va en el select de
           fichas, no en un aviso suelto, y el modal queda abierto para
           elegir otra. */
        it('un abogado que ya tiene cuenta se marca en el campo', async () => {
            const { user } = renderPage()
            const before = db.users.length
            const dialog = await openCreate(user)

            await fillPersonalData(user, dialog)
            // Ignacio Peralta ya tiene la cuenta `iperalta`.
            await chooseLawyer(user, dialog, 'Peralta', 'Ignacio')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar usuario' }))

            expect(
                await within(dialog).findByText('El abogado ya tiene una cuenta de usuario activa.'),
            ).toBeInTheDocument()
            expect(within(dialog).getByLabelText(label.lawyerId).closest('.vz-field')).toHaveClass(
                'vz-field--error',
            )
            expect(screen.getByRole('dialog')).toBeInTheDocument()
            expect(db.users).toHaveLength(before)
        })

        it('registra un abogado junto con su ficha nueva', async () => {
            const { user } = renderPage()
            const dialog = await openCreate(user)

            await fillPersonalData(user, dialog)
            await user.selectOptions(within(dialog).getByLabelText(label.lawyerMode), 'Registrar un abogado nuevo')
            // La ficha nueva sólo pide la matrícula: el apellido y los nombres son
            // los del usuario, como en el prototipo. No se cargan dos veces.
            expect(within(dialog).getAllByLabelText(label.lastName)).toHaveLength(1)
            await user.type(within(dialog).getByLabelText(label.registrationNumber), '1-50000')
            await user.click(within(dialog).getByRole('button', { name: 'Registrar usuario' }))

            expect(await screen.findByText('Usuario aperez registrado.')).toBeInTheDocument()
            const lawyer = db.lawyers.find((l) => l.registrationNumber === '1-50000')
            // La ficha lleva los datos del usuario, sin tratamiento (V4 D-68, D-81).
            expect(lawyer).toMatchObject({ lastName: 'Pérez', firstName: 'Ana' })
            expect(db.users.find((u) => u.username === 'aperez')?.lawyerId).toBe(lawyer?.id)
        })

        it('enviado vacío marca los campos y no llama al servidor', async () => {
            const { user } = renderPage()
            const before = db.users.length
            const dialog = await openCreate(user)

            await user.click(within(dialog).getByRole('button', { name: 'Registrar usuario' }))

            expect(within(dialog).getByText('El apellido es obligatorio.')).toBeInTheDocument()
            expect(within(dialog).getByText('Los nombres son obligatorios.')).toBeInTheDocument()
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

            /* Se busca dentro de la referencia original a propósito: si el
               modal se remontara —como pasaba cuando este error se esparcía
               como props— `dialog` quedaría obsoleto y esto fallaría. Es la
               aserción del remonte, además de la del mensaje. */
            expect(within(dialog).getByText('Elegí al menos un perfil.')).toBeInTheDocument()
            expect(within(dialog).getByLabelText(label.lastName)).toHaveValue('Pérez')
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

            // El subtítulo del prototipo: "Apellido, Nombres · usuario".
            expect(dialog).toHaveTextContent('Ávila, Romina · ravila')
            expect(within(dialog).getByLabelText(label.lastName)).toHaveValue('Ávila')
            const firstName = within(dialog).getByLabelText(label.firstName)
            expect(firstName).toHaveValue('Romina')
            expect(within(dialog).getByRole('checkbox', { name: /^secretaría/i })).toBeChecked()

            await user.clear(firstName)
            await user.type(firstName, 'Romina B.')
            await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

            expect(await screen.findByText('Usuario ravila actualizado.')).toBeInTheDocument()
            expect(db.users.find((u) => u.username === 'ravila')).toMatchObject({ lastName: 'Ávila', firstName: 'Romina B.' })
        })
    })

    describe('baja', () => {
        it('elimina al usuario, avisa y lo saca del listado', async () => {
            const { user } = renderPage()
            await screen.findByRole('cell', { name: 'gestion' })

            await user.click(within(rowOf('gestion')).getByRole('button', { name: 'Eliminar' }))
            await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }))

            expect(
                await screen.findByText(new RegExp(`^${personNameIn('Estudio', 'Gestión')} Eliminado correctamente\\.$`)),
            ).toBeInTheDocument()
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
    })
})
