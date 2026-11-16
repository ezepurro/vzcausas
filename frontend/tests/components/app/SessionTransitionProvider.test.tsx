/**
 * El telón entre la app y el login (cierre e inicio de sesión): tapa la
 * pantalla, cambia la sesión con la pantalla tapada y la destapa. Sin
 * animación (movimiento reducido o jsdom), el cambio es directo.
 */

import { useEffect } from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionTransitionProvider } from '@/app/providers/SessionTransitionProvider'
import { SESSION_TRANSITION_MS } from '@/app/providers/sessionTransitionTiming'
import {
    useSessionTransition,
    type PlaySessionTransition,
    type SessionTransitionRequest,
} from '@/app/providers/SessionTransitionContext'

let play: PlaySessionTransition

function Capture({ onReady }: { onReady: (play: PlaySessionTransition) => void }) {
    const current = useSessionTransition()
    useEffect(() => { onReady(current) }, [current, onReady])
    return null
}

function renderProvider() {
    render(
        <SessionTransitionProvider>
            <Capture onReady={(captured) => { play = captured }} />
        </SessionTransitionProvider>,
    )
}

/** Una promesa que el test resuelve o rechaza cuando quiere. */
function deferred() {
    let resolve!: () => void
    let reject!: (error: unknown) => void
    const promise = new Promise<void>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

const curtain = () => screen.queryByTestId('session-transition')
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })

function stubMotion(reduced: boolean) {
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: reduced && query.includes('reduce'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
    }))
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16))
}

const LEAVE = SESSION_TRANSITION_MS.leave
/** Lo que tarda `nextPaint`: dos cuadros de 16 ms. */
const PAINT = 32

describe('SessionTransitionProvider', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

    describe('con animación', () => {
        beforeEach(() => stubMotion(false))

        it('tapa la pantalla, cambia la sesión recién cuando terminó el pedido y destapa', async () => {
            renderProvider()
            const swap = vi.fn()
            const request = deferred()
            let done = false

            act(() => {
                void play({ variant: 'leave', title: 'Hasta pronto, Malena', detail: 'Cerrando sesión…', waitFor: request.promise, swap })
                    .then(() => { done = true })
            })

            expect(curtain()).toHaveTextContent('Hasta pronto, Malena')
            expect(curtain()).toHaveTextContent('Cerrando sesión…')

            // Pasó lo mínimo que se queda tapada, pero el pedido sigue en vuelo.
            await advance(LEAVE.cover + LEAVE.hold)
            expect(swap).not.toHaveBeenCalled()

            await act(async () => { request.resolve() })
            expect(swap).toHaveBeenCalledTimes(1)
            expect(curtain()).toBeInTheDocument()

            await advance(PAINT + LEAVE.reveal)
            expect(curtain()).not.toBeInTheDocument()
            expect(done).toBe(true)
        })

        it('no cambia la sesión antes de que la vuelta del monograma termine, aunque el pedido ya haya vuelto', async () => {
            renderProvider()
            const swap = vi.fn()

            act(() => { void play({ variant: 'leave', title: 'Hasta pronto', waitFor: Promise.resolve(), swap }) })

            await advance(LEAVE.cover + LEAVE.hold - 1)
            expect(swap).not.toHaveBeenCalled()

            await advance(1)
            expect(swap).toHaveBeenCalledTimes(1)
        })

        it('si el pedido falla, la sesión se cierra igual', async () => {
            renderProvider()
            const swap = vi.fn()
            const request = deferred()

            act(() => { void play({ variant: 'leave', title: 'Hasta pronto', waitFor: request.promise, swap }) })
            await act(async () => { request.reject(new Error('Sin red')) })
            await advance(LEAVE.cover + LEAVE.hold)

            expect(swap).toHaveBeenCalledTimes(1)
        })

        it('entrar es corto: la pantalla se destapa en menos de 600 ms', async () => {
            renderProvider()
            const swap = vi.fn()

            act(() => { void play({ variant: 'enter', title: 'Hola, Malena', swap }) })
            expect(curtain()).toHaveTextContent('Hola, Malena')

            await advance(600)
            expect(swap).toHaveBeenCalledTimes(1)
            expect(curtain()).not.toBeInTheDocument()
        })

        it('un segundo pedido mientras corre el primero no lanza otro: un doble clic cierra la sesión una vez', async () => {
            renderProvider()
            const first = vi.fn()
            const second = vi.fn()
            const request: SessionTransitionRequest = { variant: 'leave', title: 'Hasta pronto', swap: first }

            let a!: Promise<void>
            let b!: Promise<void>
            act(() => {
                a = play(request)
                b = play({ ...request, swap: second })
            })
            expect(b).toBe(a)

            await advance(LEAVE.cover + LEAVE.hold + PAINT + LEAVE.reveal)
            expect(first).toHaveBeenCalledTimes(1)
            expect(second).not.toHaveBeenCalled()
        })
    })

    it('con movimiento reducido no dibuja el telón: cambia la sesión apenas termina el pedido', async () => {
        stubMotion(true)
        renderProvider()
        const swap = vi.fn()
        const request = deferred()

        act(() => { void play({ variant: 'leave', title: 'Hasta pronto', waitFor: request.promise, swap }) })
        expect(curtain()).not.toBeInTheDocument()
        expect(swap).not.toHaveBeenCalled()

        await act(async () => { request.resolve() })
        expect(swap).toHaveBeenCalledTimes(1)
        expect(curtain()).not.toBeInTheDocument()
    })
})
