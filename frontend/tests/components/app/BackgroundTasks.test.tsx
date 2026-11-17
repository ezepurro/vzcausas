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
import { GenerateCaseFilePage } from '@/features/cases/pages/GenerateCaseFilePage'

const CAPTION = 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado'

/** Lo que importa de la respuesta de `POST /cases/1/case-files`. */
const GENERATED = {
    document: { id: 'doc-v2', name: 'Expediente_13284571_v2.pdf', mimeType: 'application/pdf', sizeBytes: null },
    version: 2,
    parts: [{ position: 1 }, { position: 2 }, { position: 3 }],
}

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
    it('la tarjeta acompaña al expediente y, al terminar, lleva a verlo', async () => {
        const request = deferred()
        const { user } = renderWithProviders(<><Starter work={request.promise} /><BackgroundTaskTray /></>, { as: 'mrios' })

        await user.click(await screen.findByRole('button', { name: 'Empezar' }))
        expect(await within(await tray()).findByText('Generando expediente')).toBeInTheDocument()
        // Mientras corre no se cierra: es la única señal de que sigue.
        expect(screen.queryByRole('button', { name: /^Cerrar aviso/ })).not.toBeInTheDocument()

        request.resolve(GENERATED)

        expect(await screen.findByText('Expediente listo')).toBeInTheDocument()
        expect(screen.getByText(`Versión 2 · ${CAPTION}. Ya está en la documentación de la causa.`)).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Ver expediente' })).toHaveAttribute('href', '/causas/1/expediente')
        expect(screen.getByRole('link', { name: 'Ver causa' })).toHaveAttribute('href', '/causas/1')

        await user.click(screen.getByRole('button', { name: 'Cerrar aviso: Expediente listo' }))
        expect(screen.queryByRole('region', { name: 'Tareas en segundo plano' })).not.toBeInTheDocument()
    })

    it('"Ver expediente" abre "Generar expediente" con el diálogo para descargarlo o imprimirlo', async () => {
        const request = deferred()
        const { user } = renderWithProviders(<><Starter work={request.promise} /><BackgroundTaskTray /></>, {
            as: 'mrios',
            path: '/',
            routes: [{ path: '/causas/:caseId/expediente', element: <><GenerateCaseFilePage /><BackgroundTaskTray /></> }],
        })
        await user.click(await screen.findByRole('button', { name: 'Empezar' }))
        request.resolve(GENERATED)

        await user.click(await screen.findByRole('link', { name: 'Ver expediente' }))

        const dialog = await screen.findByRole('dialog', { name: 'Expediente generado' })
        expect(within(dialog).getByText('Expediente_13284571_v2.pdf')).toBeInTheDocument()
        expect(within(dialog).getByText('Versión 2 · 3 partes')).toBeInTheDocument()
        expect(within(dialog).getByRole('button', { name: 'Descargar' })).toBeInTheDocument()
        expect(within(dialog).getByRole('button', { name: 'Imprimir' })).toBeInTheDocument()
        // Lo que avisaba la tarjeta ya está en pantalla: se cierra.
        expect(screen.queryByText('Expediente listo')).not.toBeInTheDocument()
    })

    // Desde la tarjeta, la pantalla anterior no es la causa (era el tablero):
    // "Volver a la causa" no puede volver atrás.
    it('"Volver a la causa" del diálogo va a la causa aunque se haya llegado desde otra pantalla', async () => {
        const request = deferred()
        const { user } = renderWithProviders(<><h1>Tablero</h1><Starter work={request.promise} /><BackgroundTaskTray /></>, {
            as: 'mrios',
            path: '/',
            routes: [
                { path: '/causas/:caseId/expediente', element: <GenerateCaseFilePage /> },
                { path: '/causas/:caseId', element: <h1>Detalle de la causa</h1> },
            ],
        })
        await user.click(await screen.findByRole('button', { name: 'Empezar' }))
        request.resolve(GENERATED)
        await user.click(await screen.findByRole('link', { name: 'Ver expediente' }))
        const dialog = await screen.findByRole('dialog', { name: 'Expediente generado' })

        /* `useGoBack` mira el historial del navegador para saber si hay una
           pantalla anterior; el router en memoria de los tests no lo toca. Así
           queda como en la aplicación: con el tablero detrás. */
        window.history.replaceState({ idx: 1 }, '')
        try {
            await user.click(within(dialog).getByRole('button', { name: 'Volver a la causa' }))
        } finally {
            window.history.replaceState(null, '')
        }

        expect(await screen.findByRole('heading', { name: 'Detalle de la causa' })).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'Tablero' })).not.toBeInTheDocument()
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
            expect(screen.getByText(`Versión 1 · ${CAPTION}. Ya está en la documentación de la causa.`)).toBeInTheDocument()
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

        // Lo que vio Facundo con el mock: el expediente de antes del F5 no aparece nunca.
        it('mientras no aparece, muestra cuánto lleva y se puede cerrar', async () => {
            const me = signInAs('mrios')
            writeBackgroundTasks(me.id, [
                storedTask({ params: { caseId: 1, previousVersion: 9 }, startedAt: Date.now() - 90_000 }),
            ])

            const { user } = renderWithProviders(<BackgroundTaskTray />)

            expect(await screen.findByText('Generando expediente')).toBeInTheDocument()
            expect(screen.getByText(`${CAPTION}. Puede tardar unos minutos: te avisamos acá cuando esté listo.`)).toBeInTheDocument()
            expect(screen.getByText('Hace 1 min')).toBeInTheDocument()

            await user.click(screen.getByRole('button', { name: 'Cerrar aviso: Generando expediente' }))
            expect(screen.queryByRole('region', { name: 'Tareas en segundo plano' })).not.toBeInTheDocument()
            expect(readBackgroundTasks(me.id)).toEqual([])
        })

        it('a los 3 minutos sin aparecer, dice que el expediente está demorando y qué hacer', async () => {
            const me = signInAs('mrios')
            writeBackgroundTasks(me.id, [
                storedTask({ params: { caseId: 1, previousVersion: 9 }, startedAt: Date.now() - 3 * 60_000 - 1000 }),
            ])

            renderWithProviders(<BackgroundTaskTray />)

            expect(await screen.findByText('El expediente está demorando')).toBeInTheDocument()
            expect(
                screen.getByText(`${CAPTION}. Revisá la documentación de la causa: si ya aparece la versión nueva, está listo. Si no, podés volver a generarlo.`),
            ).toBeInTheDocument()
            expect(screen.queryByText(/^Hace /)).not.toBeInTheDocument()
        })

        it('con la carpeta pasa lo mismo: dice que está demorando', async () => {
            const me = signInAs('mrios')
            writeBackgroundTasks(me.id, [
                storedTask({ kind: 'cases.folder', params: { caseId: 11 }, startedAt: Date.now() - 10 * 60_000 }),
            ])

            renderWithProviders(<BackgroundTaskTray />)

            expect(await screen.findByText('La carpeta está demorando')).toBeInTheDocument()
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

            expect(await screen.findByText(
                '¿Seguro que deseas cerrar la sesión? Hay un expediente o una carpeta de Drive preparándose. Se va a terminar igual, pero no vas a ver el aviso: lo vas a encontrar en la causa.',
            )).toBeInTheDocument()
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
