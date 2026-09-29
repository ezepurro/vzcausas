import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserFormModal, type UserFormModalProps } from '@/features/users/components/UserFormModal'
import { LAWYER_MODES, type UserFormValues } from '@/features/users/types/user'

const VALUES: UserFormValues = {
    fullName: '',
    username: '',
    email: '',
    password: '',
    passwordConfirm: '',
    roleAdministrator: false,
    roleLawyer: true,
    roleSecretary: false,
    lawyerMode: LAWYER_MODES.link,
    lawyerId: '',
    lawyerFullName: '',
    registrationNumber: '',
}

const LAWYER_OPTIONS = [
    { value: '1', label: 'Dr. Fernando G. Vázquez · matrícula 1-28114' },
    { value: '3', label: 'Dra. Malena Ríos · matrícula 1-36842' },
]

function renderModal(props: Partial<UserFormModalProps> = {}) {
    const handlers = { onChange: vi.fn(), onConfirm: vi.fn(), onCancel: vi.fn() }
    render(
        <UserFormModal
            mode="create"
            sub=""
            values={VALUES}
            errors={{}}
            lawyerOptions={LAWYER_OPTIONS}
            saving={false}
            roles={['LAWYER']}
            {...handlers}
            {...props}
        />,
    )
    return { ...handlers, user: userEvent.setup() }
}

/* Los rótulos llevan el asterisco de obligatorio pegado: "Matrícula*". */
const label = {
    fullName: /^nombre y apellido\*?$/i,
    password: /^contraseña inicial/i,
    lawyerMode: /^ficha de abogado/i,
    lawyerId: /^abogado\*?$/i,
    lawyerFullName: /^nombre y apellido del abogado/i,
    registrationNumber: /^matrícula/i,
}

describe('UserFormModal', () => {
    describe('alta', () => {
        it('pide contraseña y su repetición', () => {
            renderModal()

            expect(screen.getByRole('heading', { name: 'Registrar usuario' })).toBeInTheDocument()
            expect(screen.getByLabelText(label.password)).toHaveAttribute('type', 'password')
            expect(screen.getByLabelText(/^repetir contraseña/i)).toBeInTheDocument()
        })

        it('con perfil abogado ofrece vincular una ficha existente', () => {
            renderModal()

            expect(screen.getByLabelText(label.lawyerMode)).toBeInTheDocument()
            const options = Array.from(
                screen.getByLabelText(label.lawyerId).querySelectorAll('option'),
            ).map((o) => o.textContent)
            expect(options).toEqual(['Seleccioná un abogado', ...LAWYER_OPTIONS.map((o) => o.label)])
        })

        /* La aserción que faltaba: que lo que se ve sea lo que vale. Sin la
           opción vacía, `lawyerId` arranca en `''`, ninguna opción coincide y
           el navegador selecciona la primera ficha — así que la pantalla
           muestra un abogado elegido que el formulario no tiene. */
        it('arranca sin ningún abogado elegido', () => {
            renderModal()

            expect(screen.getByLabelText(label.lawyerId)).toHaveValue('')
        })

        it('en modo registrar pide nombre y matrícula de la ficha nueva', () => {
            renderModal({ values: { ...VALUES, lawyerMode: LAWYER_MODES.create } })

            expect(screen.getByLabelText(label.lawyerFullName)).toBeInTheDocument()
            expect(screen.getByLabelText(label.registrationNumber)).toBeInTheDocument()
            expect(screen.queryByLabelText(label.lawyerId)).not.toBeInTheDocument()
        })

        it('con perfil secretaría no muestra la ficha profesional', () => {
            renderModal({
                roles: ['SECRETARY'],
                values: { ...VALUES, roleLawyer: false, roleSecretary: true },
            })

            expect(screen.queryByText('Ficha profesional')).not.toBeInTheDocument()
            expect(screen.queryByLabelText(label.lawyerMode)).not.toBeInTheDocument()
            expect(screen.queryByLabelText(label.lawyerId)).not.toBeInTheDocument()
        })
    })

    describe('edición', () => {
        it('no pide contraseña ni ofrece registrar una ficha nueva', () => {
            renderModal({ mode: 'edit', sub: 'Malena Ríos · mrios' })

            expect(screen.getByRole('heading', { name: 'Modificar usuario' })).toBeInTheDocument()
            expect(screen.queryByLabelText(label.password)).not.toBeInTheDocument()
            expect(screen.queryByLabelText(label.lawyerMode)).not.toBeInTheDocument()
            expect(screen.getByLabelText(label.lawyerId)).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
        })
    })

    it('muestra un tilde por perfil con el estado recibido', () => {
        renderModal({ values: { ...VALUES, roleAdministrator: true } })

        expect(screen.getByRole('checkbox', { name: /^administrador/i })).toBeChecked()
        expect(screen.getByRole('checkbox', { name: /^abogado/i })).toBeChecked()
        expect(screen.getByRole('checkbox', { name: /^secretaría/i })).not.toBeChecked()
    })

    it('avisa los cambios de texto y de tildes', async () => {
        const { user, onChange } = renderModal()

        await user.type(screen.getByLabelText(label.fullName), 'A')
        await user.click(screen.getByRole('checkbox', { name: /^secretaría/i }))

        expect(onChange).toHaveBeenCalledWith('fullName', 'A')
        expect(onChange).toHaveBeenCalledWith('roleSecretary', true)
    })

    it('muestra el error de cada campo', () => {
        renderModal({ errors: { email: 'El correo electrónico es obligatorio.' } })

        expect(screen.getByText('El correo electrónico es obligatorio.')).toBeInTheDocument()
    })

    it('confirmar y cancelar avisan a la pantalla', async () => {
        const { user, onConfirm, onCancel } = renderModal()

        await user.click(screen.getByRole('button', { name: 'Registrar usuario' }))
        await user.click(screen.getByRole('button', { name: 'Cancelar' }))

        expect(onConfirm).toHaveBeenCalledTimes(1)
        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('mientras guarda, bloquea el confirmar', () => {
        renderModal({ saving: true })

        expect(screen.getByRole('button', { name: 'Registrar usuario' })).toBeDisabled()
    })
})
