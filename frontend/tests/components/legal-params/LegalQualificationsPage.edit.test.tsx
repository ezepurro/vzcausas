import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { server } from '@/shared/mocks/server'
import { db, errorBody } from '@/shared/mocks'
import { LegalQualificationsPage } from '@/features/legal-params/pages/LegalQualificationsPage'

/**
 * Modificar calificación legal (HU-49), desde "Modificar" en cada fila. Va en
 * su propio archivo para no pasar el techo de `LegalQualificationsPage.test.tsx`
 * (TESTING.md §4). Los textos salen del formulario "Modificar calificación
 * legal" del prototipo: el nombre como subtítulo, la nota "Se usa en N
 * causas. Cambiar el plazo recalcula su prescripción." y "Calificación
 * actualizada.".
 *
 * Robo calificado (1, 96 meses) la registran causas; Homicidio simple (5) no
 * la registra ninguna.
 *
 * @backend CA-49.5 CA-49.6
 * (`activeCases` no se modifica: el `PATCH` no lo trae y la tabla lo vuelve a
 * pedir; el `400` de un id que no es entero no se puede provocar desde la
 * pantalla)
 */

function renderPage(as = 'gestion') {
    return renderWithProviders(<LegalQualificationsPage />, { as, route: '/calificaciones-legales' })
}

type User = ReturnType<typeof renderPage>['user']

const ROBO = 'Robo calificado — art. 167 inc. 2 CP'
const HOMICIDIO = 'Homicidio simple — art. 79 CP'

function rowOf(name: string) {
    return screen.getByRole('cell', { name }).closest('tr') as HTMLElement
}

async function openEdit(user: User, name = ROBO) {
    await screen.findByRole('cell', { name })
    await user.click(within(rowOf(name)).getByRole('button', { name: 'Modificar' }))
    return screen.getByRole('dialog', { name: /Modificar calificación legal/ })
}

async function save(user: User, dialog: HTMLElement) {
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
}

const stored = (id: number) => db.legalQualifications.find((q) => q.id === id)

