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
        timeLimitDays: 3,
        dayType: 'BUSINESS',
        terminal: false,
        activeCases: 0,
        active: true,
        ...overrides,
    }
}

const ROWS = [
    state({ id: 1, name: 'Designación de abogado defensor', timeLimitDays: 0, dayType: 'NONE' }),
    state({ id: 2, name: 'Cédula de notificación', timeLimitDays: 3, dayType: 'BUSINESS', activeCases: 4 }),
    state({ id: 16, name: 'Demanda contencioso administrativa', timeLimitDays: 30, dayType: 'CONSECUTIVE' }),
    state({ id: 9, name: 'Archivada', timeLimitDays: 0, dayType: 'NONE', terminal: true }),
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
    it('muestra una fila por estado, en el orden en que llegan y sin numerar (V3 D-31)', () => {
        renderTable()

        const rows = screen.getAllByRole('row')
        expect(rows).toHaveLength(ROWS.length + 1)
        // La primera celda es el nombre: ya no hay columna de posición.
        expect(rows.slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual(
            ROWS.map((r) => r.name),
        )
        expect(screen.queryByRole('columnheader', { name: '#' })).not.toBeInTheDocument()
    })

    it('muestra las causas activas que hay en cada estado', () => {
        renderTable()

        expect(within(rowOf('Cédula de notificación')).getAllByRole('cell')[4]).toHaveTextContent('4')
    })

    it('un estado sin plazo muestra una raya en vez de 0', () => {
        renderTable()

        const cells = within(rowOf('Designación de abogado defensor')).getAllByRole('cell')
        expect(cells[1]).toHaveTextContent('—')
        expect(cells[2]).toHaveTextContent('Sin plazo')
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
