import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProceduralStatesTable } from '@/features/legal-params/components/ProceduralStatesTable'
import type { ProceduralState } from '@/features/legal-params/types/proceduralState'

function state(overrides: Partial<ProceduralState>): ProceduralState {
    return {
        id: 1,
        name: 'Estado',
        jurisdiction: 'CRIMINAL',
        position: 1,
        timeLimitDays: 3,
        dayType: 'BUSINESS',
        terminal: false,
        activeCases: 0,
        active: true,
        ...overrides,
    }
}

const ROWS = [
    state({ id: 1, name: 'Designación de abogado defensor', position: 1, timeLimitDays: 0, dayType: 'NONE' }),
    state({ id: 2, name: 'Cédula de notificación', position: 2, timeLimitDays: 3, dayType: 'BUSINESS' }),
    state({ id: 16, name: 'Demanda contencioso administrativa', position: 3, timeLimitDays: 30, dayType: 'CONSECUTIVE' }),
    state({ id: 9, name: 'Archivada', position: 4, timeLimitDays: 0, dayType: 'NONE', terminal: true }),
]

function renderTable(rows = ROWS) {
    const handlers = { onEdit: vi.fn(), onDelete: vi.fn() }
    render(<ProceduralStatesTable rows={rows} {...handlers} empty={<p>Sin estados</p>} />)
    return { ...handlers, user: userEvent.setup() }
}

/** La fila de la tabla que contiene ese nombre. */
function rowOf(name: string) {
    return screen.getByText(name).closest('tr') as HTMLElement
}

describe('ProceduralStatesTable', () => {
    it('muestra una fila por estado con su posición', () => {
        renderTable()

        expect(screen.getAllByRole('row')).toHaveLength(ROWS.length + 1)
        expect(within(rowOf('Cédula de notificación')).getAllByRole('cell')[0]).toHaveTextContent('2')
    })

    it('un estado sin plazo muestra una raya en vez de 0', () => {
        renderTable()

        const cells = within(rowOf('Designación de abogado defensor')).getAllByRole('cell')
        expect(cells[2]).toHaveTextContent('—')
        expect(cells[3]).toHaveTextContent('Sin plazo')
    })

    it('muestra el tipo de día en castellano', () => {
        renderTable()

        expect(within(rowOf('Cédula de notificación')).getByText('Hábiles')).toBeInTheDocument()
        expect(within(rowOf('Demanda contencioso administrativa')).getByText('Corridos')).toBeInTheDocument()
    })

    it('marca los estados que cierran la causa', () => {
        renderTable()

        expect(within(rowOf('Archivada')).getByText('Cierra la causa')).toBeInTheDocument()
        expect(within(rowOf('Cédula de notificación')).queryByText('Cierra la causa')).not.toBeInTheDocument()
    })

    it('modificar y eliminar avisan con el estado de esa fila', async () => {
        const { user, onEdit, onDelete } = renderTable()

        await user.click(within(rowOf('Cédula de notificación')).getByRole('button', { name: 'Modificar' }))
        await user.click(within(rowOf('Archivada')).getByRole('button', { name: 'Eliminar' }))

        expect(onEdit).toHaveBeenCalledWith(ROWS[1])
        expect(onDelete).toHaveBeenCalledWith(ROWS[3])
    })

    it('sin filas muestra el estado vacío', () => {
        renderTable([])

        expect(screen.getByText('Sin estados')).toBeInTheDocument()
    })
})
