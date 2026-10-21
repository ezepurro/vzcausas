import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, waitForSession } from '../../setup/render'
import { db, resetMockDb } from '@/shared/mocks'
import { useAuth } from '@/app/providers/AuthContext'
import type { SignOutReason } from '@/app/providers/AuthContext'
import { RegisterCasePage } from '@/features/cases/pages/RegisterCasePage'
import { emptyCaseForm } from '@/features/cases/utils/caseForm'
import { readCaseDraft, writeCaseDraft } from '@/features/cases/utils/caseDraft'
import type { CaseFormValues } from '@/features/cases/types/case'

/**
 * El borrador del alta de causa: quien se va a otra pantalla y vuelve elige si
 * recupera lo cargado. No es un criterio de HU18: ver `features/cases/CAMBIOS.md`.
 *
 * El borrador se escribe antes de renderizar, como si el usuario hubiera
 * cargado algo y se hubiera ido.
 */

const CAPTION = 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado'
/** Un id que el mock no tiene: la calificación "se dio de baja". */
const GONE_QUALIFICATION = 999

const userId = (username = 'gestion') => db.users.find((u) => u.username === username)!.id

const draft = (overrides: Partial<CaseFormValues> = {}): CaseFormValues => ({
    ...emptyCaseForm(),
    caption: CAPTION,
    clientId: '1',
    responsibleLawyerId: '3',
    ...overrides,
})

function renderPage() {
    return renderWithProviders(<RegisterCasePage />, {
        as: 'gestion',
        path: '/causas/nueva',
        route: '/causas/nueva',
        routes: [
            { path: '/causas', element: <p>Listado de causas</p> },
            { path: '/causas/:caseId', element: <p>Detalle de la causa</p> },
        ],
    })
}

const caption = () => screen.getByLabelText(/^Carátula/) as HTMLInputElement
const draftDialog = () => screen.queryByRole('dialog', { name: 'Tenés una causa sin terminar' })

describe('RegisterCasePage · borrador', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0))
        resetMockDb()
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    it('sin borrador, no pregunta nada y el formulario arranca vacío', async () => {
        renderPage()
        await waitForSession()

        expect(draftDialog()).not.toBeInTheDocument()
        expect(caption().value).toBe('')
    })

    it('con borrador, "Recuperar" carga lo que había', async () => {
        writeCaseDraft(userId(), draft())
        const { user } = renderPage()

        await user.click(await screen.findByRole('button', { name: 'Recuperar' }))

        expect(draftDialog()).not.toBeInTheDocument()
        expect(caption().value).toBe(CAPTION)
        expect(readCaseDraft(userId())).toEqual(draft())
    })

    it('"Empezar de nuevo" deja el formulario vacío y borra el borrador', async () => {
        writeCaseDraft(userId(), draft())
        const { user } = renderPage()

        await user.click(await screen.findByRole('button', { name: 'Empezar de nuevo' }))

        expect(draftDialog()).not.toBeInTheDocument()
        expect(caption().value).toBe('')
        expect(readCaseDraft(userId())).toBeNull()
    })

    it('Escape y un click en el fondo no cierran la pregunta ni borran el borrador', async () => {
        writeCaseDraft(userId(), draft())
        const { user } = renderPage()
        await screen.findByRole('button', { name: 'Recuperar' })

        await user.keyboard('{Escape}')
        await user.click(document.querySelector('.vz-modal-backdrop')!)

        expect(draftDialog()).toBeInTheDocument()
        expect(readCaseDraft(userId())).toEqual(draft())
    })

    it('lo que se carga queda en el borrador', async () => {
        const { user } = renderPage()
        await waitForSession()

        await user.type(caption(), 'Una carátula')

        expect(readCaseDraft(userId())?.caption).toBe('Una carátula')
    })

    it('Cancelar borra el borrador', async () => {
        writeCaseDraft(userId(), draft())
        const { user } = renderPage()
        await user.click(await screen.findByRole('button', { name: 'Recuperar' }))

        await user.click(screen.getByRole('button', { name: 'Cancelar' }))

        expect(await screen.findByText('Listado de causas')).toBeInTheDocument()
        expect(readCaseDraft(userId())).toBeNull()
    })

    it('registrar la causa borra el borrador', async () => {
        writeCaseDraft(userId(), draft())
        const { user } = renderPage()
        await user.click(await screen.findByRole('button', { name: 'Recuperar' }))
        await screen.findByRole('option', { name: 'GÓMEZ, Ariel Fernando · DNI 34.812.905' })

        await user.click(screen.getByRole('button', { name: 'Registrar causa' }))

        expect(await screen.findByText('Detalle de la causa')).toBeInTheDocument()
        expect(readCaseDraft(userId())).toBeNull()
    })

    describe('una calificación que ya no está vigente (CA-18.10)', () => {
        const withGone = () =>
            draft({ legalQualifications: [{ legalQualificationId: GONE_QUALIFICATION, offenseDate: '' }] })

        it('se muestra como dada de baja, no deja registrar y se puede quitar', async () => {
            writeCaseDraft(userId(), withGone())
            const { user } = renderPage()
            await user.click(await screen.findByRole('button', { name: 'Recuperar' }))

            expect(await screen.findByText('Calificación dada de baja')).toBeInTheDocument()

            await user.click(screen.getByRole('button', { name: 'Registrar causa' }))
            expect(
                await screen.findByText('Quitá la calificación dada de baja: ya no está vigente.'),
            ).toBeInTheDocument()
            expect(screen.queryByText('Detalle de la causa')).not.toBeInTheDocument()

            await user.click(screen.getByRole('button', { name: 'Quitar calificación dada de baja' }))
            expect(screen.queryByText('Calificación dada de baja')).not.toBeInTheDocument()
            expect(readCaseDraft(userId())?.legalQualifications).toEqual([])
        })
    })

    describe('al cerrar la sesión', () => {
        function SignOut({ reason }: { reason: SignOutReason }) {
            const { signOut } = useAuth()
            return <button onClick={() => signOut(reason)}>Salir</button>
        }

        it.each([
            ['a pedido del usuario se borra', 'user' as const, null],
            ['por un token vencido se conserva', 'expired' as const, draft()],
        ])('%s', async (_, reason, expected) => {
            writeCaseDraft(userId(), draft())
            const { user } = renderWithProviders(<SignOut reason={reason} />, { as: 'gestion' })
            await waitForSession()

            await user.click(screen.getByRole('button', { name: 'Salir' }))

            await waitFor(() => expect(readCaseDraft(userId())).toEqual(expected))
        })
    })
})
