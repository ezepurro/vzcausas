import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UsersTable } from '@/features/users/components/UsersTable'
import type { User } from '@/features/users/types/user'

const ADMIN_LAWYER: User = {
    id: 1,
    username: 'fvazquez',
    fullName: 'Fernando G. Vázquez',
    email: 'fvazquez@vazquezzarate.com',
    roles: ['ADMINISTRATOR', 'LAWYER'],
    lawyer: { id: 1, fullName: 'Dr. Fernando G. Vázquez', registrationNumber: '1-28114' },
    lastLoginAt: '2026-09-08T11:30:00-03:00',
    active: true,
}

const SECRETARY: User = {
    id: 20,
    username: 'cibarra',
    fullName: 'Camila Ibarra',
    email: 'cibarra@vazquezzarate.com',
    roles: ['SECRETARY'],
    lawyer: null,
    lastLoginAt: null,
    active: true,
}

function renderTable(rows: User[] = [ADMIN_LAWYER, SECRETARY]) {
    const handlers = { onEdit: vi.fn(), onDelete: vi.fn() }
    render(<UsersTable rows={rows} {...handlers} empty={<p>Sin usuarios</p>} />)
    return { ...handlers, user: userEvent.setup() }
}

function rowOf(username: string) {
    return screen.getByText(username).closest('tr') as HTMLElement
}

describe('UsersTable', () => {
    it('muestra las columnas del prototipo', () => {
        renderTable()

        const headers = screen.getAllByRole('columnheader').map((th) => th.textContent)
        expect(headers).toEqual(['Apellido y Nombre', 'Usuario', 'Perfil', 'Abogado vinculado', 'Último acceso', ''])
    })

    it('muestra el nombre con sus iniciales y el usuario', () => {
        renderTable()

        const row = rowOf('fvazquez')
        expect(within(row).getByText('Fernando G. Vázquez')).toBeInTheDocument()
        expect(within(row).getByText('FG')).toBeInTheDocument()
    })

    it('muestra TODOS los perfiles del usuario', () => {
        renderTable()

        const row = rowOf('fvazquez')
        expect(within(row).getByText('Administrador')).toBeInTheDocument()
        expect(within(row).getByText('Abogado')).toBeInTheDocument()
    })

    it('muestra la ficha vinculada, o una raya si no tiene', () => {
        renderTable()

        expect(within(rowOf('fvazquez')).getByText('Dr. Fernando G. Vázquez')).toBeInTheDocument()
        expect(within(rowOf('cibarra')).getAllByText('—')).toHaveLength(2) // sin ficha y sin acceso
    })

    it('muestra el último acceso como fecha', () => {
        renderTable()

        expect(within(rowOf('fvazquez')).getByText('08/09/2026')).toBeInTheDocument()
    })

    it('modificar y eliminar avisan con el usuario de esa fila', async () => {
        const { user, onEdit, onDelete } = renderTable()

        await user.click(within(rowOf('fvazquez')).getByRole('button', { name: 'Modificar' }))
        await user.click(within(rowOf('cibarra')).getByRole('button', { name: 'Eliminar' }))

        expect(onEdit).toHaveBeenCalledWith(ADMIN_LAWYER)
        expect(onDelete).toHaveBeenCalledWith(SECRETARY)
    })

    it('sin filas muestra el estado vacío', () => {
        renderTable([])

        expect(screen.getByText('Sin usuarios')).toBeInTheDocument()
    })
})
