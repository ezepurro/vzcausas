import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { personNameIn } from '../../setup/names'
import { server } from '@/shared/mocks/server'
import { db, errorBody, ERRORS } from '@/shared/mocks'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'

/**
 * Registrar acto interruptivo (HU-31), desde el detalle de la causa. El modal
 * y sus textos son los del prototipo; las reglas, las de V4 §3.9.
 *
 * Con el reloj en el 15/09/2026:
 *
 * | Causa | Para qué está acá |
 * | --- | --- |
 * | 1 | Penal de `mrios`, con un acto interruptivo del 04/07/2024 |
 * | 22 | Amparo: la prescripción no aplica |
 */

function renderPage(caseId: number, as = 'mrios') {
    return renderWithProviders(<CaseDetailPage />, {
        as,
        path: '/causas/:caseId',
        route: `/causas/${caseId}`,
    })
}

type User = ReturnType<typeof renderPage>['user']

const OPEN = 'Registrar acto interruptivo'
const headerOf = (name: string) => screen.findByRole('region', { name })

async function openForm(user: User) {
    await headerOf('Causa 13284571')
    await user.click(screen.getByRole('button', { name: OPEN }))
    return screen.getByRole('dialog')
}

async function fill(user: User, dialog: HTMLElement, name: string, date = '2026-09-15') {
    const actDate = within(dialog).getByLabelText(/^fecha del acto/i)
    await user.clear(actDate)
    await user.type(actDate, date)
    if (name) await user.type(within(dialog).getByLabelText(/^acto interruptivo/i), name)
}

describe('CaseDetailPage · acto interruptivo', () => {
    usePrototypeToday()

    // CA-31.1, CA-31.2
    it('el responsable lo registra y la prescripción se reinicia desde su fecha', async () => {
        const { user } = renderPage(1)
        const dialog = await openForm(user)

        expect(dialog).toHaveTextContent(
            'Un acto interruptivo reinicia el cómputo de la prescripción de la acción desde su fecha.',
        )
        await fill(user, dialog, 'Citación a juicio')
        await user.click(within(dialog).getByRole('button', { name: OPEN }))

        expect(
            await screen.findByText('Acto interruptivo registrado. La prescripción se reinició desde el 15/09/2026.'),
        ).toBeInTheDocument()
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        // Robo calificado prescribe a los 8 años: corre de nuevo desde el acto.
        expect(await screen.findByText('15/09/2034')).toBeInTheDocument()
        expect(
            screen.getByText(/Cómputo reiniciado por el acto interruptivo registrado el 15\/09\/2026\./),
        ).toBeInTheDocument()
        expect(db.interruptiveActs.some((a) => a.caseId === 1 && a.name === 'Citación a juicio')).toBe(true)
    })

    // CA-31.6: no mueve la causa. Se compara sólo el recuadro del estado actual:
    // la barra de prescripción, en el mismo encabezado, sí cambia (CA-31.2).
    it('el estado procesal y el vencimiento de la causa no cambian', async () => {
        const { user } = renderPage(1)
        const dialog = await openForm(user)
        const header = screen.getByRole('region', { name: 'Causa 13284571' })
        const state = within(header).getByText('Estado procesal actual').parentElement as HTMLElement
        const before = state.textContent

        await fill(user, dialog, 'Indagatoria')
        await user.click(within(dialog).getByRole('button', { name: OPEN }))
        await screen.findByText(/^Acto interruptivo registrado\./)
        // La causa ya se volvió a pedir: la prescripción corre desde el acto nuevo.
        await within(header).findByText('15/09/2034')

        expect(state).toHaveTextContent('Oposición al requerimiento de elevación')
        expect(state.textContent).toBe(before)
    })

    // CA-31.8
    it('enviado sin denominación marca el campo y no registra nada', async () => {
        const { user } = renderPage(1)
        const before = db.interruptiveActs.length
        const dialog = await openForm(user)

        await user.click(within(dialog).getByRole('button', { name: OPEN }))

        expect(within(dialog).getByText('El acto interruptivo es obligatorio.')).toBeInTheDocument()
        expect(db.interruptiveActs).toHaveLength(before)
    })

    // CA-31.8: el backend también valida, y su error va en el campo.
    it('un 400 del servidor se marca en su campo', async () => {
        server.use(
            http.post('*/cases/:caseId/interruptive-acts', () =>
                HttpResponse.json(
                    errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                        actDate: 'No puede ser posterior a hoy.',
                    }),
                    { status: 400 },
                ),
            ),
        )
        const { user } = renderPage(1)
        const dialog = await openForm(user)

        await fill(user, dialog, 'Indagatoria')
        await user.click(within(dialog).getByRole('button', { name: OPEN }))

        expect(await within(dialog).findByText('No puede ser posterior a hoy.')).toBeInTheDocument()
        expect(within(dialog).getByLabelText(/^fecha del acto/i).closest('.vz-field')).toHaveClass('vz-field--error')
    })

    // CA-31.10
    it('si la causa está en un estado terminal, muestra el rechazo del servidor', async () => {
        server.use(
            http.post('*/cases/:caseId/interruptive-acts', () =>
                HttpResponse.json(ERRORS.caseInTerminalStateOperation, { status: 422 }),
            ),
        )
        const { user } = renderPage(1)
        const dialog = await openForm(user)

        await fill(user, dialog, 'Indagatoria')
        await user.click(within(dialog).getByRole('button', { name: OPEN }))

        expect(
            await screen.findByText('La causa se encuentra en un estado terminal y no admite esta operación.'),
        ).toBeInTheDocument()
    })

    // CA-31.11: el prototipo no abre el formulario y avisa quién es el responsable.
    it('a quien no es el responsable le avisa y no abre el formulario', async () => {
        const { user } = renderPage(1, 'fvazquez')
        await headerOf('Causa 13284571')

        await user.click(screen.getByRole('button', { name: OPEN }))

        expect(
            await screen.findByText(
                new RegExp(`^Solo el abogado responsable de la causa \\(${personNameIn('Ríos', 'Malena')}\\) registra actos interruptivos\\.$`),
            ),
        ).toBeInTheDocument()
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // CA-31.9: sólo en el fuero penal.
    it('una causa que no es penal no ofrece registrarlo', async () => {
        renderPage(22, 'lortega')
        await headerOf('Causa 13619027')

        expect(screen.queryByRole('button', { name: OPEN })).not.toBeInTheDocument()
    })
})
