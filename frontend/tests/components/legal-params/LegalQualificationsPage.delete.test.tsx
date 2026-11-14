import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { server } from '@/shared/mocks/server'
import { db, errorBody } from '@/shared/mocks'
import { LegalQualificationsPage } from '@/features/legal-params/pages/LegalQualificationsPage'

/**
 * Dar de baja una calificación legal (HU-50), desde "Eliminar" en cada fila.
 * Los textos salen del diálogo "Eliminar calificación legal" del prototipo:
 * el nombre como subtítulo, la nota "Se usa en N causas, que la conservan.
 * Deja de ofrecerse al registrar causas nuevas." y "Calificación eliminada.".
 *
 * La baja procede aunque la usen causas (CA-50.3): no hay `409` que mostrar,
 * así que el diálogo se cierra al confirmar, como "Dar de baja el modelo".
 *
 * Robo calificado (1) la registran causas; Homicidio simple (5), ninguna.
 *
 * @backend CA-50.1 CA-50.3 CA-50.4
 * (que no se pueda reactivar, que las causas la sigan mostrando con su
 * prescripción y el `400` de un id que no es entero los resuelve el backend;
 * que deje de ofrecerse en "Registrar causa" lo prueba
 * `legalParamsMutations.cache.test.tsx`)
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

async function openDelete(user: User, name: string) {
    await screen.findByRole('cell', { name })
    await user.click(within(rowOf(name)).getByRole('button', { name: 'Eliminar' }))
    return screen.getByRole('dialog', { name: /Eliminar calificación legal/ })
}

async function confirm(user: User, dialog: HTMLElement) {
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
}

const stored = (id: number) => db.legalQualifications.find((q) => q.id === id)

describe('LegalQualificationsPage · dar de baja una calificación legal (HU-50)', () => {
    /* CA-50.3: el prototipo avisa que las causas que la usan la conservan. */
    it('si la usan causas, avisa que la conservan y que deja de ofrecerse', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user, ROBO)

        expect(within(dialog).getByText(ROBO)).toBeInTheDocument()
        expect(
            within(dialog).getByText(/^Se usa en \d+ causas?, que la conservan\. Deja de ofrecerse al registrar causas nuevas\.$/),
        ).toBeInTheDocument()
    })

    it('si no la usa ninguna causa, sólo avisa que deja de ofrecerse', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user, HOMICIDIO)

        expect(within(dialog).getByText('Deja de ofrecerse al registrar causas nuevas.')).toBeInTheDocument()
    })

    /* CA-50.1 y CA-50.3: la baja es lógica y procede aunque la usen causas. */
    it('da de baja una calificación en uso, avisa y la saca de la tabla', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user, ROBO)

        await confirm(user, dialog)

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(await screen.findByRole('status')).toHaveTextContent('Calificación eliminada.')
        await waitFor(() => expect(screen.queryByRole('cell', { name: ROBO })).not.toBeInTheDocument())
        expect(stored(1)).toMatchObject({ active: false })
    })

    /* CA-50.4: otro la dio de baja antes. El texto del aviso es el del backend,
       y la fila no vuelve: ya no existe. */
    it('si ya no existe, avisa y la fila no vuelve', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user, HOMICIDIO)

        const qualification = stored(5)
        if (qualification) qualification.active = false
        await confirm(user, dialog)

        expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró la calificación legal solicitada.')
        await waitFor(() => expect(screen.queryByRole('cell', { name: HOMICIDIO })).not.toBeInTheDocument())
    })

    /* TESTING.md §11, mínimo por feature: el error del servidor. La fila vuelve. */
    it('si el servidor falla, avisa y la fila vuelve a la tabla', async () => {
        server.use(
            http.delete('*/legal-qualifications/:qualificationId', () =>
                HttpResponse.json(errorBody('INTERNAL_SERVER_ERROR', 'Error del servidor de prueba.'), { status: 500 }),
            ),
        )
        const { user } = renderPage()
        const dialog = await openDelete(user, HOMICIDIO)

        await confirm(user, dialog)

        expect(await screen.findByRole('alert')).toHaveTextContent('Error del servidor de prueba.')
        expect(await screen.findByRole('cell', { name: HOMICIDIO })).toBeInTheDocument()
        expect(stored(5)).toMatchObject({ active: true })
    })
})
