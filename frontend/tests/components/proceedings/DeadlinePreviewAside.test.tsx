import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
    DeadlinePreviewAside,
    type DeadlinePreviewAsideProps,
    type DeadlinePreviewState,
} from '@/features/proceedings/components/DeadlinePreviewAside'

const READY: DeadlinePreviewState = {
    kind: 'ready',
    stateName: 'Cédula de notificación',
    preview: {
        proceduralStateId: 2,
        timeLimitDays: 3,
        dayType: 'BUSINESS',
        countsFrom: '2026-09-15',
        dueDate: '2026-09-18',
        businessDaysRemaining: 3,
    },
}

function renderAside(props: Partial<DeadlinePreviewAsideProps> = {}) {
    const handlers = { onManualDueChange: vi.fn(), onManualDueDateChange: vi.fn() }
    render(
        <DeadlinePreviewAside
            state={{ kind: 'empty' }}
            manualDue={false}
            manualDueDate=""
            {...handlers}
            {...props}
        />,
    )
    return handlers
}

describe('DeadlinePreviewAside', () => {
    it('sin estado elegido: invita a elegirlo y no ofrece el ajuste manual', () => {
        renderAside()

        expect(screen.getByText(/Elegí el estado procesal al que pasa la causa/)).toBeInTheDocument()
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    })

    it('con el cómputo: plazo, desde cuándo cuenta y el vencimiento', () => {
        renderAside({ state: READY })

        expect(screen.getByText('3 días hábiles')).toBeInTheDocument()
        expect(screen.getByText('15/09/2026')).toBeInTheDocument()
        expect(screen.getByText('Cédula de notificación')).toBeInTheDocument()
        expect(screen.getByText('18/09/2026')).toBeInTheDocument()
        expect(screen.getByText('viernes · faltan 3 días hábiles')).toBeInTheDocument()
    })

    it('un estado que no abre plazo lo dice', () => {
        renderAside({
            state: {
                ...READY,
                preview: { ...READY.preview, timeLimitDays: 0, dayType: 'NONE', dueDate: null, businessDaysRemaining: null },
            } as DeadlinePreviewState,
        })

        expect(screen.getByText('Sin plazo')).toBeInTheDocument()
        expect(screen.getByText('Este acto no dispara un plazo de presentación.')).toBeInTheDocument()
    })

    it('estado escrito a mano: sin plazo de tabla', () => {
        renderAside({ state: { kind: 'custom', stateName: 'Pedido de informes' } })

        expect(screen.getByText('No tiene: estado escrito a mano')).toBeInTheDocument()
        expect(screen.getByText('Sin vencimiento, salvo que lo ajustes a mano.')).toBeInTheDocument()
    })

    it('falta la fecha base, cargando y error', () => {
        const { rerender } = render(
            <DeadlinePreviewAside
                state={{ kind: 'missing-base', message: 'Cargá la fecha de notificación.' }}
                manualDue={false}
                manualDueDate=""
                onManualDueChange={vi.fn()}
                onManualDueDateChange={vi.fn()}
            />,
        )
        expect(screen.getByText('Cargá la fecha de notificación.')).toBeInTheDocument()

        rerender(
            <DeadlinePreviewAside
                state={{ kind: 'loading' }}
                manualDue={false}
                manualDueDate=""
                onManualDueChange={vi.fn()}
                onManualDueDateChange={vi.fn()}
            />,
        )
        expect(screen.getByText('Calculando el vencimiento…')).toBeInTheDocument()

        rerender(
            <DeadlinePreviewAside
                state={{ kind: 'error', message: 'Se requiere el rol LAWYER para realizar esta operación.' }}
                manualDue={false}
                manualDueDate=""
                onManualDueChange={vi.fn()}
                onManualDueDateChange={vi.fn()}
            />,
        )
        expect(screen.getByText('Se requiere el rol LAWYER para realizar esta operación.')).toBeInTheDocument()
    })

    it('tildar el ajuste manual avisa a la pantalla', async () => {
        const user = userEvent.setup()
        const handlers = renderAside({ state: READY })

        await user.click(screen.getByRole('checkbox', { name: /Ajustar el vencimiento manualmente/ }))
        expect(handlers.onManualDueChange).toHaveBeenCalledWith(true)
        expect(screen.queryByLabelText(/Vencimiento manual/)).not.toBeInTheDocument()
    })

    it('con el ajuste tildado, pide la fecha y muestra su error', () => {
        renderAside({ state: READY, manualDue: true, manualDueDateError: 'El vencimiento no puede ser anterior al acto.' })

        expect(screen.getByLabelText(/Vencimiento manual/)).toBeInTheDocument()
        expect(screen.getByText('El vencimiento no puede ser anterior al acto.')).toBeInTheDocument()
    })
})
