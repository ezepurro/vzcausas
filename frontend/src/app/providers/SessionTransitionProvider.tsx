import { useCallback, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { SessionTransitionContext } from './SessionTransitionContext'
import type { PlaySessionTransition, SessionTransitionRequest, SessionTransitionVariant } from './SessionTransitionContext'
import { SESSION_TRANSITION_MS } from './sessionTransitionTiming'

type Phase = 'cover' | 'reveal'

interface Showing {
    variant: SessionTransitionVariant
    title: string
    detail: string | null
    phase: Phase
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Espera a que el navegador dibuje la pantalla nueva debajo del telón.
 *
 * Con un tope: en una pestaña en segundo plano `requestAnimationFrame` no
 * corre, y sin el tope el telón quedaba puesto hasta volver a la pestaña.
 */
const nextPaint = () =>
    Promise.race([
        new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
        wait(100),
    ])

/**
 * Sin animación si la persona la pidió así (`prefers-reduced-motion`) o si no
 * hay `matchMedia`, que es el caso de jsdom: en los tests el cambio de
 * pantalla es directo, como antes de la transición.
 */
function skipAnimation(): boolean {
    return typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * El telón entre la app y el login: tapa la pantalla con el monograma del
 * estudio dando una vuelta, cambia la pantalla por debajo y la destapa.
 *
 * Una transición a la vez: si se pide otra mientras corre una (un doble clic
 * en "Cerrar sesión"), devuelve la que está en curso.
 */
export function SessionTransitionProvider({ children }: { children: ReactNode }) {
    const [showing, setShowing] = useState<Showing | null>(null)
    const running = useRef<Promise<void> | null>(null)

    const run = useCallback(async (request: SessionTransitionRequest): Promise<void> => {
        const { variant, title, detail = null, waitFor, swap } = request
        const settled = waitFor?.then(() => undefined, () => undefined) ?? Promise.resolve()

        if (skipAnimation()) {
            await settled
            swap()
            return
        }

        const timing = SESSION_TRANSITION_MS[variant]
        try {
            setShowing({ variant, title, detail, phase: 'cover' })
            await wait(timing.cover)
            await Promise.all([wait(timing.hold), settled])
            swap()
            await nextPaint()
            setShowing((current) => (current ? { ...current, phase: 'reveal' } : current))
            await wait(timing.reveal)
        } finally {
            setShowing(null)
        }
    }, [])

    const play = useCallback<PlaySessionTransition>((request) => {
        if (running.current) return running.current
        const task = run(request).finally(() => {
            running.current = null
        })
        running.current = task
        return task
    }, [run])

    return (
        <SessionTransitionContext.Provider value={play}>
            {children}
            {showing && <SessionCurtain showing={showing} />}
        </SessionTransitionContext.Provider>
    )
}

function SessionCurtain({ showing }: { showing: Showing }) {
    const { variant, title, detail, phase } = showing
    const timing = SESSION_TRANSITION_MS[variant]
    const style = {
        '--vz-st-cover': `${timing.cover}ms`,
        '--vz-st-reveal': `${timing.reveal}ms`,
        '--vz-st-flip-delay': `${timing.flipDelay}ms`,
        '--vz-st-flip-duration': `${timing.flipDuration}ms`,
    } as CSSProperties

    return (
        <div
            className={`vz-session-transition vz-session-transition--${variant} is-${phase}`}
            style={style}
            role="status"
            data-testid="session-transition"
        >
            <div className="vz-session-transition__content">
                <span className="vz-session-transition__mark" aria-hidden="true">
                    <svg viewBox="0 0 60 42" fill="none">
                        <path d="M2 2h12l10 26L34 2h12L28 40H16L2 2z" fill="currentColor" />
                        <path d="M38 2h20L40 34h18v6H30L48 8H38V2z" fill="currentColor" opacity=".55" />
                    </svg>
                </span>
                <p className="vz-session-transition__title">{title}</p>
                {detail && <p className="vz-session-transition__detail">{detail}</p>}
            </div>
        </div>
    )
}