describe('LegalQualificationsPage · modificar calificación legal (HU-49)', () => {
    /* CA-49.1: la modifican los tres perfiles (D-39). Alcanza con el de menos
       permisos y con un abogado (TESTING.md §5). */
    it.each([['la Secretaría', 'gestion'], ['un abogado', 'mrios']])(
        '%s tiene "Modificar" y "Eliminar" habilitados en cada fila',
        async (_, username) => {
            renderPage(username)
            await screen.findByRole('cell', { name: ROBO })

            expect(within(rowOf(ROBO)).getByRole('button', { name: 'Modificar' })).toBeEnabled()
            expect(within(rowOf(ROBO)).getByRole('button', { name: 'Eliminar' })).toBeEnabled()
        },
    )

    /* CA-49.3: el plazo se carga en años y meses, como en el alta. */
    it('abre con el nombre y el plazo en años y meses', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user, 'Abuso de armas — art. 104 CP')

        expect(within(dialog).getByLabelText(/^Nombre de la calificación legal/)).toHaveValue('Abuso de armas — art. 104 CP')
        expect(within(dialog).getByLabelText(/^Años/)).toHaveValue('6')
        expect(within(dialog).getByLabelText(/^Meses/)).toHaveValue('6')
        expect(within(dialog).getByRole('button', { name: 'Guardar cambios' })).toBeEnabled()
    })

    /* CA-49.4: con causas que la usan, el prototipo avisa que el plazo nuevo
       recalcula su prescripción. */
    it('si la usan causas, avisa que cambiar el plazo recalcula su prescripción', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        expect(within(dialog).getByText(/^Se usa en \d+ causas?\. Cambiar el plazo recalcula su prescripción\.$/)).toBeInTheDocument()
    })

    it('si no la usa ninguna causa, no lleva la nota', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user, HOMICIDIO)

        expect(within(dialog).queryByText(/Cambiar el plazo recalcula/)).not.toBeInTheDocument()
    })

    /* CA-49.1 y CA-49.4: se guarda, avisa y la tabla muestra el plazo nuevo. */
    it('guarda el plazo nuevo, avisa y lo muestra en la tabla', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        const years = within(dialog).getByLabelText(/^Años/)
        await user.clear(years)
        await user.type(years, '10')
        await user.selectOptions(within(dialog).getByLabelText(/^Meses/), '6')
        await save(user, dialog)

        expect(await screen.findByRole('status')).toHaveTextContent('Calificación actualizada.')
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(await within(rowOf(ROBO)).findByText('10 años y 6 meses')).toBeInTheDocument()
        expect(stored(1)).toMatchObject({ name: ROBO, prescriptionMonths: 126 })
    })

    it('guarda el nombre nuevo y lo muestra en la tabla', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        const name = within(dialog).getByLabelText(/^Nombre de la calificación legal/)
        await user.clear(name)
        await user.type(name, 'Robo calificado por el uso de arma — art. 166 inc. 2 CP')
        await save(user, dialog)

        expect(await screen.findByRole('status')).toHaveTextContent('Calificación actualizada.')
        expect(await screen.findByRole('cell', { name: 'Robo calificado por el uso de arma — art. 166 inc. 2 CP' })).toBeInTheDocument()
        expect(stored(1)).toMatchObject({ prescriptionMonths: 96 })
    })

    /* CA-49.1: una petición sin ningún campo es un 400, así que sin cambios no se llama. */
    it('guardar sin cambios cierra el diálogo y no llama al servidor', async () => {
        let called = false
        server.use(
            http.patch('*/legal-qualifications/:qualificationId', () => {
                called = true
                return HttpResponse.json(errorBody('VALIDATION_ERROR', 'No debería llamarse.'), { status: 400 })
            }),
        )
        const { user } = renderPage()
        const dialog = await openEdit(user)

        // Un espacio de más no es un cambio.
        await user.type(within(dialog).getByLabelText(/^Nombre de la calificación legal/), ' ')
        await save(user, dialog)

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
        expect(called).toBe(false)
    })

    /* CA-49.3: el plazo total tiene que ser de al menos un mes. */
    it('un plazo de 0 años y 0 meses se marca en los años y no guarda', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        const years = within(dialog).getByLabelText(/^Años/)
        await user.clear(years)
        await user.type(years, '0')
        await save(user, dialog)

        expect(within(dialog).getByText('El plazo tiene que ser de al menos un mes.')).toBeInTheDocument()
        expect(stored(1)?.prescriptionMonths).toBe(96)
    })

    /* CA-49.2: el 409 de una denominación repetida es de un campo. */
    it('un nombre que ya tiene otra calificación se marca en el campo y deja el diálogo abierto', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        const name = within(dialog).getByLabelText(/^Nombre de la calificación legal/)
        await user.clear(name)
        await user.type(name, 'hurto simple — art. 162 cp')
        await save(user, dialog)

        expect(await within(dialog).findByText('Ya existe una calificación legal con esa denominación.')).toBeInTheDocument()
        expect(name.closest('.vz-field')).toHaveClass('vz-field--error')
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(stored(1)?.name).toBe(ROBO)
    })

    /* CA-49.6: la dieron de baja mientras el diálogo estaba abierto. El texto
       del aviso es el del backend. */
    it('si la calificación ya no existe, avisa, cierra el diálogo y la saca de la tabla', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        const qualification = stored(1)
        if (qualification) qualification.active = false
        const years = within(dialog).getByLabelText(/^Años/)
        await user.clear(years)
        await user.type(years, '9')
        await save(user, dialog)

        expect(await screen.findByText('No se encontró la calificación legal solicitada.')).toBeInTheDocument()
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
        await waitFor(() => expect(screen.queryByRole('cell', { name: ROBO })).not.toBeInTheDocument())
    })

    /* TESTING.md §11, mínimo por feature: el error del servidor. */
    it('si el servidor falla, avisa y deja el diálogo abierto', async () => {
        server.use(
            http.patch('*/legal-qualifications/:qualificationId', () =>
                HttpResponse.json(errorBody('INTERNAL_SERVER_ERROR', 'Error del servidor de prueba.'), { status: 500 }),
            ),
        )
        const { user } = renderPage()
        const dialog = await openEdit(user)

        const years = within(dialog).getByLabelText(/^Años/)
        await user.clear(years)
        await user.type(years, '9')
        await save(user, dialog)

        expect(await screen.findByRole('alert')).toHaveTextContent('Error del servidor de prueba.')
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(within(dialog).getByLabelText(/^Años/)).toHaveValue('9')
    })
})
