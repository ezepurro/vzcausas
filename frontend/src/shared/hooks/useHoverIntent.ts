import { useCallback, useEffect, useRef } from 'react'

/** Cuánto tiene que quedarse quieto el mouse sobre el elemento para contar como intención. */
export const HOVER_INTENT_MS = 150

export interface HoverIntentHandlers {
    onPointerEnter: () => void
    onPointerLeave: () => void
    onFocus: () => void
}

/**
 * Avisa que el usuario **apunta** a un elemento, para pedir de antemano lo
 * que va a abrir (por ejemplo, la causa de "Ver detalle").
 *
 * Con el mouse, recién cuando lleva `delay` milisegundos encima: pasar el
 * cursor por una columna de botones no dispara nada, y la API no recibe
 * pedidos que nadie va a usar (el límite es por IP, compartido por el
 * estudio). Con el teclado, al tomar el foco: tabular no es un barrido.
 *
 * Devuelve una función que arma los manejadores para cada elemento, así una
 * tabla usa un solo hook para todas sus filas:
 *
 * ```tsx
 * const intent = useHoverIntent(onIntent)
 * <Button {...intent(c)} onClick={() => onOpen(c)}>Ver detalle</Button>
 * ```
 */
export function useHoverIntent<T>(
    onIntent: ((value: T) => void) | undefined,
    delay = HOVER_INTENT_MS,
): (value: T) => HoverIntentHandlers {
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

    // Si la pantalla se va antes de que venza (un click, que navega), no se avisa.
    useEffect(() => () => clearTimeout(timer.current), [])

    return useCallback(
        (value: T) => ({
            onPointerEnter: () => {
                clearTimeout(timer.current)
                timer.current = setTimeout(() => onIntent?.(value), delay)
            },
            onPointerLeave: () => clearTimeout(timer.current),
            onFocus: () => onIntent?.(value),
        }),
        [onIntent, delay],
    )
}
