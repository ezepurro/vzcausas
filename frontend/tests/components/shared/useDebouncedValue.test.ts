import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'

/* El hook que demora la búsqueda de los listados: el input cambia en cada
   tecla, pero el valor que va a la consulta recién cuando se deja de escribir. */
describe('useDebouncedValue', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    function renderDebounced(initial: string, delay?: number) {
        return renderHook(({ value }) => useDebouncedValue(value, delay), {
            initialProps: { value: initial },
        })
    }

    function advance(ms: number) {
        act(() => {
            vi.advanceTimersByTime(ms)
        })
    }

    it('si el valor cambia antes de tiempo, vuelve a contar y se queda con el último', () => {
        const { result, rerender } = renderDebounced('')

        // Como al tipear: cada letra llega antes de que venza la anterior.
        for (const value of ['g', 'go', 'gom', 'gome', 'gomez']) {
            rerender({ value })
            advance(100)
            expect(result.current).toBe('')
        }

        advance(100)
        expect(result.current).toBe('gomez')
    })
})
