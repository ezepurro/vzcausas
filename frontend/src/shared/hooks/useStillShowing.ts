import { useCallback, useEffect, useRef } from 'react'

/**
 * Si la pantalla sigue montada y mostrando `value` (por ejemplo, el id de la
 * causa). Devuelve una función para preguntarlo cuando llega una respuesta.
 *
 * Sirve para lo que tarda: una respuesta que llega después de salir, o de
 * pasar a otra causa con la misma pantalla montada, no se dibuja en la
 * pantalla. La avisa la tarjeta de la tarea en segundo plano
 * (`BackgroundTasksProvider`).
 */
export function useStillShowing<T>(value: T): (expected: T) => boolean {
    const current = useRef<{ value: T } | null>({ value })
    useEffect(() => {
        current.current = { value }
        return () => {
            current.current = null
        }
    }, [value])
    return useCallback((expected: T) => current.current !== null && Object.is(current.current.value, expected), [])
}
