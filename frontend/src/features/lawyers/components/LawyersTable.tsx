import type { ReactNode } from 'react'
import { Button, DataTable, Meter, type Column } from '@/shared/components/ui'
import { formatPersonName } from '@/shared/lib/personName'
import type { Lawyer } from '@/features/lawyers/types/lawyer'

export interface LawyersTableProps {
    rows: Lawyer[]
    /**
     * Contra qué se compara la carga de cada abogado: el máximo del estudio.
     * Si la pantalla no lo pasa, se toma el máximo de las filas, que con los
     * abogados del estudio en una sola página es lo mismo.
     */
    maxActiveCases?: number
    onEdit: (lawyer: Lawyer) => void
    /** Sólo el Administrador modifica abogados (CA-14.6): para el resto va deshabilitado. */
    canEdit: boolean
    empty?: ReactNode
    /** Primera carga: la tabla dibuja su esqueleto. */
    loading?: boolean
    /** Trae otra página u otro filtro: la tabla se atenúa. */
    busy?: boolean
}

/**
 * Tabla de abogados. Presentacional: no ordena, no filtra, no pagina.
 *
 * Las columnas son las del prototipo. "Causas activas" lleva la barra de carga
 * desde V3, que calcula `activeCases` de verdad: compara a cada abogado con el
 * más cargado del estudio, y el más cargado se pinta en bronce, como en el
 * prototipo. Mientras nadie tiene causas no se dibuja: una barra vacía en
 * todas las filas no dice nada.
 *
 * La columna de acciones tiene sólo "Modificar" (HU14). "Eliminar", que
 * muestra el prototipo, es HU15 y queda fuera del contrato: no se dibuja.
 */
export function LawyersTable({ rows, maxActiveCases, onEdit, canEdit, empty, loading, busy }: LawyersTableProps) {
    const max = maxActiveCases ?? Math.max(0, ...rows.map((l) => l.activeCases))

    const columns: Column<Lawyer>[] = [
        {
            id: 'name',
            header: 'Apellido y Nombre',
            width: '42%',
            primary: true,
            cell: (l) => <span className="vz-table__primary">{formatPersonName(l)}</span>,
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
            cell: (l) => (
                <div className="vz-load">
                    <span className="vz-load__count">{l.activeCases}</span>
                    {max > 0 && (
                        <div className="vz-load__bar">
                            <Meter
                                label={`Carga de ${formatPersonName(l)}`}
                                value={l.activeCases}
                                max={max}
                                valueText={`${l.activeCases} de ${max} causas`}
                                tone={l.activeCases >= max ? 'warn' : 'primary'}
                            />
                        </div>
                    )}
                </div>
            ),
            mono: true,
            width: '28%',
        },
        {
            id: 'actions',
            header: '',
            actions: true,
            cell: (l) => (
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canEdit}
                    title={canEdit ? undefined : 'Sólo el Administrador puede modificar abogados.'}
                    onClick={() => onEdit(l)}
                >
                    Modificar
                </Button>
            ),
        },
    ]

    return (
        <DataTable
            columns={columns}
            rows={rows}
            rowKey={(l) => String(l.id)}
            minWidth={720}
            empty={empty}
            loading={loading}
            loadingLabel="Cargando abogados…"
            busy={busy}
        />
    )
}
