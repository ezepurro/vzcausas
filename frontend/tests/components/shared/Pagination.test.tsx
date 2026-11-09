/**
 * El paginado avisa a qué página apunta el usuario (`onIntent`), para que la
 * pantalla la pida de antemano. Como "Ver detalle": sólo si el mouse se queda
 * sobre "Siguiente" (`useHoverIntent`) o el botón toma el foco.
 */

import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination } from '@/shared/components/ui'
import { HOVER_INTENT_MS } from '@/shared/hooks/useHoverIntent'

function renderPagination(page: number, totalPages: number) {
    const onIntent = vi.fn<(page: number) => void>()
    render(
        <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalPages * 20}
            noun={['causa', 'causas']}
            onChange={() => {}}
            onIntent={onIntent}
        />,
    )
    return { onIntent, user: userEvent.setup() }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('Pagination: pedir de antemano la página siguiente', () => {
    it('apuntar a "Siguiente" avisa la página siguiente', async () => {
        const { onIntent, user } = renderPagination(2, 5)

        await user.hover(screen.getByRole('button', { name: /siguiente/i }))

        await waitFor(() => expect(onIntent).toHaveBeenCalledExactlyOnceWith(3))
    })

    it('pasar el mouse de largo no avisa nada', async () => {
        const { onIntent, user } = renderPagination(1, 5)
        const next = screen.getByRole('button', { name: /siguiente/i })

        await user.hover(next)
        await user.unhover(next)
        await wait(HOVER_INTENT_MS * 2)

        expect(onIntent).not.toHaveBeenCalled()
    })

    it('con el teclado avisa al tomar el foco', async () => {
        const { onIntent, user } = renderPagination(1, 5)

        // "Anterior" está deshabilitado en la página 1: el primer Tab va a "Siguiente".
        await user.tab()

        expect(screen.getByRole('button', { name: /siguiente/i })).toHaveFocus()
        expect(onIntent).toHaveBeenCalledExactlyOnceWith(2)
    })

    it('en la última página no hay qué pedir', async () => {
        const { onIntent, user } = renderPagination(5, 5)
        const next = screen.getByRole('button', { name: /siguiente/i })

        await user.hover(next)
        await wait(HOVER_INTENT_MS * 2)

        expect(next).toBeDisabled()
        expect(onIntent).not.toHaveBeenCalled()
    })

    it('apuntar a "Anterior" no avisa: esa página ya pasó por la caché', async () => {
        const { onIntent, user } = renderPagination(3, 5)

        await user.hover(screen.getByRole('button', { name: /anterior/i }))
        await wait(HOVER_INTENT_MS * 2)

        expect(onIntent).not.toHaveBeenCalled()
    })
})
