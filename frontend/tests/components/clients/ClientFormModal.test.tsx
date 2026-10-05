import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
    ClientFormModal,
    type ClientFormModalProps,
} from '@/features/clients/components/ClientFormModal'

const EMPTY: ClientFormModalProps['values'] = {
    lastName: '',
    firstName: '',
    dni: '',
    phone: '',
    email: '',
}

/**
 * El modal es presentacional: recibe valores y errores y avisa. Validar y
 * llamar al servidor es de quien lo abre —la pantalla Clientes o el alta de
 * causa—, y se prueba en el test de esa pantalla.
 */
function renderModal(props: Partial<ClientFormModalProps> = {}) {
    const handlers = { onChange: vi.fn(), onConfirm: vi.fn(), onCancel: vi.fn() }
    render(<ClientFormModal values={EMPTY} errors={{}} saving={false} {...handlers} {...props} />)
    return { ...handlers, user: userEvent.setup() }
}

describe('ClientFormModal', () => {
    /* CA-8.1: los campos del diálogo "Registrar cliente" del prototipo. */
    it('muestra los cinco campos con los valores recibidos', () => {
        renderModal({
            values: {
                lastName: 'BENÍTEZ',
                firstName: 'Rodrigo E.',
                dni: '31.556.208',
                phone: '351 401-5573',
                email: 'rbenitez@gmail.com',
            },
        })

        expect(screen.getByRole('heading', { name: 'Registrar cliente' })).toBeInTheDocument()
        expect(screen.getByLabelText(/^apellido/i)).toHaveValue('BENÍTEZ')
        expect(screen.getByLabelText(/^nombres/i)).toHaveValue('Rodrigo E.')
        expect(screen.getByLabelText(/^dni/i)).toHaveValue('31.556.208')
        expect(screen.getByLabelText(/^teléfono/i)).toHaveValue('351 401-5573')
        expect(screen.getByLabelText(/^correo electrónico/i)).toHaveValue('rbenitez@gmail.com')
    })

    it('marca como obligatorios el apellido, los nombres y el DNI, y no el teléfono ni el correo', () => {
        renderModal()

        // El asterisco va pegado al rótulo del campo obligatorio.
        expect(screen.getByText('Apellido').closest('label')).toHaveTextContent('Apellido*')
        expect(screen.getByText('Nombres').closest('label')).toHaveTextContent('Nombres*')
        expect(screen.getByText('DNI').closest('label')).toHaveTextContent('DNI*')
        expect(screen.getByText('Teléfono').closest('label')).toHaveTextContent(/^Teléfono$/)
        expect(screen.getByText('Correo electrónico').closest('label')).toHaveTextContent(/^Correo electrónico$/)
    })

    it('desde la pantalla Clientes aclara para qué se usan los datos de contacto', () => {
        renderModal()

        expect(
            screen.getByText('Los datos de contacto se usan para los avisos de vencimiento.'),
        ).toBeInTheDocument()
    })

    /* CA-8.9: abierto desde "Registrar cliente nuevo" del alta de causa. */
    it('desde el alta de causa avisa que el cliente queda seleccionado', () => {
        renderModal({ fromCase: true })

        expect(
            screen.getByText('Al confirmar, el cliente queda seleccionado en la causa.'),
        ).toBeInTheDocument()
    })

    it('avisa los cambios con la clave del campo', async () => {
        const { user, onChange } = renderModal()

        await user.type(screen.getByLabelText(/^apellido/i), 'B')
        await user.type(screen.getByLabelText(/^dni/i), '3')
        await user.type(screen.getByLabelText(/^correo electrónico/i), 'r')

        expect(onChange).toHaveBeenCalledWith('lastName', 'B')
        expect(onChange).toHaveBeenCalledWith('dni', '3')
        expect(onChange).toHaveBeenCalledWith('email', 'r')
    })

    /* CA-8.3 y CA-8.4: el error se señala en el campo. */
    it('muestra el error de cada campo y lo marca', () => {
        renderModal({
            errors: {
                lastName: 'El apellido es obligatorio.',
                dni: 'Ya existe un cliente registrado con ese DNI.',
            },
        })

        expect(screen.getByText('El apellido es obligatorio.')).toBeInTheDocument()
        expect(screen.getByText('Ya existe un cliente registrado con ese DNI.')).toBeInTheDocument()
        expect(screen.getByLabelText(/^dni/i).closest('.vz-field')).toHaveClass('vz-field--error')
        expect(screen.getByLabelText(/^nombres/i).closest('.vz-field')).not.toHaveClass('vz-field--error')
    })

    it('confirmar y cancelar avisan a la pantalla', async () => {
        const { user, onConfirm, onCancel } = renderModal()

        await user.click(screen.getByRole('button', { name: 'Registrar cliente' }))
        await user.click(screen.getByRole('button', { name: 'Cancelar' }))

        expect(onConfirm).toHaveBeenCalledTimes(1)
        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('mientras guarda, bloquea el confirmar', () => {
        renderModal({ saving: true })

        expect(screen.getByRole('button', { name: 'Registrar cliente' })).toBeDisabled()
    })
})
