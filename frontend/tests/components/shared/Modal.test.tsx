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

/** El fondo no tiene rol propio: se lo busca por su clase. */
const backdrop = () => document.querySelector('.vz-modal-backdrop') as HTMLElement

describe('Modal', () => {
    it('el diálogo se llama como su título', () => {
        renderModal()

        expect(screen.getByRole('dialog', { name: 'Registrar usuario' })).toBeInTheDocument()
    })

    it('Escape lo cierra', async () => {
        const { onClose, user } = renderModal()

        await user.keyboard('{Escape}')

        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('Escape lo cierra también con el foco dentro de un campo', async () => {
        const { onClose, user } = renderModal()

        await user.click(screen.getByLabelText('Nombre'))
        await user.keyboard('{Escape}')

        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('un click en el fondo lo cierra', async () => {
        const { onClose, user } = renderModal()

        await user.click(backdrop())

        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('un click adentro no lo cierra', async () => {
        const { onClose, user } = renderModal()

        await user.click(screen.getByLabelText('Nombre'))

        expect(onClose).not.toHaveBeenCalled()
    })

    /* Seleccionar texto en un campo y soltar el botón afuera contaba como
       click en el fondo: el modal se cerraba con todo lo escrito adentro. */
    it('arrastrar desde adentro y soltar en el fondo no lo cierra', async () => {
        const { onClose } = renderModal()
        const field = screen.getByLabelText('Nombre')

        await userEvent.pointer([
            { target: field, keys: '[MouseLeft>]' },
            { target: backdrop() },
            { keys: '[/MouseLeft]' },
        ])

        expect(onClose).not.toHaveBeenCalled()
    })

    it('al abrir, el foco entra al modal', () => {
        renderModal()

        expect(screen.getByRole('dialog')).toHaveFocus()
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

        it('desde el primero, Shift+Tab va al último', async () => {
            const { user } = renderModal()

            await user.click(field())
            await user.tab({ shift: true })

            expect(confirm()).toHaveFocus()
        })

        it('tabulando en vueltas nunca se llega a lo de afuera', async () => {
            const { user } = renderModal()
            const dialog = screen.getByRole('dialog')

            // Más vueltas que paradas: si hubiera fuga, ya habría pasado.
            for (let i = 0; i < 6; i += 1) {
                await user.tab()
                expect(dialog).toContainElement(document.activeElement as HTMLElement)
            }
        })

        /* Después de un click en el fondo el foco queda afuera del diálogo.
           La próxima tecla tiene que devolverlo adentro, no seguir paseando
           por la pantalla de atrás.

           Se prueba con Shift+Tab a propósito: el botón de afuera es el
           primero del documento, así que con Tab a secas el foco caería en el
           campo igual, por orden y no porque alguien lo haya traído. Hacia
           atrás no hay nada, así que sólo el trap puede devolverlo. */
        it('si el foco se escapó, la próxima tecla lo trae de vuelta', async () => {
            const { user } = renderModal()

            outside().focus()
            await user.tab({ shift: true })

            expect(confirm()).toHaveFocus()
        })
    })
})
