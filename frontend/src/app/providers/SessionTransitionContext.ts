import { createContext, useContext } from 'react'

/** `leave` al cerrar sesión; `enter` al iniciarla. */
export type SessionTransitionVariant = 'enter' | 'leave'

export interface SessionTransitionRequest {
    variant: SessionTransitionVariant
    /** El renglón grande, debajo del monograma: "Hasta pronto, Malena". */
    title: string
    /** El renglón chico, debajo del título: "Cerrando sesión…". */
    detail?: string
    /**
     * Lo que tiene que terminar antes de destapar la pantalla, por ejemplo el
     * `POST /auth/logout`. Si falla, la transición sigue igual: avisar el
     * error es de quien lo pidió.
     */
    waitFor?: Promise<unknown>
    /**
     * El cambio de pantalla (abrir o cerrar la sesión). Corre con la pantalla
     * tapada, así no se ve el instante en que la app queda vacía.
     */
    swap: () => void
}

/** Tapa la pantalla, corre `swap` y la destapa. Se resuelve al terminar. */
export type PlaySessionTransition = (request: SessionTransitionRequest) => Promise<void>

/**
 * La transición entre la app y el login.
 *
 * Vive en `app/providers/`, como `useToast()`, porque la usan dos pantallas
 * (el login y el cierre de sesión) y tiene que sobrevivir al cambio de una a
 * la otra: el proveedor está por encima del router.
 */
export const SessionTransitionContext = createContext<PlaySessionTransition | null>(null)

export function useSessionTransition(): PlaySessionTransition {
    const play = useContext(SessionTransitionContext)
    if (play === null) throw new Error('useSessionTransition() must be used inside <SessionTransitionProvider>')
    return play
}
