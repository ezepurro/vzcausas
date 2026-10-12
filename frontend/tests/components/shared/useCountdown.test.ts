import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useCountdown } from '@/shared/hooks/useCountdown'

/* La cuenta regresiva del bloqueo de login (429, V3 §4). */
describe('useCountdown', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    /**
     * De a un segundo por vez, no los `seconds` de una. El hook encadena un
     * `setTimeout` nuevo en cada tick, adentro del efecto que corre después
     * de cada `setRemaining`: avanzar el reloj varios segundos en un solo
     * `advanceTimersByTimeAsync` no le da lugar a React para volver a
     * renderizar y reprogramar el siguiente timer antes de que el reloj siga
     * corriendo, así que sólo se cuenta el primer tick. Separar cada
     * segundo en su propio `act()` fuerza ese respiro entre uno y el
     * siguiente — es justamente lo que pasa en un navegador de verdad.
     */
    async function advance(seconds: number) {
        for (let i = 0; i < seconds; i += 1) {
            await act(async () => {
                await vi.advanceTimersByTimeAsync(1000)
            })
        }
    }

    it('sin punto de partida, no hay cuenta en curso', () => {
        const { result } = renderHook(() => useCountdown(null))
        expect(result.current).toBeNull()
    })

    it('cuenta hacia atrás, un segundo por vez', async () => {
        const { result } = renderHook(() => useCountdown(3))
        expect(result.current).toBe(3)

        await advance(1)
        expect(result.current).toBe(2)

        await advance(1)
        expect(result.current).toBe(1)
    })

    it('llega a cero y pasa a null, no a 0', async () => {
        // El llamador usa el resultado como "¿sigue bloqueado?" sin comparar
        // contra 0 en cada lugar; por eso el cero mismo no se expone.
        const { result } = renderHook(() => useCountdown(1))
        expect(result.current).toBe(1)

        await advance(1)
        expect(result.current).toBeNull()

        // Y se queda en null, no sigue bajando a negativos.
        await advance(5)
        expect(result.current).toBeNull()
    })

    it('un punto de partida nuevo reinicia la cuenta', async () => {
        const { result, rerender } = renderHook(({ seconds }) => useCountdown(seconds), {
            initialProps: { seconds: 5 as number | null },
        })
        await advance(3)
        expect(result.current).toBe(2)

        // Llega un 429 nuevo con otro retryAfterSeconds.
        rerender({ seconds: 10 })
        expect(result.current).toBe(10)
    })

    it('seconds en null apaga la cuenta en curso', async () => {
        const { result, rerender } = renderHook(({ seconds }) => useCountdown(seconds), {
            initialProps: { seconds: 5 as number | null },
        })
        await advance(2)
        expect(result.current).toBe(3)

        rerender({ seconds: null })
        expect(result.current).toBeNull()
    })
})
