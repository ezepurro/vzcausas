import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { focusFirstError } from '@/shared/lib/focusFirstError'

/**
 * Al confirmar un formulario con errores, lleva al primer campo con error.
 *
 * Devuelve `arm`, que la pantalla llama al confirmar. Desde ahí, apenas el
 * contenedor muestra un error —el de la validación local, en el mismo render,
 * o el que llega del servidor después— se lleva el scroll y el foco a ese
 * campo, una sola vez.
 *
 * Va atado al intento de confirmar y no a cada cambio de `errors` a propósito:
 * hay formularios que borran el error del campo mientras se escribe (el
 * login), y ahí el foco no tiene que saltar solo a otro campo. Y confirmar de
 * nuevo con los mismos errores vuelve a llevar al primero, aunque `errors` no
 * haya cambiado.
 *
 * `errors` es sólo la señal de que hay algo nuevo que mirar: puede ser el
 * objeto de errores de la pantalla o la lista de mensajes de los campos.
 */
export function useFocusFirstError(container: RefObject<HTMLElement | null>, errors: unknown): () => void {
    const armed = useRef(false)
    const [attempt, setAttempt] = useState(0)
    const signature = JSON.stringify(errors)

    useEffect(() => {
        if (armed.current && focusFirstError(container.current)) armed.current = false
    }, [container, attempt, signature])

    return useCallback(() => {
        armed.current = true
        setAttempt((n) => n + 1)
    }, [])
}
