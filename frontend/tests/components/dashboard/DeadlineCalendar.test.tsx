import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { DeadlineCalendar } from '@/features/dashboard/components/DeadlineCalendar'
import type { DashboardDeadline } from '@/features/dashboard/types/dashboard'

/**
 * La lista del día del calendario (H-50 de `docs/auditoria-front`).
 *
 * El día entero (teléfono) y "+N más" (pantallas anchas) abren, debajo de la
 * grilla, los plazos de ese día como enlaces a su causa. En jsdom no hay CSS:
 * las dos formas de abrirla están a la vez, y acá se prueban las dos.
 *
 * Septiembre de 2026, con el 15 como hoy: tres plazos el martes 15 (no entran
 * en la celda) y uno el viernes 18.
 */

function deadline(caseId: number, caption: string, dueDate: string, businessDaysRemaining: number): DashboardDeadline {
    return {
        caseId,
        kind: 'PROCEDURAL_ACT',
        sacNumber: null,
        caption,
        jurisdiction: 'CRIMINAL',
        currentStateName: 'Ofrecimiento de prueba',
        responsibleLawyer: { id: 3, lastName: 'Ríos', firstName: 'Malena' },
        dueDate,
        businessDaysRemaining,
    }
}

const DEADLINES = [
    deadline(1, 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado', '2026-09-15', 0),
    deadline(6, 'MOYANO, Daniela c/ APROSS', '2026-09-15', 0),
    deadline(20, 'PAZ, Ezequiel c/ APROSS — Amparo', '2026-09-15', 0),
    deadline(17, 'LEIVA, Gustavo A. — Sumario administrativo', '2026-09-18', 3),
]

function renderCalendar() {
    const onOpen = vi.fn()
    const user = userEvent.setup()
    render(
        <MemoryRouter>
            <DeadlineCalendar today="2026-09-15" deadlines={DEADLINES} onOpen={onOpen} />
        </MemoryRouter>,
    )
    return { user, onOpen }
}

const dayButton = (name: string) => screen.getByRole('button', { name })
const dayList = () => screen.getByRole('region', { name: /^Martes 15 de septiembre · 3 plazos$/ })

describe('DeadlineCalendar · la lista del día (H-50)', () => {
    it('el día abre la lista con todos sus plazos, cada uno un enlace a su causa', async () => {
        const { user } = renderCalendar()
        const day = dayButton('Martes 15 de septiembre, 3 plazos')
        expect(day).toHaveAttribute('aria-expanded', 'false')

        await user.click(day)

        expect(day).toHaveAttribute('aria-expanded', 'true')
        const links = within(dayList()).getAllByRole('link')
        expect(links.map((link) => link.getAttribute('href'))).toEqual(['/causas/1', '/causas/6', '/causas/20'])
        // La carátula entera, que en la celda va recortada, y cuándo vence.
        expect(links[0]).toHaveTextContent('GÓMEZ, Ariel Fernando p.s.a. Robo calificado')
        expect(links[0]).toHaveTextContent('Ofrecimiento de prueba · Vence hoy')
    })

    it('al abrirse, el foco va al título de la lista', async () => {
        const { user } = renderCalendar()

        await user.click(dayButton('Martes 15 de septiembre, 3 plazos'))

        expect(screen.getByRole('heading', { name: 'Martes 15 de septiembre · 3 plazos' })).toHaveFocus()
    })

    it('"+N más" abre la misma lista: los plazos que no entraban en la celda se alcanzan', async () => {
        const { user } = renderCalendar()
        const more = dayButton('+1 más: ver los 3 plazos del martes 15 de septiembre')

        await user.click(more)

        expect(more).toHaveAttribute('aria-expanded', 'true')
        expect(within(dayList()).getByRole('link', { name: /PAZ, Ezequiel/ })).toHaveAttribute('href', '/causas/20')
    })

    it('Escape cierra la lista y devuelve el foco al botón que la abrió', async () => {
        const { user } = renderCalendar()
        const day = dayButton('Martes 15 de septiembre, 3 plazos')
        await user.click(day)

        await user.keyboard('{Escape}')

        expect(screen.queryByRole('region', { name: /3 plazos$/ })).not.toBeInTheDocument()
        expect(day).toHaveFocus()
        expect(day).toHaveAttribute('aria-expanded', 'false')
    })

    it('"Cerrar" y volver a tocar el día también la cierran', async () => {
        const { user } = renderCalendar()
        const day = dayButton('Martes 15 de septiembre, 3 plazos')

        await user.click(day)
        await user.click(within(dayList()).getByRole('button', { name: 'Cerrar' }))
        expect(screen.queryByRole('region', { name: /3 plazos$/ })).not.toBeInTheDocument()

        await user.click(day)
        await user.click(day)
        expect(screen.queryByRole('region', { name: /3 plazos$/ })).not.toBeInTheDocument()
    })

    it('elegir otro día cambia la lista, y cambiar de mes la cierra', async () => {
        const { user } = renderCalendar()
        await user.click(dayButton('Martes 15 de septiembre, 3 plazos'))

        await user.click(dayButton('Viernes 18 de septiembre, 1 plazo'))
        const list = screen.getByRole('region', { name: 'Viernes 18 de septiembre · 1 plazo' })
        expect(within(list).getAllByRole('link')).toHaveLength(1)

        await user.click(screen.getByRole('button', { name: 'Mes siguiente' }))
        expect(screen.queryByRole('region', { name: /plazos?$/ })).not.toBeInTheDocument()
    })

    it('un día sin plazos no es un botón, y uno que entra en la celda no lleva "+N más"', () => {
        renderCalendar()

        expect(screen.queryByRole('button', { name: /^Miércoles 16 de septiembre/ })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /más: ver .* viernes 18/ })).not.toBeInTheDocument()
    })

    it('la carátula de la celda sigue llevando a la causa', async () => {
        const { user, onOpen } = renderCalendar()

        await user.click(screen.getByRole('button', { name: 'MOYANO, Daniela' }))

        expect(onOpen).toHaveBeenCalledWith(6)
    })
})
