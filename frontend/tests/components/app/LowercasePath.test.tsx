import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { LowercasePath } from '@/app/router/LowercasePath'

const ROUTES = {
    children: [
        { path: '/abogados', element: <p>Pantalla de abogados</p> },
        { path: '/causas/:caseId', element: <p>Detalle de causa</p> },
    ],
}

describe('LowercasePath', () => {
    it('lleva la URL con mayúsculas a minúsculas', async () => {
        const { router } = renderWithProviders(<LowercasePath />, { ...ROUTES, route: '/Abogados' })

        expect(await screen.findByText('Pantalla de abogados')).toBeInTheDocument()
        expect(router.state.location.pathname).toBe('/abogados')
    })

    it('conserva la query y reemplaza la entrada del historial', async () => {
        const { router } = renderWithProviders(<LowercasePath />, { ...ROUTES, route: '/CAUSAS/12?tab=Actos' })

        expect(await screen.findByText('Detalle de causa')).toBeInTheDocument()
        expect(router.state.location.pathname).toBe('/causas/12')
        expect(router.state.location.search).toBe('?tab=Actos')
        expect(router.state.historyAction).toBe('REPLACE')
    })

    it('una URL ya en minúsculas no se toca', async () => {
        const { router } = renderWithProviders(<LowercasePath />, { ...ROUTES, route: '/abogados' })

        expect(await screen.findByText('Pantalla de abogados')).toBeInTheDocument()
        expect(router.state.historyAction).toBe('POP')
    })
})
