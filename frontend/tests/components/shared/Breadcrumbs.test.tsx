/**
 * La flecha de volver de las migas y el hook que la mueve (`useGoBack`).
 *
 * La flecha no sale del prototipo: es un pedido del equipo para no depender
 * del botón atrás del navegador (`cases/CAMBIOS.md`).
 */

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { Breadcrumbs } from '@/shared/components/ui/Breadcrumbs'
import { useGoBack } from '@/app/router/useGoBack'

describe('Breadcrumbs: flecha de volver', () => {
    it('sin onBack no hay flecha', () => {
        render(<Breadcrumbs items={[{ label: 'Causas', onClick: vi.fn() }, { label: '13284571' }]} />)

        expect(screen.queryByRole('button', { name: 'Volver' })).not.toBeInTheDocument()
    })

    it('con onBack, la flecha va antes de las migas y avisa al tocarla', async () => {
        const onBack = vi.fn()
        render(<Breadcrumbs items={[{ label: 'Causas', onClick: vi.fn() }, { label: '13284571' }]} onBack={onBack} />)

        const buttons = screen.getAllByRole('button')
        expect(buttons[0]).toHaveAccessibleName('Volver')

        await userEvent.click(screen.getByRole('button', { name: 'Volver' }))
        expect(onBack).toHaveBeenCalledOnce()
    })
})

describe('useGoBack', () => {
    function Detail() {
        const goBack = useGoBack('/causas')
        return <button onClick={goBack}>Volver</button>
    }

    it('sin pantalla anterior de la aplicación va a la de respaldo', async () => {
        const router = createMemoryRouter(
            [
                { path: '/causas', element: <h1>Listado</h1> },
                { path: '/causas/:caseId', element: <Detail /> },
            ],
            { initialEntries: ['/causas/1'] },
        )
        render(<RouterProvider router={router} />)

        await userEvent.click(screen.getByRole('button', { name: 'Volver' }))

        expect(await screen.findByRole('heading', { name: 'Listado' })).toBeInTheDocument()
        expect(router.state.location.pathname).toBe('/causas')
    })
})
