/**
 * Tareas en segundo plano: la tarjeta que sigue al expediente (HU25) y a la
 * carpeta en Drive (HU39) mientras se trabaja en otra pantalla, y que después
 * de un F5 vuelve a preguntarle al servidor cómo terminaron.
 *
 * Usa los manejadores de verdad (`features/cases/api/caseTasks.ts`) contra el
 * mock:
 *
 * | Causa | Para qué |
 * | --- | --- |
 * | 1 | Su carpeta tiene el expediente v1 y está `CREATED` |
 * | 11 | Su carpeta sigue `CREATING` |
 */

import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders, signInAs } from '../../setup/render'
import { db } from '@/shared/mocks'
import { ApiError } from '@/shared/api/ApiError'
import { BackgroundTaskTray } from '@/app/layouts/BackgroundTaskTray'
import { useAuth } from '@/app/providers/AuthContext'
import { useBackgroundTasks, type BackgroundTask } from '@/app/providers/BackgroundTasksContext'
import { readBackgroundTasks, writeBackgroundTasks } from '@/app/providers/backgroundTaskStorage'
import { LogoutConfirmModal } from '@/features/auth/components/LogoutConfirmModal'

const CAPTION = 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado'

function userId(username: string): number {
    const user = db.users.find((u) => u.username === username)
    if (!user) throw new Error(`No hay usuario ${username}`)
    return user.id
}

function storedTask(overrides: Partial<BackgroundTask>): BackgroundTask {
    return {
        id: 'guardada',
        kind: 'cases.caseFile',
        subject: CAPTION,
        params: { caseId: 1, previousVersion: 0 },
        startedAt: Date.now(),
        status: 'running',
        result: null,
        message: null,
        ...overrides,
    }
}

