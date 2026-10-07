import type { ReactNode } from 'react'
import { Button, DataTable, Pill, type Column } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'
import { JURISDICTION_LABELS } from '@/features/legal-params'
import type { Case } from '@/features/cases/types/case'
import { caseStateLabel } from '@/features/cases/utils/caseState'
import { deadlineStatus } from '@/features/cases/utils/deadlineStatus'
import { sacLabel } from '@/features/cases/utils/sac'

export interface CasesTableProps {
    rows: Case[]
    /** "Ver detalle": la pantalla navega. */
    onOpen: (c: Case) => void
    empty?: ReactNode
}

/**
 * Listado de causas (HU20). Presentacional: no ordena, no filtra, no pagina.
 * El orden por urgencia —plazos abiertos primero, vencidos arriba— lo resuelve
 * el backend (V3 D-25).
 *
 * Las columnas son las del prototipo. Una causa recién registrada está en el
 * estado inicial, "Iniciada", y sin vencimiento (V3 D-34): la columna del plazo
 * muestra "Sin plazo abierto". Una causa sin SAC se muestra como "Sin SAC"
 * (D-33).
 */
export function CasesTable({ rows, onOpen, empty }: CasesTableProps) {
    const columns: Column<Case>[] = [
        { id: 'sac', header: 'N° SAC', cell: (c) => sacLabel(c.sacNumber), mono: true, nowrap: true },
        {
            id: 'caption',
            header: 'Carátula',
            width: '32%',
            cell: (c) => (
                <>
                    <div className="vz-table__primary">{c.caption}</div>
                    {c.court && <div className="vz-table__secondary">{c.court}</div>}
                </>
            ),
        },
        {
            id: 'jurisdiction',
            header: 'Fuero',
            cell: (c) => JURISDICTION_LABELS[c.jurisdiction],
            nowrap: true,
        },
        {
            id: 'state',
            header: 'Estado procesal',
            cell: (c) => <Pill>{caseStateLabel(c.currentState)}</Pill>,
            nowrap: true,
        },
        {
            id: 'responsible',
            header: 'Responsable',
            cell: (c) => c.responsibleLawyer.fullName,
            nowrap: true,
        },
        {
            id: 'deadline',
            header: 'Próximo vencimiento',
            cell: (c) => {
                const status = deadlineStatus(c.currentState)
                return (
                    <>
                        <Pill tone={status.tone} dot={status.dot}>{status.label}</Pill>
                        {c.currentState.dueDate && (
                            <div className="vz-table__secondary vz-mono">
                                {formatDate(c.currentState.dueDate)}
                            </div>
                        )}
                    </>
                )
            },
            nowrap: true,
        },
        {
            id: 'actions',
            header: '',
            actions: true,
            cell: (c) => (
                <Button variant="ghost" size="sm" onClick={() => onOpen(c)}>Ver detalle</Button>
            ),
        },
    ]

    return (
        <DataTable
            columns={columns}
            rows={rows}
            rowKey={(c) => String(c.id)}
            minWidth={1100}
            empty={empty}
        />
    )
}
