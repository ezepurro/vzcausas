import type { ReactNode } from 'react'
import { Avatar, Button, DataTable, Pill, type Column } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'
import type { Client } from '@/features/clients/types/client'
import { formatClientName, formatDocument } from '@/features/clients/utils/clientFormat'

export interface ClientsTableProps {
    rows: Client[]
    /** "Modificar" de la fila (HU10). */
    onEdit: (client: Client) => void
    /** "Eliminar" de la fila (HU11). */
    onDelete: (client: Client) => void
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
 * Las acciones de cada fila son las del prototipo, "Modificar" y "Eliminar",
 * habilitadas para los tres perfiles (CA-10.6, CA-11.6, D-39): no consultan
 * `ACTION_ACCESS`.
 */
export function ClientsTable({ rows, onEdit, onDelete, empty, loading, busy }: ClientsTableProps) {
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
                            <div className="vz-table__primary" id={`client-row-${c.id}`}>{name}</div>
                            <div className="vz-table__secondary">desde {formatDate(c.clientSince)}</div>
                        </div>
                    </div>
                )
            },
        },
        { id: 'document', header: 'Documento', cell: (c) => formatDocument(c), mono: true, nowrap: true },
        { id: 'phone', header: 'Teléfono', cell: (c) => c.phone, mono: true, nowrap: true },
        // Opcional: sin dato va la raya, igual que en el resto de las tablas.
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
        {
            id: 'actions',
            header: '',
            actions: true,
            cell: (c) => (
                /* Los botones se llaman igual en todas las filas: cada uno apunta
                   con `aria-describedby` al nombre de su fila, así un lector de
                   pantalla dice de quién es (H-40), como en `UsersTable`. */
                <>
                    <Button variant="ghost" size="sm" aria-describedby={`client-row-${c.id}`} onClick={() => onEdit(c)}>
                        Modificar
                    </Button>
                    <Button variant="ghost-danger" size="sm" aria-describedby={`client-row-${c.id}`} onClick={() => onDelete(c)}>
                        Eliminar
                    </Button>
                </>
            ),
        },
    ]

    return (
        <DataTable
            columns={columns}
            rows={rows}
            rowKey={(c) => String(c.id)}
            minWidth={960}
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