/** Una tarea que empieza con un pedido que el test resuelve o rechaza. */
function deferred() {
    let resolve!: (value: unknown) => void
    let reject!: (error: unknown) => void
    const promise = new Promise<unknown>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

function Starter({ work }: { work: Promise<unknown> }) {
    const tasks = useBackgroundTasks()
    return (
        <button
            type="button"
            onClick={() => tasks.start({ kind: 'cases.caseFile', subject: CAPTION, params: { caseId: 1, previousVersion: 1 }, work })}
        >
            Empezar
        </button>
    )
}

function SignOut() {
    const { signOut } = useAuth()
    return (
        <>
            <button type="button" onClick={() => signOut('user')}>Salir a pedido</button>
            <button type="button" onClick={() => signOut('expired')}>Sesión vencida</button>
        </>
    )
}

const tray = () => screen.findByRole('region', { name: 'Tareas en segundo plano' })

describe('Tareas en segundo plano', () => {
    it('la tarjeta acompaña al expediente y, al terminar, ofrece descargarlo', async () => {
        const request = deferred()
        const { user } = renderWithProviders(<><Starter work={request.promise} /><BackgroundTaskTray /></>, { as: 'mrios' })

        await user.click(await screen.findByRole('button', { name: 'Empezar' }))
        expect(await within(await tray()).findByText('Generando expediente')).toBeInTheDocument()
        // Mientras corre no se cierra: es la única señal de que sigue.
        expect(screen.queryByRole('button', { name: /^Cerrar aviso/ })).not.toBeInTheDocument()

        request.resolve({ document: { id: 'doc-v2', name: 'Expediente_13284571_v2.pdf', mimeType: 'application/pdf' }, version: 2 })

        expect(await screen.findByText('Expediente listo')).toBeInTheDocument()
        expect(screen.getByText(`Versión 2 · ${CAPTION}. Quedó en la documentación de la causa.`)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Descargar' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Ver causa' })).toHaveAttribute('href', '/causas/1')

        await user.click(screen.getByRole('button', { name: 'Cerrar aviso: Expediente listo' }))
        expect(screen.queryByRole('region', { name: 'Tareas en segundo plano' })).not.toBeInTheDocument()
    })

    it('si el servidor lo rechaza, la tarjeta lo dice con su mensaje', async () => {
        const request = deferred()
        const { user } = renderWithProviders(<><Starter work={request.promise} /><BackgroundTaskTray /></>, { as: 'mrios' })
        await user.click(await screen.findByRole('button', { name: 'Empezar' }))

        request.reject(new ApiError(422, 'La carpeta de la causa no está disponible.', 'CASE_FOLDER_NOT_AVAILABLE'))

        expect(await screen.findByText('No se pudo generar el expediente')).toBeInTheDocument()
        expect(screen.getByText(`${CAPTION}. La carpeta de la causa no está disponible.`)).toBeInTheDocument()
    })

    it('sin respuesta no se da por fallido: puede haberse generado igual', async () => {
        const request = deferred()
        const { user } = renderWithProviders(<><Starter work={request.promise} /><BackgroundTaskTray /></>, { as: 'mrios' })
        await user.click(await screen.findByRole('button', { name: 'Empezar' }))

        request.reject(new ApiError(0, 'Error de red. Verificá tu conexión a internet.'))
        await Promise.resolve()

        expect(await screen.findByText('Generando expediente')).toBeInTheDocument()
        expect(screen.queryByText('No se pudo generar el expediente')).not.toBeInTheDocument()
    })

    describe('después de un F5', () => {
        it('vuelve a preguntar por el expediente y lo encuentra en la documentación', async () => {
            const me = signInAs('mrios')
            writeBackgroundTasks(me.id, [storedTask({ params: { caseId: 1, previousVersion: 0 } })])

            renderWithProviders(<BackgroundTaskTray />)

            expect(await screen.findByText('Expediente listo')).toBeInTheDocument()
            expect(screen.getByText(`Versión 1 · ${CAPTION}. Quedó en la documentación de la causa.`)).toBeInTheDocument()
        })

        it('vuelve a preguntar por la carpeta y ofrece abrirla en Drive', async () => {
            const me = signInAs('mrios')
            writeBackgroundTasks(me.id, [storedTask({ kind: 'cases.folder', params: { caseId: 1 } })])

            renderWithProviders(<BackgroundTaskTray />)

            expect(await screen.findByText('Carpeta creada')).toBeInTheDocument()
            expect(screen.getByRole('link', { name: 'Abrir en Drive' })).toHaveAttribute(
                'href',
                'https://drive.google.com/drive/folders/vz-causa-1',
            )
        })

        it('si pasó el tiempo y sigue sin saberse, deja de preguntar y lo dice', async () => {
            const me = signInAs('mrios')
            writeBackgroundTasks(me.id, [
                storedTask({ kind: 'cases.folder', params: { caseId: 11 }, startedAt: Date.now() - 10 * 60_000 }),
            ])

            renderWithProviders(<BackgroundTaskTray />)

            expect(await screen.findByText('La carpeta se sigue creando')).toBeInTheDocument()
        })

        it('las tareas de otra persona que usó la pestaña no se muestran', async () => {
            signInAs('mrios')
            writeBackgroundTasks(userId('fvazquez'), [storedTask({})])

            renderWithProviders(<><p>Pantalla</p><BackgroundTaskTray /></>)

            expect(await screen.findByText('Pantalla')).toBeInTheDocument()
            expect(screen.queryByRole('region', { name: 'Tareas en segundo plano' })).not.toBeInTheDocument()
        })
    })

    describe('al cerrar la sesión', () => {
        /* La causa 11 sigue `CREATING`: la tarea queda en curso durante el test. */
        const running = () => storedTask({ kind: 'cases.folder', params: { caseId: 11 } })

        it('la confirmación avisa que hay una tarea en curso', async () => {
            const me = signInAs('mrios')
            writeBackgroundTasks(me.id, [running()])

            renderWithProviders(<LogoutConfirmModal onClose={() => {}} />)

            expect(await screen.findByText(/Tenés una tarea en curso \(expediente o carpeta en Drive\)\. Se va a terminar igual, pero no vas a ver el aviso/)).toBeInTheDocument()
        })

        it('sin tareas en curso, la confirmación es la de siempre', async () => {
            renderWithProviders(<LogoutConfirmModal onClose={() => {}} />, { as: 'mrios' })

            expect(await screen.findByText('¿Seguro que deseas cerrar la sesión?')).toBeInTheDocument()
        })

        it('a pedido, se borran las tareas guardadas; si se venció, se conservan', async () => {
            const me = signInAs('mrios')
            writeBackgroundTasks(me.id, [running()])
            const first = renderWithProviders(<SignOut />)
            await first.user.click(await screen.findByRole('button', { name: 'Sesión vencida' }))
            expect(readBackgroundTasks(me.id)).toHaveLength(1)
            first.unmount()

            signInAs('mrios')
            const second = renderWithProviders(<SignOut />)
            await second.user.click(await screen.findByRole('button', { name: 'Salir a pedido' }))
            expect(readBackgroundTasks(me.id)).toHaveLength(0)
        })
    })
})
