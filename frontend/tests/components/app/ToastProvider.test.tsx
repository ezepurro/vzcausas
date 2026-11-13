/**
 * Los avisos (H-04): cuánto duran según su tipo, que no se vayan mientras se
 * los está leyendo, y que un lector de pantalla los anuncie una sola vez.
 */

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/app/providers/ToastProvider'
import { TOAST_DURATION_MS } from '@/app/providers/toastDuration'
import { useToast, type Toast } from '@/app/providers/ToastContext'

function Trigger({ kind, message }: Pick<Toast, 'kind' | 'message'>) {
    const toast = useToast()
    return <button type="button" onClick={() => toast(kind, message)}>{`Avisar ${message}`}</button>
}

function show(_kind: Toast['kind'], message: string) {
    fireEvent.click(screen.getByRole('button', { name: `Avisar ${message}` }))
}

function renderToasts() {
    render(
        <ToastProvider>
            <Trigger kind="success" message="Cliente registrado." />
            <Trigger kind="info" message="Usuario eliminado." />
            <Trigger kind="error" message="El SAC ya existe." />
        </ToastProvider>,
    )
}

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })

describe('ToastProvider', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('un aviso de éxito se va solo cuando pasa su tiempo', () => {
        renderToasts()
        show('success', 'Cliente registrado.')

        advance(TOAST_DURATION_MS.success - 1)
        expect(screen.getByText('Cliente registrado.')).toBeInTheDocument()

        advance(1)
        expect(screen.queryByText('Cliente registrado.')).not.toBeInTheDocument()
    })

    it('un error dura más que un éxito: da tiempo a leerlo', () => {
        renderToasts()
        show('error', 'El SAC ya existe.')

        expect(TOAST_DURATION_MS.error).toBeGreaterThan(TOAST_DURATION_MS.success)

        advance(TOAST_DURATION_MS.success)
        expect(screen.getByText('El SAC ya existe.')).toBeInTheDocument()

        advance(TOAST_DURATION_MS.error - TOAST_DURATION_MS.success)
        expect(screen.queryByText('El SAC ya existe.')).not.toBeInTheDocument()
    })

    it('con el mouse encima no se va; al salir, vuelve a contar', () => {
        renderToasts()
        show('success', 'Cliente registrado.')
        const toast = screen.getByRole('alert')

        fireEvent.mouseEnter(toast)
        advance(TOAST_DURATION_MS.success * 3)
        expect(screen.getByText('Cliente registrado.')).toBeInTheDocument()

        fireEvent.mouseLeave(toast)
        advance(TOAST_DURATION_MS.success)
        expect(screen.queryByText('Cliente registrado.')).not.toBeInTheDocument()
    })

    it('con el foco adentro tampoco se va', () => {
        renderToasts()
        show('error', 'El SAC ya existe.')

        act(() => { screen.getByRole('button', { name: 'Cerrar aviso' }).focus() })
        advance(TOAST_DURATION_MS.error * 2)

        expect(screen.getByText('El SAC ya existe.')).toBeInTheDocument()
    })

    it('"Cerrar aviso" lo saca en el momento', () => {
        renderToasts()
        show('error', 'El SAC ya existe.')

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }))

        expect(screen.queryByText('El SAC ya existe.')).not.toBeInTheDocument()
    })

    it('se muestran dos como mucho: el tercero saca al más viejo', () => {
        renderToasts()
        show('success', 'Cliente registrado.')
        show('info', 'Usuario eliminado.')
        show('error', 'El SAC ya existe.')

        expect(screen.getAllByRole('alert')).toHaveLength(2)
        expect(screen.queryByText('Cliente registrado.')).not.toBeInTheDocument()
    })

    it('cada aviso se anuncia una sola vez: es una alerta y nada alrededor lo repite', () => {
        renderToasts()
        show('success', 'Cliente registrado.')

        const toast = screen.getByRole('alert')
        expect(toast).toHaveTextContent('Cliente registrado.')
        expect(toast.closest('[aria-live]')).toBeNull()
    })
})
