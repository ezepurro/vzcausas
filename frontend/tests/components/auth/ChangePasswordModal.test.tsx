import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { server } from '@/shared/mocks/server'
import { db, errorBody } from '@/shared/mocks'
import { ChangePasswordModal } from '@/features/auth/components/ChangePasswordModal'

/** El modal usa el usuario de la sesión: siempre se abre con alguien adentro. */
function renderModal() {
    const onClose = vi.fn()
    const result = renderWithProviders(<ChangePasswordModal onClose={onClose} />, { as: 'fvazquez' })
    return { ...result, onClose }
}

async function fill(
    user: ReturnType<typeof renderModal>['user'],
    { current, next, repeat }: { current: string; next: string; repeat: string },
) {
    await user.type(screen.getByLabelText(/^contraseña actual/i), current)
    await user.type(screen.getByLabelText(/^contraseña nueva/i), next)
    await user.type(screen.getByLabelText(/^repetir la nueva/i), repeat)
}

const submitButton = () => screen.getByRole('button', { name: 'Cambiar contraseña' })

describe('ChangePasswordModal', () => {
    it('muestra a quién se le cambia la contraseña', () => {
        renderModal()

        expect(screen.getByRole('dialog')).toHaveTextContent('Fernando G. Vázquez · fvazquez')
    })

    it('cambia la contraseña, avisa que la sesión sigue abierta y cierra', async () => {
        const { user, onClose } = renderModal()

        await fill(user, { current: 'password1', next: 'nueva2026', repeat: 'nueva2026' })
        await user.click(submitButton())

        expect(await screen.findByText('Contraseña actualizada. La sesión sigue abierta.')).toBeInTheDocument()
        expect(onClose).toHaveBeenCalledTimes(1)
        expect(db.passwords.get('fvazquez')).toBe('nueva2026')
    })

    it('enviado vacío marca los tres campos y no llama al servidor', async () => {
        const { user, onClose } = renderModal()

        await user.click(submitButton())

        expect(screen.getByText('La contraseña actual es obligatoria.')).toBeInTheDocument()
        expect(screen.getByText('La contraseña nueva es obligatoria.')).toBeInTheDocument()
        expect(screen.getByText('Repetí la contraseña nueva.')).toBeInTheDocument()
        expect(onClose).not.toHaveBeenCalled()
        expect(db.passwords.get('fvazquez')).toBe('password1')
    })

    it('marca la repetición si no coincide', async () => {
        const { user } = renderModal()

        await fill(user, { current: 'password1', next: 'nueva2026', repeat: 'otra2026' })
        await user.click(submitButton())

        expect(screen.getByText('Las contraseñas nuevas no coinciden.')).toBeInTheDocument()
    })

    it('si la contraseña actual es incorrecta, lo marca en ese campo', async () => {
        const { user, onClose } = renderModal()

        await fill(user, { current: 'equivocada1', next: 'nueva2026', repeat: 'nueva2026' })
        await user.click(submitButton())

        expect(await screen.findByText('La contraseña actual es incorrecta.')).toBeInTheDocument()
        // Va en el campo, no en un aviso suelto.
        expect(screen.getByLabelText(/^contraseña actual/i).closest('.vz-field')).toHaveClass(
            'vz-field--error',
        )
        expect(onClose).not.toHaveBeenCalled()
    })

    it('si el servidor falla, avisa y deja el modal abierto con lo escrito', async () => {
        server.use(
            http.patch('*/auth/password', () =>
                HttpResponse.json(errorBody('INTERNAL_SERVER_ERROR', 'Error del servidor de prueba.'), {
                    status: 500,
                }),
            ),
        )
        const { user, onClose } = renderModal()

        await fill(user, { current: 'password1', next: 'nueva2026', repeat: 'nueva2026' })
        await user.click(submitButton())

        expect(await screen.findByText('Error del servidor de prueba.')).toBeInTheDocument()
        expect(onClose).not.toHaveBeenCalled()
        expect(screen.getByLabelText(/^contraseña nueva/i)).toHaveValue('nueva2026')
    })

    it('cancelar cierra sin llamar al servidor', async () => {
        const { user, onClose } = renderModal()

        await user.click(screen.getByRole('button', { name: 'Cancelar' }))

        expect(onClose).toHaveBeenCalledTimes(1)
        expect(db.passwords.get('fvazquez')).toBe('password1')
    })
})
