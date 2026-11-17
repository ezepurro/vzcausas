import type { SessionTransitionVariant } from './SessionTransitionContext'

export interface SessionTransitionTiming {
    /** Lo que tarda en taparse la pantalla. */
    cover: number
    /** Lo mínimo que queda tapada, después de `cover`: lo que necesita la vuelta del monograma. */
    hold: number
    /** Lo que tarda en destaparse. */
    reveal: number
    /** Cuándo empieza la vuelta del monograma, desde que aparece. */
    flipDelay: number
    /** Lo que dura la vuelta. */
    flipDuration: number
}

/**
 * Los tiempos de cada transición, en milisegundos. Las animaciones de
 * `session-transition.css` los leen de variables CSS que pone el proveedor:
 * el número se escribe una sola vez, acá.
 *
 * Salir lleva su tiempo (≈ 1,6 s): es una despedida y el monograma da la
 * vuelta entera. Entrar es corto a propósito (≈ 0,55 s): la persona quiere
 * empezar a trabajar.
 *
 * Vive aparte del proveedor para que ese archivo exporte sólo el componente
 * (`react/only-export-components`), igual que `toastDuration.ts`.
 */
export const SESSION_TRANSITION_MS: Record<SessionTransitionVariant, SessionTransitionTiming> = {
    leave: { cover: 320, hold: 900, reveal: 380, flipDelay: 120, flipDuration: 1000 },
    enter: { cover: 140, hold: 600, reveal: 260, flipDelay: 0, flipDuration: 520 },
}
