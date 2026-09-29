import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteUserModal } from '@/features/users/components/DeleteUserModal'
import type { User } from '@/features/users/types/user'

const USER: User = {
    id: 8,
    username: 'gestion',
    fullName: 'Gestión Estudio',
    email: 'gestion@vazquezzarate.com',
    roles: ['SECRETARY'],
    lawyer: null,
    lastLoginAt: null,
    active: true,
}

function renderModal(saving = false) {
    const handlers = { onConfirm: vi.fn(), onCancel: vi.fn() }
    render(<DeleteUserModal user={USER} saving={saving} {...handlers} />)
    return { ...handlers, user: userEvent.setup() }
}

describe('DeleteUserModal', () => {
    it('nombra al usuario que se va a eliminar', () => {
        renderModal()

        expect(screen.getByRole('heading', { name: 'Eliminar usuario' })).toBeInTheDocument()
        expect(screen.getByRole('dialog')).toHaveTextContent('Gestión Estudio · gestion')
    })

    it('advierte que hay que reasignar sus causas', () => {
        renderModal()

        expect(screen.getByRole('dialog')).toHaveTextContent(/reasignarlas/i)
    })

    it('confirmar avisa a la pantalla', async () => {
        const { user, onConfirm } = renderModal()

        await user.click(screen.getByRole('button', { name: 'Eliminar' }))

        expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('cancelar avisa a la pantalla sin confirmar', async () => {
        const { user, onCancel, onConfirm } = renderModal()

        await user.click(screen.getByRole('button', { name: 'Cancelar' }))

        expect(onCancel).toHaveBeenCalledTimes(1)
        expect(onConfirm).not.toHaveBeenCalled()
    })

    it('mientras elimina, bloquea el confirmar', () => {
        renderModal(true)

        expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled()
    })
})
