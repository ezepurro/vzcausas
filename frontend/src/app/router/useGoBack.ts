import { useCallback } from 'react'
import { useNavigate } from 'react-router'

/**
 * Vuelve a la pantalla anterior de la aplicación: a Inicio si se entró a la
 * causa desde un tablero, al listado si se entró desde ahí.
 *
 * Si no hay pantalla anterior —se entró por la URL o se recargó—, va a
 * `fallback`, la pantalla de la que cuelga: `navigate(-1)` sacaría al usuario
 * de la aplicación. El router guarda en `history.state.idx` cuántas entradas
 * suyas hay antes de la actual; `0` es la primera.
 */
export function useGoBack(fallback: string) {
    const navigate = useNavigate()

    return useCallback(() => {
        const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
        if (idx > 0) navigate(-1)
        else navigate(fallback, { replace: true })
    }, [navigate, fallback])
}
