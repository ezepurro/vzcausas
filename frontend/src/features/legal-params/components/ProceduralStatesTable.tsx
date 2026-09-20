import type { ReactNode } from 'react';
import { Button, DataTable, Pill, type Column } from '@/shared/components/ui';
import {
    DAY_TYPE_LABELS,
    type ProceduralState,
} from '@/features/legal-params/types/proceduralState';
import { dayTypeTone } from '@/features/legal-params/utils/dayTypeTone';

export interface ProceduralStatesTableProps {
    rows: ProceduralState[];
    onEdit: (state: ProceduralState) => void;
    onDelete: (state: ProceduralState) => void;
    empty?: ReactNode;
}

/**
 * El ciclo de vida del fuero, en orden.
 *
 * No hay columna de fuero: la lengüeta de arriba ya dice cuál es, y repetirlo
 * en cada fila es ruido.
 */
export function ProceduralStatesTable({
    rows, onEdit, onDelete, empty,
}: ProceduralStatesTableProps) {
    const columns: Column<ProceduralState>[] = [
        {
            id: 'position',
            header: '#',
            // La posición real del contrato, no un número de fila: es el lugar
            // que ocupa el estado en el ciclo y por eso se puede cambiar.
            cell: (r) => r.position,
            mono: true,
            width: '1%',
            nowrap: true,
        },
        { id: 'name', header: 'Estado procesal', cell: (r) => r.name },
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
            id: 'activeCases',
            header: 'Causas',
            cell: (r) => r.activeCases,
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
            cell: (r) => (
                <>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(r)}>Modificar</Button>
                    <Button variant="ghost-danger" size="sm" onClick={() => onDelete(r)}>Eliminar</Button>
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
        />
    );
}
