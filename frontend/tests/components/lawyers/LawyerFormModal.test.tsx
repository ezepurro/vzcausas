import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
    LawyerFormModal,
    type LawyerFormModalProps,
} from '@/features/lawyers/components/LawyerFormModal'

/**
 * El modal es presentacional: recibe valores y errores y avisa. Validar y
 * llamar al servidor es de `LawyersPage`, y se prueba en su test.
 */
function renderModal(props: Partial<LawyerFormModalProps> = {}) {
    const handlers = { onChange: vi.fn(), onConfirm: vi.fn(), onCancel: vi.fn() }
    render(
        <LawyerFormModal
            values={{ fullName: '', registrationNumber: '' }}
            errors={{}}
            saving={false}
            {...handlers}
            {...props}
        />,
    )
    return { ...handlers, user: userEvent.setup() }
}

describe('LawyerFormModal', () => {
    it('muestra los dos campos con los valores recibidos', () => {
        renderModal({ values: { fullName: 'Dra. Ana Pérez', registrationNumber: '1-50000' } })

        expect(screen.getByRole('heading', { name: 'Registrar abogado' })).toBeInTheDocument()
        expect(screen.getByLabelText(/^apellido y nombre/i)).toHaveValue('Dra. Ana Pérez')
        expect(screen.getByLabelText(/^matrícula/i)).toHaveValue('1-50000')
    })

    it('avisa los cambios con la clave del campo', async () => {
        const { user, onChange } = renderModal()

        await user.type(screen.getByLabelText(/^matrícula/i), '1')

        expect(onChange).toHaveBeenCalledWith('registrationNumber', '1')
    })

    it('muestra el error de cada campo', () => {
        renderModal({ errors: { registrationNumber: 'La matrícula es obligatoria.' } })

        expect(screen.getByText('La matrícula es obligatoria.')).toBeInTheDocument()
    })

    it('confirmar y cancelar avisan a la pantalla', async () => {
        const { user, onConfirm, onCancel } = renderModal()

        await user.click(screen.getByRole('button', { name: 'Registrar abogado' }))
        await user.click(screen.getByRole('button', { name: 'Cancelar' }))

        expect(onConfirm).toHaveBeenCalledTimes(1)
        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('mientras guarda, bloquea el confirmar', () => {
        renderModal({ saving: true })

        expect(screen.getByRole('button', { name: 'Registrar abogado' })).toBeDisabled()
    })
})
