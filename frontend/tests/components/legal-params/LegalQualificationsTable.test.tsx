import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LegalQualificationsTable } from '@/features/legal-params/components/LegalQualificationsTable'
import type { LegalQualification } from '@/features/legal-params/types/legalQualification'

const ROWS: LegalQualification[] = [
    { id: 8, name: 'Abuso de armas — art. 104 CP', prescriptionMonths: 78, activeCases: 0, active: true },
    { id: 4, name: 'Amenazas coactivas — art. 149 bis CP', prescriptionMonths: 24, activeCases: 1, active: true },
    { id: 1, name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96, activeCases: 3, active: true },
]

describe('LegalQualificationsTable', () => {
    it('muestra las columnas del prototipo, en el orden que llegan', () => {
        render(<LegalQualificationsTable rows={ROWS} />)

        expect(screen.getAllByRole('columnheader').map((h) => h.textContent))
            .toEqual(['Calificación legal', 'Prescripción', 'En uso'])
        expect(screen.getAllByRole('row').slice(1).map((r) => r.querySelector('td')?.textContent))
            .toEqual(ROWS.map((q) => q.name))
    })

    it('la prescripción como la lee el estudio y, abajo, en meses', () => {
        render(<LegalQualificationsTable rows={ROWS} />)

        expect(screen.getByText('6 años y 6 meses')).toBeInTheDocument()
        expect(screen.getByText('78 meses')).toBeInTheDocument()
    })

    it('cuántas causas activas la usan', () => {
        render(<LegalQualificationsTable rows={ROWS} />)

        expect(screen.getByText('Sin causas')).toBeInTheDocument()
        expect(screen.getByText('1 causa')).toBeInTheDocument()
        expect(screen.getByText('3 causas')).toBeInTheDocument()
    })

    it('sin callbacks no tiene acciones', () => {
        render(<LegalQualificationsTable rows={ROWS} />)

        expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('con los callbacks, modificar y eliminar avisan con la fila', async () => {
        const onEdit = vi.fn()
        const onDelete = vi.fn()
        render(<LegalQualificationsTable rows={ROWS.slice(0, 1)} onEdit={onEdit} onDelete={onDelete} />)
        const user = userEvent.setup()

        await user.click(screen.getByRole('button', { name: 'Modificar' }))
        await user.click(screen.getByRole('button', { name: 'Eliminar' }))

        expect(onEdit).toHaveBeenCalledWith(ROWS[0])
        expect(onDelete).toHaveBeenCalledWith(ROWS[0])
    })

    it('sin filas muestra el vacío que le pasan', () => {
        render(<LegalQualificationsTable rows={[]} empty={<p>Nada por acá</p>} />)

        expect(screen.getByText('Nada por acá')).toBeInTheDocument()
    })
})
