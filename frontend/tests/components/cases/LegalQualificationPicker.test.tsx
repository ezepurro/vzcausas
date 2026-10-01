import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
    LegalQualificationPicker,
    type LegalQualificationPickerProps,
} from '@/features/cases/components/LegalQualificationPicker'

const ROBBERY = { id: 1, name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96, offenseDate: '2021-02-27' }
const WEAPONS = { id: 8, name: 'Abuso de armas — art. 104 CP', prescriptionMonths: 78, offenseDate: '' }

function renderPicker(props: Partial<LegalQualificationPickerProps> = {}) {
    const handlers = {
        onAdd: vi.fn(),
        onRemove: vi.fn(),
        onOffenseDateChange: vi.fn(),
        onCreate: vi.fn(),
    }
    render(
        <LegalQualificationPicker
            id="case-qualifications"
            selected={[ROBBERY, WEAPONS]}
            options={[{ value: '6', label: 'Hurto simple — art. 162 CP · 2 años' }]}
            {...handlers}
            {...props}
        />,
    )
    return { ...handlers, user: userEvent.setup() }
}

describe('LegalQualificationPicker', () => {
    it('muestra cada calificación elegida con su prescripción', () => {
        renderPicker()

        expect(screen.getByText('Robo calificado — art. 167 inc. 2 CP')).toBeInTheDocument()
        expect(screen.getByText('8 años')).toBeInTheDocument()
        expect(screen.getByText('6 años y 6 meses')).toBeInTheDocument()
    })

    it('cada calificación tiene su propia fecha del hecho', () => {
        renderPicker()

        expect(screen.getByLabelText(`Fecha del hecho de ${ROBBERY.name}`)).toHaveValue('2021-02-27')
        expect(screen.getByLabelText(`Fecha del hecho de ${WEAPONS.name}`)).toHaveValue('')
    })

    it('cargar una fecha avisa de cuál calificación es', () => {
        const { onOffenseDateChange } = renderPicker()

        fireEvent.change(screen.getByLabelText(`Fecha del hecho de ${WEAPONS.name}`), {
            target: { value: '2025-11-14' },
        })

        expect(onOffenseDateChange).toHaveBeenCalledWith(8, '2025-11-14')
    })

    it('marca sólo la fecha que tiene error', () => {
        renderPicker({ dateErrors: { 8: 'Cargá la fecha del hecho.' } })

        const invalid = screen.getByLabelText(`Fecha del hecho de ${WEAPONS.name}`)
        expect(invalid).toHaveAttribute('aria-invalid', 'true')
        expect(invalid).toHaveAccessibleDescription('Cargá la fecha del hecho.')
        expect(screen.getByLabelText(`Fecha del hecho de ${ROBBERY.name}`)).not.toHaveAttribute('aria-invalid')
    })

    it('no deja elegir una fecha posterior al tope', () => {
        renderPicker({ maxDate: '2026-09-15' })

        expect(screen.getByLabelText(`Fecha del hecho de ${ROBBERY.name}`)).toHaveAttribute('max', '2026-09-15')
    })

    it('quitar avisa cuál', async () => {
        const { user, onRemove } = renderPicker()

        await user.click(screen.getByRole('button', { name: `Quitar ${ROBBERY.name}` }))

        expect(onRemove).toHaveBeenCalledWith(1)
    })

    it('agregar avisa el id y el selector vuelve a quedar sin elegir', async () => {
        const { user, onAdd } = renderPicker()
        const select = screen.getByRole('combobox')

        await user.selectOptions(select, '6')

        expect(onAdd).toHaveBeenCalledWith(6)
        expect(select).toHaveValue('')
    })

    it('sin calificaciones para agregar, el selector queda deshabilitado', () => {
        renderPicker({ options: [] })

        expect(screen.getByRole('combobox')).toBeDisabled()
    })

    it('"Registrar calificación nueva" se deshabilita para quien no puede crearlas', () => {
        renderPicker({ canCreate: false })

        expect(screen.getByRole('button', { name: 'Registrar calificación nueva' })).toBeDisabled()
    })

    it('sin calificaciones elegidas no dibuja la lista', () => {
        renderPicker({ selected: [] })

        expect(screen.queryByText('Fecha del hecho')).not.toBeInTheDocument()
        expect(within(screen.getByRole('combobox')).getByText('Agregar calificación…')).toBeInTheDocument()
    })
})
