/**
 * El título de la pestaña por pantalla (H-20).
 */

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { APP_TITLE, usePageTitle } from '@/shared/hooks/usePageTitle'

function Page({ title }: { title: string | undefined }) {
    usePageTitle(title)
    return null
}

describe('usePageTitle', () => {
    it('pone el nombre de la pantalla delante del de la aplicación', () => {
        render(<Page title="Clientes" />)

        expect(document.title).toBe('Clientes · VZ Causas')
    })

    it('sigue al título cuando cambia', () => {
        const { rerender } = render(<Page title="Clientes" />)

        rerender(<Page title="Abogados" />)

        expect(document.title).toBe('Abogados · VZ Causas')
    })

    it('sin título todavía, queda el nombre de la aplicación', () => {
        render(<Page title={undefined} />)

        expect(document.title).toBe(APP_TITLE)
    })

    it('al salir de la pantalla vuelve al nombre de la aplicación', () => {
        const { unmount } = render(<Page title="Clientes" />)

        unmount()

        expect(document.title).toBe(APP_TITLE)
    })
})
