import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { HOVER_INTENT_MS, useHoverIntent } from '@/shared/hooks/useHoverIntent'

/* El hook que decide cuándo el usuario apunta a algo de verdad, para pedirlo
   de antemano sin que pasar el mouse por una columna mande pedidos de más. */
describe('useHoverIntent', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    function renderIntent() {
        const onIntent = vi.fn<(id: number) => void>()
        const { result, unmount } = renderHook(() => useHoverIntent(onIntent))
        return { onIntent, intent: result.current, unmount }
    }

    function advance(ms: number) {
        act(() => {
            vi.advanceTimersByTime(ms)
        })
    }

    it('avisa recién cuando el mouse se queda encima el tiempo de espera', () => {
        const { onIntent, intent } = renderIntent()

        intent(1).onPointerEnter()
        advance(HOVER_INTENT_MS - 1)
        expect(onIntent).not.toHaveBeenCalled()

        advance(1)
        expect(onIntent).toHaveBeenCalledExactlyOnceWith(1)
    })

    it('pasar el mouse de largo por varios elementos no avisa ninguno', () => {
        const { onIntent, intent } = renderIntent()

        // Como al barrer una columna: entra y sale de cada uno antes de tiempo.
        for (const id of [1, 2, 3, 4]) {
            intent(id).onPointerEnter()
            advance(40)
            intent(id).onPointerLeave()
        }
        advance(HOVER_INTENT_MS * 2)

        expect(onIntent).not.toHaveBeenCalled()
    })

    it('si entra en otro antes de tiempo, avisa sólo el último', () => {
        const { onIntent, intent } = renderIntent()

        intent(1).onPointerEnter()
        advance(40)
        intent(2).onPointerEnter()
        advance(HOVER_INTENT_MS)

        expect(onIntent).toHaveBeenCalledExactlyOnceWith(2)
    })

    it('con el teclado avisa al tomar el foco, sin esperar', () => {
        const { onIntent, intent } = renderIntent()

        intent(7).onFocus()

        expect(onIntent).toHaveBeenCalledExactlyOnceWith(7)
    })

    it('si la pantalla se desmonta antes de tiempo, no avisa', () => {
        const { onIntent, intent, unmount } = renderIntent()

        intent(1).onPointerEnter()
        unmount()
        advance(HOVER_INTENT_MS)

        expect(onIntent).not.toHaveBeenCalled()
    })
})
