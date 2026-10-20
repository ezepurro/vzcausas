import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { db } from '@/shared/mocks'
import { useAuth } from '@/app/providers/AuthContext'
import { HomePage } from '@/features/dashboard/pages/HomePage'

/**
 * Inicio cuando los roles cambian con la pantalla abierta (CA-41.7).
 *
 * La pestaña elegida no puede quedar apuntando a un tablero que el usuario ya
 * no tiene: la consulta de ese tablero queda deshabilitada y, en TanStack
 * Query v5, una consulta deshabilitada sin datos queda "pendiente" para
 * siempre. Se vería "Cargando el tablero…" sin fin.
 */

/** Lo que hace la aplicación cuando sabe que los roles cambiaron. */
function SyncButton() {
    const { syncSession } = useAuth()
    return (
        <button type="button" onClick={() => void syncSession()}>
            Sincronizar sesión
        </button>
    )
}

function renderPage() {
    return renderWithProviders(
        <>
            <HomePage />
            <SyncButton />
        </>,
        { as: 'fvazquez', path: '/inicio', route: '/inicio' },
    )
}

describe('HomePage · roles que cambian', () => {
    usePrototypeToday()

    it('si le sacan Administrador estando en "Estudio", muestra "Mi día"', async () => {
        const { user } = renderPage()
        await user.click(await screen.findByRole('tab', { name: 'Estudio' }))
        expect(await screen.findByText('Carga del equipo')).toBeInTheDocument()

        const stored = db.users.find((u) => u.username === 'fvazquez')
        if (!stored) throw new Error('Falta fvazquez en el mock.')
        stored.roles = ['LAWYER']
        await user.click(screen.getByRole('button', { name: 'Sincronizar sesión' }))

        expect(await screen.findByText('Mis plazos abiertos')).toBeInTheDocument()
        expect(screen.queryByRole('tab', { name: 'Estudio' })).not.toBeInTheDocument()
        expect(screen.queryByText('Cargando el tablero…')).not.toBeInTheDocument()
    })
})
