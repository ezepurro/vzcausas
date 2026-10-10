/**
 * Lo que la tabla le deja marcado al CSS para adaptarse a una pantalla angosta.
 *
 * Debajo de 720px cada fila se dibuja como una tarjeta y la cabecera se va:
 * el nombre de la columna lo lleva cada celda. Entre 720 y 1180px se esconden
 * las columnas que la pantalla marcó como prescindibles.
 */

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DataTable, type Column } from '@/shared/components/ui'

interface Row {
    id: number
    caption: string
    jurisdiction: string
}

const ROWS: Row[] = [{ id: 1, caption: 'GÓMEZ, Ariel p.s.a. estafa', jurisdiction: 'Penal' }]

const COLUMNS: Column<Row>[] = [
    { id: 'caption', header: 'Carátula', cell: (r) => r.caption, primary: true },
    { id: 'jurisdiction', header: 'Fuero', cell: (r) => r.jurisdiction, hideWhenNarrow: true },
    { id: 'actions', header: '', actions: true, cell: () => <button type="button">Ver detalle</button> },
]

function renderTable() {
    render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => String(r.id)} minWidth={900} />)
}

const cellOf = (text: string) => screen.getByText(text).closest('td') as HTMLElement

describe('DataTable: pantallas angostas', () => {
    it('cada celda lleva el nombre de su columna', () => {
        renderTable()

        expect(cellOf('GÓMEZ, Ariel p.s.a. estafa')).toHaveAttribute('data-label', 'Carátula')
        expect(cellOf('Penal')).toHaveAttribute('data-label', 'Fuero')
    })

    it('la columna principal queda marcada: encabeza la tarjeta', () => {
        renderTable()

        expect(cellOf('GÓMEZ, Ariel p.s.a. estafa')).toHaveClass('vz-table__cell--primary')
        expect(cellOf('Penal')).not.toHaveClass('vz-table__cell--primary')
    })

    it('una columna prescindible queda marcada en la cabecera y en la celda', () => {
        renderTable()

        expect(screen.getByRole('columnheader', { name: 'Fuero' })).toHaveClass('vz-table__hide-narrow')
        expect(cellOf('Penal')).toHaveClass('vz-table__hide-narrow')
        expect(screen.getByRole('columnheader', { name: 'Carátula' })).not.toHaveClass('vz-table__hide-narrow')
    })

    it('la celda de acciones queda marcada: cierra la tarjeta', () => {
        renderTable()

        expect(cellOf('Ver detalle')).toHaveClass('vz-table__cell--actions')
    })

    it('el ancho mínimo viaja como variable, así el CSS lo puede soltar', () => {
        renderTable()

        expect(screen.getByRole('table').style.getPropertyValue('--vz-table-min')).toBe('900px')
    })
})
