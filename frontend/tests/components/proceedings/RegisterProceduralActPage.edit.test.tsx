import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { personNameIn } from '../../setup/names'
import { server } from '@/shared/mocks/server'
import { db, errorBody } from '@/shared/mocks'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'
import { RegisterProceduralActPage } from '@/features/proceedings/pages/RegisterProceduralActPage'

/**
 * Modificar un acto procesal (HU-28). Es la misma pantalla que registrarlo,
 * abierta desde "Modificar" en un acto de la línea de vida, con el título
 * "Modificar acto procesal" y el botón "Guardar cambios" (prototipo).
 *
 * **Ruta que fija este test:** `/causas/:caseId/acto/:actId`. El prototipo no
 * tiene rutas; si el equipo elige otra, se cambia acá y en el router juntos.
 *
 * La causa 1 la lleva `mrios`; su acto más reciente es el 3 ("Oposición al
 * requerimiento de elevación", hace 4 días hábiles).
 *
 * @backend CA-28.4 CA-28.5 CA-28.6 CA-28.7 CA-28.8 CA-28.9 CA-28.11
 * (el recálculo del plazo y del estado de la causa, la reapertura, la causa
 * prescripta y los `404` los resuelve el servidor)
 */

const ACT_ID = 3

function renderDetail(as: string) {
    return renderWithProviders(<CaseDetailPage />, {
        as,
        path: '/causas/:caseId',
        route: '/causas/1',
        routes: [{ path: '/causas/:caseId/acto/:actId', element: <p>Pantalla de modificar acto</p> }],
    })
}

function renderEdit(as = 'mrios') {
    return renderWithProviders(<RegisterProceduralActPage />, {
        as,
        route: `/causas/1/acto/${ACT_ID}`,
        path: '/causas/:caseId/acto/:actId',
        routes: [{ path: '/causas/:caseId', element: <p>Detalle de la causa</p> }],
    })
}

/** "Modificar" del acto más reciente. El panel se busca como en `CaseDetailPage.timeline.test.tsx`. */
async function latestActModify() {
    const title = await screen.findByText('Ciclo de vida de la causa', { selector: '.vz-panel__title' })
    const timeline = title.closest('.vz-panel') as HTMLElement
    const [latest] = await within(timeline).findAllByRole('listitem')
    return within(latest).getByRole('button', { name: 'Modificar' })
}

async function modifyLatestAct(user: ReturnType<typeof renderDetail>['user']) {
    await user.click(await latestActModify())
}

describe('RegisterProceduralActPage · modificar acto procesal', () => {
    usePrototypeToday()

    // CA-28.1: el responsable abre el acto desde la línea de vida.
    it('el responsable abre "Modificar" desde la línea de vida', async () => {
        const { user } = renderDetail('mrios')
        await modifyLatestAct(user)

        expect(await screen.findByText('Pantalla de modificar acto')).toBeInTheDocument()
    })

    // CA-28.2 (D-30): ni otro abogado ni el Administrador modifican actos ajenos.
    // Va deshabilitado con una nota a la vista, como "Registrar acto procesal"
    // (tanda 15 de `docs/auditoria-front`); antes avisaba al tocarlo.
    it('a quien no es el responsable se lo muestra deshabilitado, con su nota, y no sale del detalle', async () => {
        const { user } = renderDetail('fvazquez')
        const modify = await latestActModify()
        const reason = new RegExp(
            `^Solo el abogado responsable \\(${personNameIn('Ríos', 'Malena')}\\) modifica y anula los actos procesales\\.$`,
        )

        expect(modify).toBeDisabled()
        expect(modify).toHaveAccessibleDescription(reason)
        expect(screen.getByText(reason)).toBeVisible()
        await user.click(modify)
        expect(screen.queryByText('Pantalla de modificar acto')).not.toBeInTheDocument()
    })

    // CA-28.1, CA-28.10: guarda, vuelve al detalle y queda asentado quién lo modificó.
    it('corrige las observaciones, vuelve al detalle y queda asentado quién lo hizo', async () => {
        const { user } = renderEdit()

        expect(await screen.findByRole('heading', { name: 'Modificar acto procesal' })).toBeInTheDocument()
        const notes = screen.getByLabelText(/^observaciones/i)
        expect(notes).toHaveValue('Abre el plazo de 5 días hábiles para oponerse.')

        await user.clear(notes)
        await user.type(notes, 'Se corrigió la observación.')
        await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

        expect(await screen.findByText('Detalle de la causa')).toBeInTheDocument()
        // El aviso suma el ícono y el botón de cerrar: el principio y el final se miran en el mensaje.
        expect(
            within(screen.getByRole('status')).getByText(/^Acto modificado.*El cambio queda asentado con usuario y fecha\.$/),
        ).toBeInTheDocument()
        expect(db.proceduralActs.find((a) => a.id === ACT_ID)).toMatchObject({
            notes: 'Se corrigió la observación.',
            lastModifiedById: 3,
        })
    })

    // Mínimo por feature (TESTING.md §11): el error del servidor se muestra y no se sale.
    it('si el servidor rechaza el cambio, muestra su mensaje', async () => {
        server.use(
            http.patch('*/cases/:caseId/procedural-acts/:actId', () =>
                HttpResponse.json(
                    errorBody('CASE_IN_TERMINAL_STATE', 'La causa está prescripta: sus actos procesales no se pueden modificar.'),
                    { status: 422 },
                ),
            ),
        )
        const { user } = renderEdit()

        await user.type(await screen.findByLabelText(/^observaciones/i), ' Otra.')
        await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

        expect(
            await screen.findByText('La causa está prescripta: sus actos procesales no se pueden modificar.'),
        ).toBeInTheDocument()
        expect(screen.queryByText('Detalle de la causa')).not.toBeInTheDocument()
    })
})
