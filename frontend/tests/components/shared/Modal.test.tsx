/**
 * El caparazón de modal que usan todas las pantallas.
 *
 * Existe porque el componente documentaba desde el primer día que se cerraba
 * "con click en el fondo o Escape" y el Escape no estaba implementado: no
 * había ningún handler de teclado en todo `src/`. Nadie lo notó porque ningún
 * test lo miraba.
 */

import { useState } from 'react'
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
    /* H-06 de `docs/auditoria-front`: cada modal escucha el teclado en
       `document`, y con dos abiertos un Escape cerraba a los dos. */
    describe('con un modal encima de otro', () => {
        function Stacked({ onCloseLower, onCloseUpper }: { onCloseLower: () => void; onCloseUpper: () => void }) {
            const [upper, setUpper] = useState(true)
            // `onClose` en línea a propósito: cambia en cada render, como en las pantallas.
            return (
                <>
                    <Modal title="De abajo" onClose={() => onCloseLower()}>
                        <button type="button">Botón de abajo</button>
                    </Modal>
                    {upper && (
                        <Modal
                            title="De arriba"
                            onClose={() => {
                                onCloseUpper()
                                setUpper(false)
                            }}
                        >
                            <button type="button">Botón de arriba</button>
                        </Modal>
                    )}
                </>
            )
        }

        it('Escape cierra sólo el de arriba; el siguiente, el de abajo', async () => {
            const onCloseLower = vi.fn()
            const onCloseUpper = vi.fn()
            const user = userEvent.setup()
            render(<Stacked onCloseLower={onCloseLower} onCloseUpper={onCloseUpper} />)

            await user.keyboard('{Escape}')
            expect(onCloseUpper).toHaveBeenCalledTimes(1)
            expect(onCloseLower).not.toHaveBeenCalled()

            await user.keyboard('{Escape}')
            expect(onCloseLower).toHaveBeenCalledTimes(1)
        })

        it('el tabulador se queda en el de arriba', async () => {
            const user = userEvent.setup()
            render(<Stacked onCloseLower={vi.fn()} onCloseUpper={vi.fn()} />)

            const upper = screen.getByRole('dialog', { name: 'De arriba' })
            // Tres veces: la "×", el botón y de vuelta. Nunca sale al de abajo.
            for (let i = 0; i < 3; i++) {
                await user.tab()
                expect(upper).toContainElement(document.activeElement as HTMLElement)
            }
        })
    })

    it('Escape lo cierra', async () => {
        const { onClose, user } = renderModal()

        await user.keyboard('{Escape}')

        expect(onClose).toHaveBeenCalledTimes(1)
    })

    /* H-44: todo modal tiene una forma visible de cerrar. */
    it('la "×" de la cabecera lo cierra', async () => {
        const { onClose, user } = renderModal()

        await user.click(screen.getByRole('button', { name: 'Cerrar' }))

        expect(onClose).toHaveBeenCalledTimes(1)
    })

    /* H-05: un clic afuera se llevaba lo escrito sin preguntar. */
    describe('clic en el fondo', () => {
        const backdrop = () => document.querySelector('.vz-modal-backdrop') as HTMLElement

        it('por defecto lo cierra', async () => {
            const { onClose, user } = renderModal()

            await user.click(backdrop())

            expect(onClose).toHaveBeenCalledTimes(1)
        })

        it('con `dismissOnBackdrop={false}` no lo cierra; Escape y la "×", sí', async () => {
            const onClose = vi.fn()
            const user = userEvent.setup()
            render(
                <Modal title="Registrar cliente" onClose={onClose} dismissOnBackdrop={false}>
                    <input aria-label="Apellido" />
                </Modal>,
            )

            await user.type(screen.getByLabelText('Apellido'), 'Gómez')
            await user.click(backdrop())
            expect(onClose).not.toHaveBeenCalled()
            expect(screen.getByLabelText('Apellido')).toHaveValue('Gómez')

            await user.keyboard('{Escape}')
            await user.click(screen.getByRole('button', { name: 'Cerrar' }))
            expect(onClose).toHaveBeenCalledTimes(2)
        })
    })

    describe('el tabulador no se escapa', () => {
        const field = () => screen.getByLabelText('Nombre')
        const confirm = () => screen.getByRole('button', { name: 'Confirmar' })
        const outside = () => screen.getByRole('button', { name: 'Botón de la pantalla' })
        const close = () => screen.getByRole('button', { name: 'Cerrar' })

        it('desde el último, Tab vuelve al primero', async () => {
            const { user } = renderModal()

            await user.click(confirm())
            await user.tab()

            // El primero es la "×" de la cabecera; el campo viene después.
            expect(close()).toHaveFocus()
            expect(outside()).not.toHaveFocus()
            await user.tab()
            expect(field()).toHaveFocus()
        })
    })
})
