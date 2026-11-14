/**
 * Las pestañas con teclado (H-41): el tabulador entra a la elegida y sale del
 * grupo; las flechas, Inicio y Fin cambian de pestaña. Declaran
 * `role="tablist"`, así que un lector de pantalla promete ese comportamiento.
 */

import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs } from '@/shared/components/ui'

type Board = 'mine' | 'studio' | 'team'

const TABS: { id: Board; label: string }[] = [
    { id: 'mine', label: 'Mi día' },
    { id: 'studio', label: 'Estudio' },
    { id: 'team', label: 'Equipo' },
]

function Harness({ initial = 'mine' as Board }) {
    const [active, setActive] = useState<Board>(initial)
    return (
        <>
            <Tabs tabs={TABS} active={active} onChange={setActive} aria-label="Tableros" panelId="panel" />
            <button type="button">Después</button>
        </>
    )
}

const tab = (name: string) => screen.getByRole('tab', { name })

describe('Tabs: teclado', () => {
    it('el tabulador entra a la pestaña elegida y sale del grupo', async () => {
        const user = userEvent.setup()
        render(<Harness initial="studio" />)

        await user.tab()
        expect(tab('Estudio')).toHaveFocus()

        await user.tab()
        expect(screen.getByRole('button', { name: 'Después' })).toHaveFocus()
    })

    it('las flechas cambian de pestaña y dan la vuelta en los bordes', async () => {
        const user = userEvent.setup()
        render(<Harness />)

        await user.tab()
        await user.keyboard('{ArrowRight}')
        expect(tab('Estudio')).toHaveFocus()
        expect(tab('Estudio')).toHaveAttribute('aria-selected', 'true')
        expect(tab('Mi día')).toHaveAttribute('aria-selected', 'false')

        await user.keyboard('{ArrowLeft}{ArrowLeft}')
        expect(tab('Equipo')).toHaveFocus()
        expect(tab('Equipo')).toHaveAttribute('aria-selected', 'true')

        await user.keyboard('{ArrowRight}')
        expect(tab('Mi día')).toHaveFocus()
    })

    it('Inicio y Fin van a la primera y a la última', async () => {
        const user = userEvent.setup()
        render(<Harness initial="studio" />)

        await user.tab()
        await user.keyboard('{End}')
        expect(tab('Equipo')).toHaveAttribute('aria-selected', 'true')

        await user.keyboard('{Home}')
        expect(tab('Mi día')).toHaveAttribute('aria-selected', 'true')
    })

    it('el grupo tiene nombre y cada pestaña apunta a su panel', () => {
        render(<Harness />)

        expect(screen.getByRole('tablist', { name: 'Tableros' })).toBeInTheDocument()
        expect(tab('Mi día')).toHaveAttribute('aria-controls', 'panel')
    })
})
