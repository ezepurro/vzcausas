/**
 * El caparazón de modal que usan todas las pantallas.
 *
 * Existe porque el componente documentaba desde el primer día que se cerraba
 * "con click en el fondo o Escape" y el Escape no estaba implementado: no
 * había ningún handler de teclado en todo `src/`. Nadie lo notó porque ningún
 * test lo miraba.
 */

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '@/shared/components/ui/Modal'

function renderModal() {
    const onClose = vi.fn()
    render(
        <>
            {/* Fuera del modal: es a donde el tabulador NO tiene que llegar. */}
            <button>Botón de la pantalla</button>
            <Modal
                title="Registrar usuario"
                sub="Datos personales"
                onClose={onClose}
                footer={<button>Confirmar</button>}
            >
                <input aria-label="Nombre" />
            </Modal>
        </>,
    )
    return { onClose, user: userEvent.setup() }
}

describe('Modal', () => {
    it('Escape lo cierra', async () => {
        const { onClose, user } = renderModal()

        await user.keyboard('{Escape}')

        expect(onClose).toHaveBeenCalledTimes(1)
    })

    describe('el tabulador no se escapa', () => {
        const field = () => screen.getByLabelText('Nombre')
        const confirm = () => screen.getByRole('button', { name: 'Confirmar' })
        const outside = () => screen.getByRole('button', { name: 'Botón de la pantalla' })

        it('desde el último, Tab vuelve al primero', async () => {
            const { user } = renderModal()

            await user.click(confirm())
            await user.tab()

            expect(field()).toHaveFocus()
            expect(outside()).not.toHaveFocus()
        })
    })
})
