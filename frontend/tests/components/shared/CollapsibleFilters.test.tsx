/**
 * Los filtros plegables de un listado.
 *
 * Que en el teléfono se escondan y en una pantalla ancha no lo decide el CSS
 * (`table.css`): lo que se prueba acá es el botón —abierto o cerrado, cuántos
 * filtros hay aplicados— y que los filtros nunca salen del DOM.
 */

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CollapsibleFilters } from '@/shared/components/ui'

function renderFilters(active?: number) {
    render(
        <CollapsibleFilters active={active}>
            <select aria-label="Filtrar por fuero">
                <option value="">Todos los fueros</option>
            </select>
        </CollapsibleFilters>,
    )
    return userEvent.setup()
}

const toggle = () => screen.getByRole('button', { name: /^Filtros/ })

describe('CollapsibleFilters', () => {
    it('arranca plegado y el botón dice qué despliega', () => {
        renderFilters()

        expect(toggle()).toHaveAttribute('aria-expanded', 'false')
        expect(toggle()).toHaveAttribute('aria-controls', screen.getByLabelText('Filtrar por fuero').parentElement?.id)
    })

    it('el botón lo despliega y lo vuelve a plegar', async () => {
        const user = renderFilters()

        await user.click(toggle())
        expect(toggle()).toHaveAttribute('aria-expanded', 'true')

        await user.click(toggle())
        expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    })

    it('los filtros siguen en la pantalla aunque esté plegado', () => {
        renderFilters()

        expect(screen.getByLabelText('Filtrar por fuero')).toBeInTheDocument()
    })

    it('muestra cuántos filtros hay aplicados', () => {
        renderFilters(2)

        expect(toggle()).toHaveTextContent('Filtros2')
    })

    it('sin filtros aplicados no muestra contador', () => {
        renderFilters(0)

        expect(toggle()).toHaveTextContent(/^Filtros$/)
    })
})
