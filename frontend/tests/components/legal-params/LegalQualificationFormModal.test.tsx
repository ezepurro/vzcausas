import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
    LegalQualificationFormModal,
    type LegalQualificationFormModalProps,
} from '@/features/legal-params/components/LegalQualificationFormModal'

function renderModal(props: Partial<LegalQualificationFormModalProps> = {}) {
    const handlers = { onChange: vi.fn(), onConfirm: vi.fn(), onCancel: vi.fn() }
    render(
        <LegalQualificationFormModal
            mode="create"
            values={{ name: '', years: '', months: '0' }}
            errors={{}}
            saving={false}
            {...handlers}
            {...props}
        />,
    )
    return { ...handlers, user: userEvent.setup() }
}

describe('LegalQualificationFormModal', () => {
    it('el alta: título, aclaración y los tres campos', () => {
        renderModal()

        expect(screen.getByRole('dialog', { name: 'Registrar calificación legal' })).toBeInTheDocument()
        expect(screen.getByText('Queda disponible para seleccionar al registrar causas.')).toBeInTheDocument()
        expect(screen.getByLabelText(/^Nombre de la calificación legal/)).toBeInTheDocument()
        expect(screen.getByLabelText(/^Años/)).toBeInTheDocument()
        expect(screen.getByLabelText(/^Meses/)).toHaveValue('0')
    })

    it('avisa cada cambio con su campo', async () => {
        const { user, onChange } = renderModal()

        await user.type(screen.getByLabelText(/^Años/), '6')
        await user.selectOptions(screen.getByLabelText(/^Meses/), '6')

        expect(onChange).toHaveBeenCalledWith('years', '6')
        expect(onChange).toHaveBeenCalledWith('months', '6')
    })

    it('confirmar y cancelar avisan a la pantalla', async () => {
        const { user, onConfirm, onCancel } = renderModal()

        await user.click(screen.getByRole('button', { name: 'Registrar calificación' }))
        await user.click(screen.getByRole('button', { name: 'Cancelar' }))

        expect(onConfirm).toHaveBeenCalledTimes(1)
        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('muestra los errores que le pasan', () => {
        renderModal({ errors: { name: 'Ya existe una calificación legal con esa denominación.', years: 'Los años son obligatorios.' } })

        expect(screen.getByText('Ya existe una calificación legal con esa denominación.')).toBeInTheDocument()
        expect(screen.getByText('Los años son obligatorios.')).toBeInTheDocument()
    })

    it('mientras guarda, no deja confirmar de nuevo', () => {
        renderModal({ saving: true })

        expect(screen.getByRole('button', { name: 'Registrar calificación' })).toBeDisabled()
    })
})
