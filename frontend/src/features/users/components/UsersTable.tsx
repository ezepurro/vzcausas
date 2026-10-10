import type { ReactNode } from 'react'
import { Button, DataTable, Pill, type Column } from '@/shared/components/ui'
import { formatLastLogin } from '@/shared/lib/dates'
import type { User } from '@/features/users/types/user'
import { roleLabel, roleTone } from '@/features/users/utils/roles'

export interface UsersTableProps {
    rows: User[]
    onEdit: (user: User) => void
    onDelete: (user: User) => void
    empty?: ReactNode
}

/**
 * Tabla de usuarios. Presentacional: no ordena, no filtra, no pagina.
 *
 * Las columnas son las del prototipo. La de "Abogado vinculado" puede
 * mostrarse vacía sin que sea un error: secretaría no tiene ficha.
 */
export function UsersTable({ rows, onEdit, onDelete, empty }: UsersTableProps) {
    const columns: Column<User>[] = [
        {
            id: 'fullName',
            header: 'Apellido y Nombre',
            width: '24%',
            primary: true,
            cell: (u) => (
                <div className="vz-table__ident">
                    <span className="vz-avatar" aria-hidden="true">{initials(u.fullName)}</span>
                    <span className="vz-table__primary">{u.fullName}</span>
                </div>
            ),
        },
        { id: 'username', header: 'Usuario', cell: (u) => u.username, mono: true },
        {
            id: 'roles',
            header: 'Perfil',
            /* Se muestran TODOS. Un usuario puede tener más de un perfil, y
               esconder el segundo haría que la tabla mienta. */
            cell: (u) => (
                <div className="vz-pills">
                    {u.roles.map((role) => (
                        <Pill key={role} tone={roleTone(role)}>{roleLabel(role)}</Pill>
                    ))}
                </div>
            ),
        },
        {
            id: 'lawyer',
            header: 'Abogado vinculado',
            cell: (u) => u.lawyer?.fullName ?? '—',
        },
        {
            id: 'lastLoginAt',
            header: 'Último acceso',
            cell: (u) => formatLastLogin(u.lastLoginAt),
            mono: true,
            nowrap: true,
            hideWhenNarrow: true,
        },
        {
            id: 'actions',
            header: '',
            actions: true,
            cell: (u) => (
                <>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(u)}>Modificar</Button>
                    <Button variant="ghost-danger" size="sm" onClick={() => onDelete(u)}>Eliminar</Button>
                </>
            ),
        },
    ]

    return (
        <DataTable
            columns={columns}
            rows={rows}
            rowKey={(u) => String(u.id)}
            minWidth={1040}
            empty={empty}
        />
    )
}

/** Las dos primeras iniciales del nombre, para el avatar. */
function initials(fullName: string): string {
    return fullName
        .split(' ')
        .filter(Boolean)
        .map((word) => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
}
