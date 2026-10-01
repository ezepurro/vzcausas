import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
    ProceduralActForm,
    type ProceduralActFormProps,
} from '@/features/proceedings/components/ProceduralActForm'
import type { ProceduralActFormValues } from '@/features/proceedings/types/proceduralAct'

const EMPTY: ProceduralActFormValues = {
    stateText: '',
    proceduralStateId: '',
    actDate: '2026-09-15',
    notificationDate: '',
    notes: '',
    manualDue: false,
    manualDueDate: '',
}

function renderForm(props: Partial<ProceduralActFormProps> = {}) {
    const handlers = {
        onStateTextChange: vi.fn(),
        onStateSelect: vi.fn(),
        onChange: vi.fn(),
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
    }
    render(
        <ProceduralActForm
            values={EMPTY}
            errors={{}}
            jurisdiction="CRIMINAL"
            stateOptions={[
                { value: '2', label: 'Cédula de notificación', description: '3 días hábiles' },
                { value: '3', label: 'Requerimiento de elevación a juicio', description: 'Sin plazo' },
            ]}
            customState={false}
            saving={false}
            {...handlers}
            {...props}
        />,
    )
    return { ...handlers, user: userEvent.setup() }
}

describe('ProceduralActForm', () => {
    it('pide el estado al que pasa la causa, las fechas y las observaciones', () => {
        renderForm()

        expect(screen.getByLabelText(/^Estado procesal al que pasa la causa/)).toBeInTheDocument()
        expect(screen.getByLabelText(/^Fecha del acto/)).toHaveValue('2026-09-15')
        expect(screen.getByLabelText(/^Fecha de notificación/)).toBeInTheDocument()
        expect(screen.getByLabelText(/^Observaciones/)).toBeInTheDocument()
    })

    it('dice de qué fuero sale el plazo', () => {
        renderForm({ jurisdiction: 'AMPARO' })

        expect(screen.getByText(/el plazo sale de la tabla del fuero Amparo/)).toBeInTheDocument()
    })

    it('la fecha de notificación sólo se habilita en el fuero administrativo (RN6)', () => {
        renderForm()
        expect(screen.getByLabelText(/^Fecha de notificación/)).toBeDisabled()
    })

    it('en el administrativo la notificación está habilitada y es obligatoria', () => {
        renderForm({ jurisdiction: 'ADMINISTRATIVE' })

        expect(screen.getByLabelText(/^Fecha de notificación/)).toBeEnabled()
        expect(screen.getByText(/el plazo corre desde la notificación/)).toBeInTheDocument()
    })

    it('un estado escrito a mano avisa que no tiene plazo de tabla', () => {
        renderForm({ customState: true, values: { ...EMPTY, stateText: 'En espera de pericia' } })

        expect(screen.getByText(/Estado escrito a mano: queda guardado sólo en esta causa/)).toBeInTheDocument()
    })

    /* Sólo el abogado registra actos y el acto se aplica en el momento (V3
       D-13): la nota de RN13 del prototipo no tiene que aparecer. */
    it('no muestra la nota de "pendiente de confirmación" del prototipo', () => {
        renderForm()

        expect(screen.queryByText(/pendiente de confirmación/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/RN13/)).not.toBeInTheDocument()
    })

    it('cambiar una fecha avisa a la pantalla', () => {
        const { onChange } = renderForm()

        fireEvent.change(screen.getByLabelText(/^Fecha del acto/), { target: { value: '2026-09-10' } })

        expect(onChange).toHaveBeenCalledWith('actDate', '2026-09-10')
    })

    it('muestra los errores de cada campo', () => {
        renderForm({
            errors: {
                stateText: 'Elegí de la lista o escribí el estado al que pasa la causa.',
                actDate: 'La fecha del acto no puede ser posterior a hoy.',
            },
        })

        expect(screen.getByText('Elegí de la lista o escribí el estado al que pasa la causa.')).toBeInTheDocument()
        expect(screen.getByText('La fecha del acto no puede ser posterior a hoy.')).toBeInTheDocument()
    })

    it('"Registrar acto" confirma, y mientras guarda queda bloqueado', async () => {
        const { user, onConfirm } = renderForm()

        await user.click(screen.getByRole('button', { name: 'Registrar acto' }))

        expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('mientras guarda, bloquea el confirmar', () => {
        renderForm({ saving: true })

        expect(screen.getByRole('button', { name: 'Registrar acto' })).toBeDisabled()
    })
})
