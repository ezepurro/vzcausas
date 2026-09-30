import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { LawyersTable } from '@/features/lawyers/components/LawyersTable'
import type { Lawyer } from '@/features/lawyers/types/lawyer'

const ROWS: Lawyer[] = [
    { id: 1, fullName: 'Dr. Fernando G. Vázquez', registrationNumber: '1-28114', activeCases: 4, active: true },
    { id: 3, fullName: 'Dra. Malena Ríos', registrationNumber: '1-36842', activeCases: 0, active: true },
]

describe('LawyersTable', () => {
    it('muestra las columnas del prototipo', () => {
        render(<LawyersTable rows={ROWS} />)

        const headers = screen.getAllByRole('columnheader').map((th) => th.textContent)
        expect(headers).toEqual(['Apellido y Nombre', 'Matrícula', 'Causas activas'])
    })

    it('muestra una fila por abogado con sus datos', () => {
        render(<LawyersTable rows={ROWS} />)

        const rows = screen.getAllByRole('row').slice(1) // sin la cabecera
        expect(rows).toHaveLength(2)
        expect(within(rows[0]).getByText('Dr. Fernando G. Vázquez')).toBeInTheDocument()
        expect(within(rows[0]).getByText('1-28114')).toBeInTheDocument()
        expect(within(rows[0]).getByText('4')).toBeInTheDocument()
    })

    it('sin filas muestra el estado vacío que recibe', () => {
        render(<LawyersTable rows={[]} empty={<p>Sin abogados</p>} />)

        expect(screen.getByText('Sin abogados')).toBeInTheDocument()
        expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
})
