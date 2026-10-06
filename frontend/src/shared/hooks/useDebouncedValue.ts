import { useEffect, useState } from 'react'

/**
 * Devuelve `value`, pero recién cuando lleva `delay` milisegundos sin cambiar.
 * Para no consultar al servidor en cada tecla de un buscador.
 */
export function useDebouncedValue<T>(value: T, delay = 200): T {
    const [debounced, setDebounced] = useState(value)

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay)
        // Si `value` cambia antes de que venza, se cancela y se vuelve a contar.
        return () => clearTimeout(timer)
    }, [value, delay])

    return debounced
}