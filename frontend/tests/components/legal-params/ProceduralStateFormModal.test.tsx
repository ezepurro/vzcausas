import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
    ProceduralStateFormModal,
    type ProceduralStateFormModalProps,
} from '@/features/legal-params/components/ProceduralStateFormModal'

const VALUES: ProceduralStateFormModalProps['values'] = {
    name: '',
    timeLimitDays: '',
    dayType: 'BUSINESS',
    terminal: false,
}

function renderModal(props: Partial<ProceduralStateFormModalProps> = {}) {
    const handlers = { onChange: vi.fn(), onConfirm: vi.fn(), onCancel: vi.fn() }
    render(
        <ProceduralStateFormModal
            mode="create"
            sub="Ciclo de vida del fuero Penal"
            values={VALUES}
            errors={{}}
            saving={false}
            {...handlers}
            {...props}
        />,
    )
    return { ...handlers, user: userEvent.setup() }
}

describe('ProceduralStateFormModal', () => {
    it('en el alta usa los textos de registrar', () => {
        renderModal()

        expect(screen.getByRole('heading', { name: 'Registrar estado procesal' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Registrar estado' })).toBeInTheDocument()
    })

    it('en la edición usa los textos de modificar', () => {
        renderModal({ mode: 'edit' })

        expect(screen.getByRole('heading', { name: 'Modificar estado procesal' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
    })

    it('no pregunta dónde va el estado: los estados no tienen orden (V3 D-31)', () => {
        renderModal()

        expect(screen.queryByLabelText(/dónde va este estado/i)).not.toBeInTheDocument()
        expect(screen.queryByText('Lugar en el ciclo de vida')).not.toBeInTheDocument()
    })

    it('con plazo mayor a 0 pregunta cómo se cuentan los días', () => {
        renderModal({ values: { ...VALUES, timeLimitDays: '5' } })

        expect(screen.getByLabelText(/se cuentan en días/i)).toBeInTheDocument()
    })

    it('con plazo 0 esconde el tipo de día', () => {
        renderModal({ values: { ...VALUES, timeLimitDays: '0', dayType: 'NONE' } })

        expect(screen.queryByLabelText(/se cuentan en días/i)).not.toBeInTheDocument()
    })

    it('avisa los cambios de texto, select y tilde', async () => {
        const { user, onChange } = renderModal()

        await user.type(screen.getByLabelText(/^nombre del estado/i), 'O')
        await user.selectOptions(screen.getByLabelText(/se cuentan en días/i), 'CONSECUTIVE')
        await user.click(screen.getByRole('checkbox', { name: /cierra el ciclo/i }))

        expect(onChange).toHaveBeenCalledWith('name', 'O')
        expect(onChange).toHaveBeenCalledWith('dayType', 'CONSECUTIVE')
        expect(onChange).toHaveBeenCalledWith('terminal', true)
    })

    it('muestra el error de cada campo', () => {
        renderModal({ errors: { name: 'El nombre del estado es obligatorio.' } })

        expect(screen.getByText('El nombre del estado es obligatorio.')).toBeInTheDocument()
    })

    it('mientras guarda, bloquea el confirmar', () => {
        renderModal({ saving: true })

        expect(screen.getByRole('button', { name: 'Registrar estado' })).toBeDisabled()
    })
})
