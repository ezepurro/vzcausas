import type { ReactNode } from 'react'
import { Avatar, DataTable, Pill, type Column } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'
import type { Client } from '@/features/clients/types/client'
import { formatClientName, formatDni } from '@/features/clients/utils/clientFormat'

export interface ClientsTableProps {
    rows: Client[]
    empty?: ReactNode
    /** Primera carga: la tabla dibuja su esqueleto. */
    loading?: boolean
    /** Trae otra página u otro filtro: la tabla se atenúa. */
    busy?: boolean
}

/**
 * Tabla de clientes. Presentacional: no ordena, no filtra, no pagina. El
 * orden alfabético por apellido lo resuelve el backend.
 *
 */
export function ClientsTable({ rows, empty, loading, busy }: ClientsTableProps) {
    const columns: Column<Client>[] = [
        {
            id: 'name',
            header: 'Cliente',
            width: '30%',
            primary: true,
            cell: (c) => {
                const name = formatClientName(c)
                return (
                    <div className="vz-table__ident">
                        <Avatar name={name} />
                        <div>
                            <div className="vz-table__primary">{name}</div>
                            <div className="vz-table__secondary">desde {formatDate(c.clientSince)}</div>
                        </div>
                    </div>
                )
            },
        },
        { id: 'dni', header: 'DNI', cell: (c) => formatDni(c.dni), mono: true, nowrap: true },
        // Opcionales: sin dato va la raya, igual que en el resto de las tablas.
        { id: 'phone', header: 'Teléfono', cell: (c) => c.phone ?? '—', mono: true, nowrap: true },
        { id: 'email', header: 'Correo electrónico', cell: (c) => c.email ?? '—' },
        {
            id: 'activeCases',
            header: 'Causas',
            cell: (c) => (
                <Pill tone={c.activeCases > 0 ? 'primary' : 'neutral'}>
                    {activeCasesLabel(c.activeCases)}
                </Pill>
            ),
            nowrap: true,
        },
    ]

    return (
        <DataTable
            columns={columns}
            rows={rows}
            rowKey={(c) => String(c.id)}
            minWidth={880}
            empty={empty}
            loading={loading}
            loadingLabel="Cargando clientes…"
            busy={busy}
        />
    )
}

/** "Sin causas", "1 causa", "3 causas": el plural no sale de agregar una `s`. */
function activeCasesLabel(count: number): string {
    if (count === 0) return 'Sin causas'
    return count === 1 ? '1 causa' : `${count} causas`
}
