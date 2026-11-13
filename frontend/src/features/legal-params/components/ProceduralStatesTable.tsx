import type { ReactNode } from 'react';
import { Button, DataTable, Pill, type Column } from '@/shared/components/ui';
import {
    DAY_TYPE_LABELS,
    type ProceduralState,
} from '@/features/legal-params/types/proceduralState';
import { dayTypeTone } from '@/features/legal-params/utils/dayTypeTone';
import { isPrescribedState } from '@/features/legal-params/utils/systemStates';

export interface ProceduralStatesTableProps {
    rows: ProceduralState[];
    onEdit: (state: ProceduralState) => void;
    onDelete: (state: ProceduralState) => void;
    empty?: ReactNode;
    /** Primera carga: la tabla dibuja su esqueleto. */
    loading?: boolean;
    /** Trae otra página u otro filtro: la tabla se atenúa. */
    busy?: boolean;
}

/**
 * Los estados procesales de un fuero, en el orden en que llegan del backend:
 * el de registro. No tienen posición ni número (V3 D-31).
 *
 * No hay columna de fuero: la lengüeta de arriba ya dice cuál es, y repetirlo
 * en cada fila es ruido.
 *
 * "Causas" cuenta todas las causas que están en el estado, activas o no
 * (V4 D-70): por eso los terminales también muestran las suyas.
 *
 * "Prescripta" es un estado de sistema (V4 D-53): se lista, pero no se
 * modifica ni se elimina, así que su fila no lleva acciones.
 */
export function ProceduralStatesTable({
    rows, onEdit, onDelete, empty, loading, busy,
}: ProceduralStatesTableProps) {
    const columns: Column<ProceduralState>[] = [
        { id: 'name', header: 'Estado procesal', cell: (r) => <span id={`state-row-${r.id}`}>{r.name}</span>, primary: true },
        {
            id: 'limit',
            header: 'Días',
            // Un 0 en la columna se lee como "cero días de plazo"; lo que pasa
            // es que no abre plazo, y eso lo dice mejor la raya.
            cell: (r) => (r.timeLimitDays === 0 ? '—' : r.timeLimitDays),
            mono: true,
            nowrap: true,
        },
        {
            id: 'dayType',
            header: 'Tipo de día',
            cell: (r) => <Pill tone={dayTypeTone(r.dayType)}>{DAY_TYPE_LABELS[r.dayType]}</Pill>,
            nowrap: true,
        },
        {
            id: 'terminal',
            header: 'Cierre',
            cell: (r) => (r.terminal ? <Pill tone="danger">Cierra la causa</Pill> : null),
            nowrap: true,
        },
        {
            id: 'caseCount',
            header: 'Causas',
            cell: (r) => r.caseCount,
            mono: true,
            nowrap: true,
        },
        {
            id: 'actions',
            header: '',
            actions: true,
            // Las dos quedan calladas hasta que el cursor entra en la fila; la
            // destructiva se tiñe recién cuando se la apunta, así no grita en
            // cada renglón pero tampoco se confunde con la otra.
            cell: (r) =>
                isPrescribedState(r) ? (
                    <Pill>Estado del sistema</Pill>
                ) : (
                    <>
                        <Button variant="ghost" size="sm" aria-describedby={`state-row-${r.id}`} onClick={() => onEdit(r)}>Modificar</Button>
                        <Button variant="ghost-danger" size="sm" aria-describedby={`state-row-${r.id}`} onClick={() => onDelete(r)}>Eliminar</Button>
                    </>
                ),
        },
    ];

    return (
        <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => String(r.id)}
            minWidth={820}
            empty={empty}
            loading={loading}
            loadingLabel="Cargando estados…"
            busy={busy}
        />
    );
}
