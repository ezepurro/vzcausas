import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteProceduralStateModal } from '@/features/legal-params/components/DeleteProceduralStateModal'
import type { ProceduralState } from '@/features/legal-params/types/proceduralState'

const STATE: ProceduralState = {
    id: 2,
    name: 'Cédula de notificación',
    jurisdiction: 'CRIMINAL',
    timeLimitDays: 3,
    dayType: 'BUSINESS',
    terminal: false,
    activeCases: 0,
    active: true,
}

function renderModal(saving = false, state: ProceduralState = STATE) {
    const handlers = { onConfirm: vi.fn(), onCancel: vi.fn() }
    render(<DeleteProceduralStateModal state={state} saving={saving} {...handlers} />)
    return { ...handlers, user: userEvent.setup() }
}

describe('DeleteProceduralStateModal', () => {
    it('nombra el estado y su fuero, y dice que no tiene causas', () => {
        renderModal()

        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveTextContent('Cédula de notificación · fuero Penal')
        expect(dialog).toHaveTextContent('Este estado no tiene causas asociadas.')
    })

    /* La baja procede igual (V3 D-06): el texto avisa qué pasa con las causas. */
    it('si hay causas en el estado, avisa que lo conservan', () => {
        renderModal(false, { ...STATE, activeCases: 3 })

        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveTextContent('Hay 3 causas en este estado')
        expect(dialog).toHaveTextContent(/conservan el estado que ya tienen registrado/)
    })

    it('con una sola causa, lo dice en singular', () => {
        renderModal(false, { ...STATE, activeCases: 1 })

        expect(screen.getByRole('dialog')).toHaveTextContent('Hay 1 causa en este estado')
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
