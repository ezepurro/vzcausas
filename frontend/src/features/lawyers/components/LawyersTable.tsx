import type { ReactNode } from 'react'
import { DataTable, type Column } from '@/shared/components/ui'
import type { Lawyer } from '@/features/lawyers/types/lawyer'

export interface LawyersTableProps {
    rows: Lawyer[]
    empty?: ReactNode
}

/**
 * Tabla de abogados. Presentacional: no ordena, no filtra, no pagina.
 *
 * Las columnas son las del prototipo. La barra de carga de "Causas activas"
 * no va todavía: el backend devuelve siempre `0` hasta que exista el módulo
 * de causas, y una barra vacía en todas las filas no dice nada.
 *
 * Sin columna de acciones: modificar y dar de baja todavía no están en alcance.
 */
export function LawyersTable({ rows, empty }: LawyersTableProps) {
    const columns: Column<Lawyer>[] = [
        {
            id: 'fullName',
            header: 'Abogado',
            width: '42%',
            cell: (l) => <span className="vz-table__primary">{l.fullName}</span>,
        },
        {
            id: 'registrationNumber',
            header: 'Matrícula',
            cell: (l) => l.registrationNumber,
            mono: true,
            nowrap: true,
        },
        {
            id: 'activeCases',
            header: 'Causas activas',
            cell: (l) => l.activeCases,
            mono: true,
        },
    ]

    return (
        <DataTable
            columns={columns}
            rows={rows}
            rowKey={(l) => String(l.id)}
            minWidth={720}
            empty={empty}
        />
    )
}
