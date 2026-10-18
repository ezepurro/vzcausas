import { useEffect, useState } from 'react'

/**
 * Cuenta regresiva en segundos, para un `429` con `retryAfterSeconds`
 * (V3 §4, Límite de frecuencia).
 *
 * `seconds` es el punto de partida; un valor nuevo reinicia la cuenta,
 * `null` la apaga. Devuelve `null` cuando no hay cuenta en curso o cuando
 * llega a cero, así el llamador puede usar el resultado directamente como
 * "¿está bloqueado?" sin comparar contra `0` en cada lugar.
 */
export function useCountdown(seconds: number | null): number | null {
    const [remaining, setRemaining] = useState(seconds)
    const [prevSeconds, setPrevSeconds] = useState(seconds)

    /*
     * Sincronizado DURANTE el render, no en un efecto — "adjusting state
     * when a prop changes", el patrón que React mismo documenta para esto.
     * Un efecto corre DESPUÉS de confirmar el render, así que entre el
     * momento en que el llamador cambia `seconds` (ej. `setRetryAfterSeconds`
     * tras un 429) y el momento en que este hook lo nota, hay un render de
     * por medio donde `remaining` todavía tiene el valor viejo. Si algo del
     * lado del llamador lee el resultado en ESE render intermedio —como un
     * efecto que apaga el aviso de bloqueo cuando la cuenta da `null`— lo ve
     * en `null` aunque la cuenta acaba de arrancar, y apaga el aviso que
     * recién se había prendido. Sincronizar acá, en cambio, hace que React
     * descarte el render a medio hacer y vuelva a renderizar antes de
     * confirmar nada, así que no hay un estado intermedio que nadie deba ver.
     */
    if (seconds !== prevSeconds) {
        setPrevSeconds(seconds)
        setRemaining(seconds)
    }

    useEffect(() => {
        if (remaining === null || remaining <= 0) return
        const timer = setTimeout(() => setRemaining((current) => (current ?? 0) - 1), 1000)
        return () => clearTimeout(timer)
    }, [remaining])

    return remaining !== null && remaining > 0 ? remaining : null
}
