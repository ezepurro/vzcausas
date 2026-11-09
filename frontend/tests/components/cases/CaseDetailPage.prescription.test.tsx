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

/** El botón de la causa entera (CA-33.16, D-113) y el que confirma en su modal. */
const MARK = 'Marcar toda la causa prescripta'
const SUBMIT = 'Marcar prescripta'
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
        await user.click(within(dialog).getByRole('button', { name: SUBMIT }))

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
        await user.click(within(dialog).getByRole('button', { name: SUBMIT }))
        await screen.findByText('Causa marcada como prescripta. Se cerraron los plazos abiertos.')

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        const items = within(timeline()).getAllByRole('listitem')
        // D-113: el pase de la causa y la declaración de su calificación, que se marca con ella.
        expect(items).toHaveLength(6)
        expect(items.some((item) => item.textContent?.includes('Causa prescripta'))).toBe(true)
        expect(items.some((item) => item.textContent?.includes('Calificación declarada prescripta'))).toBe(true)
    })

    // CA-33.3: la resolución es obligatoria.
    it('sin la resolución marca el campo y no la marca', async () => {
        const { user } = renderPage(1, 'mrios')
        const dialog = await openModal(user, 'Causa 13284571')

        await user.click(within(dialog).getByRole('button', { name: SUBMIT }))

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
        await user.click(within(dialog).getByRole('button', { name: SUBMIT }))

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

    /* D-113 (HU-33 revisada): la prescripción se declara por calificación. Causa 13
       (la lleva mferreyra): Amenazas coactivas, con el plazo cumplido, y Encubrimiento.
       Causa 7 (también de mferreyra): Amenazas coactivas y Lesiones graves, corriendo. */
    describe('declarar la prescripción de una calificación (D-113)', () => {
        const declareButton = (name: RegExp) => screen.getByRole('button', { name })
        const qualificationsList = async (header: string) =>
            within(await headerOf(header)).getByRole('list', { name: 'Calificaciones legales' })

        async function declare(user: User, name: RegExp, resolution: string) {
            await user.click(declareButton(name))
            const dialog = screen.getByRole('dialog')
            expect(within(dialog).getByText('Declarar prescripta la calificación')).toBeInTheDocument()
            await user.type(within(dialog).getByLabelText(/^resolución que la declara/i), resolution)
            await user.click(within(dialog).getByRole('button', { name: 'Declarar prescripta' }))
        }

        // CA-33.1, CA-33.4, CA-33.5, CA-33.19
        it('declara una calificación: queda "Prescripta el …" y la causa sigue abierta', async () => {
            const { user } = renderPage(13, 'mferreyra')
            const list = await qualificationsList('Causa 12660318')
            expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent('Plazo cumplido')

            await declare(user, /^Marcar prescripta: Amenazas coactivas/, 'Auto N° 88')

            expect(await screen.findByText('Calificación declarada prescripta.')).toBeInTheDocument()
            expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent('Prescripta el 15/09/2026')
            expect(screen.queryByRole('button', { name: /^Marcar prescripta: Amenazas coactivas/ })).not.toBeInTheDocument()
            const header = screen.getByRole('region', { name: 'Causa 12660318' })
            expect(within(header).queryByText('Prescripta', { exact: true })).not.toBeInTheDocument()
            expect(db.cases.find((c) => c.id === 13)?.qualifications.find((q) => q.legalQualificationId === 4)?.prescriptionDeclaration)
                .toMatchObject({ prescriptionDate: '2026-09-15', resolution: 'Auto N° 88' })
        })

        // CA-33.4: la última cierra la causa.
        it('al declarar la última calificación, la causa pasa a "Prescripta"', async () => {
            const { user } = renderPage(7, 'mferreyra')
            await qualificationsList('Causa 14118903')

            await declare(user, /^Marcar prescripta: Amenazas coactivas/, 'Auto N° 88')
            await screen.findByText('Calificación declarada prescripta.')
            await declare(user, /^Marcar prescripta: Lesiones graves/, 'Auto N° 91')

            expect(
                await screen.findByText('Causa marcada como prescripta. Se cerraron los plazos abiertos.'),
            ).toBeInTheDocument()
            const header = screen.getByRole('region', { name: 'Causa 14118903' })
            expect(await within(header).findByText('Prescripta')).toBeInTheDocument()
            expect(screen.queryByRole('button', { name: /^Marcar prescripta:/ })).not.toBeInTheDocument()

            // D-113: se declaró con los plazos corriendo. La barra no dice lo que resta:
            // va en rojo con la fecha de la declaración, y el porcentaje sigue siendo el del backend.
            const meter = screen.getByRole('meter', { name: 'Prescripción transcurrida' })
            const bar = meter.closest('.vz-presc') as HTMLElement
            expect(await within(bar).findByText('Prescripta el 15/09/2026')).toBeInTheDocument()
            expect(within(bar).queryByText(/^Restan /)).not.toBeInTheDocument()
            expect(meter).toHaveClass('vz-meter--danger')
            expect(meter).not.toHaveAttribute('aria-valuetext', '100 %')
        })

        // CA-33.1, CA-33.2, CA-33.16 (D-110)
        it('un abogado que no es el responsable los ve deshabilitados; la secretaría no los ve', async () => {
            const lawyer = renderPage(13, 'mrios')
            await qualificationsList('Causa 12660318')
            const button = declareButton(/^Marcar prescripta: Amenazas coactivas/)
            expect(button).toBeDisabled()
            expect(button).toHaveAttribute('title', expect.stringMatching(/^Solo el abogado responsable/))
            lawyer.unmount()

            renderPage(13, 'gestion')
            await qualificationsList('Causa 12660318')
            expect(screen.queryByRole('button', { name: /^Marcar prescripta:/ })).not.toBeInTheDocument()
        })
    })
})

