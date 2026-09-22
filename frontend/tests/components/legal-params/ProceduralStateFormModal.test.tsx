import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
    ProceduralStateFormModal,
    type ProceduralStateFormModalProps,
} from '@/features/legal-params/components/ProceduralStateFormModal'

const VALUES: ProceduralStateFormModalProps['values'] = {
    name: '',
    positionChoice: 'LAST',
    timeLimitDays: '',
    dayType: 'BUSINESS',
    terminal: false,
}

const POSITION_OPTIONS = [
    { value: 'FIRST', label: 'Al inicio del ciclo' },
    { value: 'AFTER:1', label: 'Después de «Designación»' },
    { value: 'LAST', label: 'Al final del ciclo' },
]

function renderModal(props: Partial<ProceduralStateFormModalProps> = {}) {
    const handlers = { onChange: vi.fn(), onConfirm: vi.fn(), onCancel: vi.fn() }
    render(
        <ProceduralStateFormModal
            mode="create"
            sub="Ciclo de vida del fuero Penal"
            values={VALUES}
            errors={{}}
            positionOptions={POSITION_OPTIONS}
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

    it('ofrece las posiciones que arma la pantalla', () => {
        renderModal()

        const select = screen.getByLabelText(/dónde va este estado/i)
        const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent)
        expect(options).toEqual(['Al inicio del ciclo', 'Después de «Designación»', 'Al final del ciclo'])
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
        await user.selectOptions(screen.getByLabelText(/dónde va este estado/i), 'FIRST')
        await user.click(screen.getByRole('checkbox', { name: /cierra el ciclo/i }))

        expect(onChange).toHaveBeenCalledWith('name', 'O')
        expect(onChange).toHaveBeenCalledWith('positionChoice', 'FIRST')
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
