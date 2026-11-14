import type { ReactNode } from 'react'
import { Button, DataTable, Pill, type Column } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'
import { formatPersonName } from '@/shared/lib/personName'
import { useHoverIntent } from '@/shared/hooks/useHoverIntent'
import { JURISDICTION_LABELS } from '@/features/legal-params'
import type { Case } from '@/features/cases/types/case'
import { caseStateLabel } from '@/features/cases/utils/caseState'
import { deadlineStatus } from '@/features/cases/utils/deadlineStatus'
import { DEADLINE_KIND_LABELS, openDeadline } from '@/features/cases/utils/openDeadline'
import { sacLabel } from '@/features/cases/utils/sac'

export interface CasesTableProps {
    rows: Case[]
    /** "Ver detalle": la pantalla navega. */
    onOpen: (c: Case) => void
    /**
     * El usuario apunta a "Ver detalle": el mouse quedó encima un momento o
     * tomó el foco. La pantalla puede pedir la causa de antemano.
     */
    onIntent?: (c: Case) => void
    empty?: ReactNode
    /** Primera carga: la tabla dibuja su esqueleto. */
    loading?: boolean
    /** Trae otra página u otro filtro: la tabla se atenúa. */
    busy?: boolean
}

/**
 * Listado de causas (HU20). Presentacional: no ordena, no filtra, no pagina.
 * El orden por urgencia —plazos abiertos primero, vencidos arriba— lo resuelve
 * el backend (V3 D-25), contando también el plazo del acto lesivo de los
 * amparos (V4 D-82). Ese plazo se muestra en la misma columna, con la aclaración
 * "Plazo para el amparo".
 *
 * Las columnas son las del prototipo. Una causa recién registrada está en el
 * estado inicial, "Iniciada", y sin vencimiento (V3 D-34): la columna del plazo
 * muestra "Sin plazo abierto". Una causa sin SAC se muestra como "Sin SAC"
 * (D-33).
 */
export function CasesTable({ rows, onOpen, onIntent, empty, loading, busy }: CasesTableProps) {
    // Pasar el mouse por la columna no cuenta: sólo quedarse encima (`useHoverIntent`).
    const intent = useHoverIntent(onIntent)
    const columns: Column<Case>[] = [
        { id: 'sac', header: 'N° SAC', cell: (c) => sacLabel(c.sacNumber), mono: true, nowrap: true },
        {
            id: 'caption',
            header: 'Carátula',
            width: '36%',
            primary: true,
            cell: (c) => (
                <>
                    <div className="vz-table__primary" id={`case-row-${c.id}`}>{c.caption}</div>
                    {c.court && <div className="vz-table__secondary">{c.court}</div>}
                </>
            ),
        },
        {
            id: 'jurisdiction',
            header: 'Fuero',
            cell: (c) => JURISDICTION_LABELS[c.jurisdiction],
            nowrap: true,
            hideWhenNarrow: true,
        },
        {
            id: 'state',
            header: 'Estado procesal',
            /* El estado puede partir en dos renglones: en un renglón, un nombre
               largo ("Requerimiento de elevación a juicio") se llevaba 270px
               y dejaba a la carátula, que es lo que se lee, en 156 (H-32). */
            width: '15%',
            cell: (c) => (
                <span className="vz-cases__state">
                    <Pill>{caseStateLabel(c.currentState)}</Pill>
                </span>
            ),
        },
        {
            id: 'responsible',
            header: 'Responsable',
            cell: (c) => formatPersonName(c.responsibleLawyer),
            nowrap: true,
            hideWhenNarrow: true,
        },
        {
            id: 'deadline',
            header: 'Próximo vencimiento',
            cell: (c) => {
                const deadline = openDeadline(c)
                const status = deadlineStatus(deadline)
                return (
                    <>
                        <Pill tone={status.tone} dot={status.dot}>{status.label}</Pill>
                        {deadline.dueDate && (
                            <div className="vz-table__secondary vz-mono">
                                {formatDate(deadline.dueDate)}
                            </div>
                        )}
                        {deadline.kind === 'HARMFUL_ACT' && (
                            <div className="vz-table__secondary">{DEADLINE_KIND_LABELS.HARMFUL_ACT}</div>
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
                <Button variant="ghost" size="sm" aria-describedby={`case-row-${c.id}`} onClick={() => onOpen(c)} {...intent(c)}>
                    Ver detalle
                </Button>
            ),
        },
    ]

    return (
        <DataTable
            columns={columns}
            rows={rows}
            rowKey={(c) => String(c.id)}
            /* Entra sin scroll en una notebook de 1366px (1.045 de panel). */
            minWidth={1040}
            empty={empty}
            loading={loading}
            loadingLabel="Cargando causas…"
            busy={busy}
        />
    )
}
