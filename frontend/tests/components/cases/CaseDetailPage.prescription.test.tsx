import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { db } from '@/shared/mocks'
import { configureMocks } from '@/shared/mocks/server'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'

/**
 * Marcar la causa como prescripta (HU-33), desde el detalle. El modal y sus
 * textos son los del prototipo; las reglas, las de V4 §3.7 (D-52 a D-54, D-74).
 *
 * Con el reloj en el 15/09/2026:
 *
 * | Causa | Para qué está acá |
 * | --- | --- |
 * | 1 | Penal de `mrios`, con un plazo abierto que vence el 16/09/2026 |
 * | 2 | Administrativa: no prescribe |
 * | 23 | Penal sin calificaciones legales: no puede prescribir (D-74) |
 */

function renderPage(caseId: number, as: string) {
    return renderWithProviders(<CaseDetailPage />, {
        as,
        path: '/causas/:caseId',
        route: `/causas/${caseId}`,
    })
}

type User = ReturnType<typeof renderPage>['user']

const MARK = 'Marcar prescripta'
const headerOf = (name: string) => screen.findByRole('region', { name })

async function openModal(user: User, header: string) {
    await headerOf(header)
    await user.click(screen.getByRole('button', { name: MARK }))
    return screen.getByRole('dialog')
}

describe('CaseDetailPage · marcar prescripta', () => {
    usePrototypeToday()

    // CA-33.1 (el Administrador, aunque no sea el responsable, D-110), CA-33.3, CA-33.4, CA-33.5
    it('el Administrador que no es el responsable la marca: pasa a "Prescripta" y se cierra su plazo', async () => {
        const { user } = renderPage(1, 'fvazquez')
        const dialog = await openModal(user, 'Causa 13284571')

        expect(within(dialog).getByText('Marcar la causa como prescripta')).toBeInTheDocument()
        expect(within(dialog).getByLabelText(/^fecha de la prescripción/i)).toHaveValue('2026-09-15')
        await user.type(within(dialog).getByLabelText(/^resolución que la declara/i), 'Sentencia N° 214')
        await user.click(within(dialog).getByRole('button', { name: MARK }))

        expect(
            await screen.findByText('Causa marcada como prescripta. Se cerraron los plazos abiertos.'),
        ).toBeInTheDocument()
        const header = screen.getByRole('region', { name: 'Causa 13284571' })
        expect(await within(header).findByText('Prescripta')).toBeInTheDocument()
        expect(header).toHaveTextContent('Sin plazo abierto')
        expect(db.cases.find((c) => c.id === 1)?.prescriptionDeclaration).toMatchObject({
            prescriptionDate: '2026-09-15',
            resolution: 'Sentencia N° 214',
            registeredById: 1,
        })
    })

    /* Con demora de red, el modal se cerraba con el encabezado ya en
       "Prescripta" y la línea de vida todavía sin el pase. La mutación ahora
       espera la línea de vida: al cerrarse el modal ya lo muestra, sin `findBy`.
       Sin demora el test no distingue: la línea de vida volvería antes de mirar. */
    it('al cerrarse el modal, la línea de vida ya muestra el pase a "Prescripta"', async () => {
        const { user } = renderPage(1, 'fvazquez')
        const timeline = () =>
            screen.getByText('Ciclo de vida de la causa', { selector: '.vz-panel__title' })
                .closest('.vz-panel') as HTMLElement
        await screen.findByText('Ciclo de vida de la causa', { selector: '.vz-panel__title' })
        expect(await within(timeline()).findAllByRole('listitem')).toHaveLength(4)
        // Desde acá, leer la línea de vida tarda.
        configureMocks({ latencyProfile: { 'GET /cases/:caseId/timeline': 300 } })
        const dialog = await openModal(user, 'Causa 13284571')

        await user.type(within(dialog).getByLabelText(/^resolución que la declara/i), 'Sentencia N° 214')
        await user.click(within(dialog).getByRole('button', { name: MARK }))
        await screen.findByText('Causa marcada como prescripta. Se cerraron los plazos abiertos.')

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        const items = within(timeline()).getAllByRole('listitem')
        expect(items).toHaveLength(5)
        expect(items[0]).toHaveTextContent('Prescripta')
    })

    // CA-33.3: la resolución es obligatoria.
    it('sin la resolución marca el campo y no la marca', async () => {
        const { user } = renderPage(1, 'mrios')
        const dialog = await openModal(user, 'Causa 13284571')

        await user.click(within(dialog).getByRole('button', { name: MARK }))

        expect(
            within(dialog).getByText('La resolución que declara la prescripción es obligatoria.'),
        ).toBeInTheDocument()
        expect(db.cases.find((c) => c.id === 1)?.prescriptionDeclaration).toBeNull()
    })

    // CA-33.9: una causa penal sin calificación legal no prescribe (D-74).
    it('si la causa no tiene calificaciones, muestra el rechazo del servidor', async () => {
        const { user } = renderPage(23, 'mferreyra')
        const dialog = await openModal(user, 'Causa sin SAC')

        await user.type(within(dialog).getByLabelText(/^resolución que la declara/i), 'Auto N° 12')
        await user.click(within(dialog).getByRole('button', { name: MARK }))

        expect(
            await screen.findByText('La causa no tiene calificaciones legales: no puede prescribir.'),
        ).toBeInTheDocument()
        expect(db.cases.find((c) => c.id === 23)?.prescriptionDeclaration).toBeNull()
    })

    // CA-33.1 (D-110): el responsable, aunque sólo sea abogado, la marca.
    it('el abogado responsable puede abrir "Marcar prescripta"', async () => {
        const { user } = renderPage(1, 'mrios')
        const dialog = await openModal(user, 'Causa 13284571')

        expect(within(dialog).getByText('Marcar la causa como prescripta')).toBeInTheDocument()
    })

    // CA-33.1, CA-33.16 (D-110): un abogado que no es el responsable lo ve deshabilitado.
    it('un abogado que no es el responsable ve "Marcar prescripta" deshabilitado', async () => {
        renderPage(4, 'mrios')
        await headerOf('Causa 11845620')

        const button = screen.getByRole('button', { name: MARK })
        expect(button).toBeDisabled()
        expect(button).toHaveAttribute('title', expect.stringMatching(/^Solo el abogado responsable/))
    })

    // CA-33.2, CA-33.16: la Secretaría no tiene el botón.
    it('la secretaría no ve "Marcar prescripta"', async () => {
        renderPage(1, 'gestion')
        await headerOf('Causa 13284571')

        expect(screen.queryByRole('button', { name: MARK })).not.toBeInTheDocument()
    })

    // CA-33.9, CA-33.16: sólo en causas penales.
    it('una causa que no es penal no ofrece marcarla', async () => {
        renderPage(2, 'fvazquez')
        await headerOf('Causa 12907344')

        expect(screen.queryByRole('button', { name: MARK })).not.toBeInTheDocument()
    })
})
