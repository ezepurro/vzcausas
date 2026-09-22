import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteProceduralStateModal } from '@/features/legal-params/components/DeleteProceduralStateModal'
import type { ProceduralState } from '@/features/legal-params/types/proceduralState'

const STATE: ProceduralState = {
    id: 2,
    name: 'Cédula de notificación',
    jurisdiction: 'CRIMINAL',
    position: 2,
    timeLimitDays: 3,
    dayType: 'BUSINESS',
    terminal: false,
    activeCases: 0,
    active: true,
}

function renderModal(saving = false) {
    const handlers = { onConfirm: vi.fn(), onCancel: vi.fn() }
    render(<DeleteProceduralStateModal state={STATE} saving={saving} {...handlers} />)
    return { ...handlers, user: userEvent.setup() }
}

describe('DeleteProceduralStateModal', () => {
    it('nombra el estado y su fuero, y advierte que es irreversible', () => {
        renderModal()

        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveTextContent('Cédula de notificación · fuero Penal')
        expect(dialog).toHaveTextContent(/irreversible/i)
    })

    it('confirmar avisa a la pantalla', async () => {
        const { user, onConfirm } = renderModal()

        await user.click(screen.getByRole('button', { name: 'Eliminar' }))

        expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('cancelar avisa a la pantalla', async () => {
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
