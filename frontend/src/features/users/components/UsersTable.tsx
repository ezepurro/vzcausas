import type { ReactNode } from 'react'
import { Button, DataTable, Pill, type Column } from '@/shared/components/ui'
import { formatLastLogin } from '@/shared/lib/dates'
import { initials } from '@/shared/lib/initials'
import { formatPersonName } from '@/shared/lib/personName'
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
            id: 'name',
            header: 'Apellido y Nombre',
            width: '24%',
            primary: true,
            cell: (u) => (
                <div className="vz-table__ident">
                    <span className="vz-avatar" aria-hidden="true">{initials(formatPersonName(u))}</span>
                    <span className="vz-table__primary">{formatPersonName(u)}</span>
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
            cell: (u) => (u.lawyer ? formatPersonName(u.lawyer) : '—'),
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

