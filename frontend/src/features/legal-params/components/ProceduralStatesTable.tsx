import type { ReactNode } from 'react';
import { Button, DataTable, Pill, type Column } from '@/shared/components/ui';
import type { ProceduralState } from '@/features/legal-params/types/proceduralState';
import { dayTypeTone } from '@/features/legal-params/utils/dayTypeTone';

export interface ProceduralStatesTableProps {
    rows: ProceduralState[];
    /**
     * Número que le toca a la primera fila de esta página. La numeración es
     * puramente visual: el contrato no guarda ningún orden, así que el "1" de
     * la página 2 tiene que ser el 21.
     */
    firstRowNumber: number;
    onEdit: (state: ProceduralState) => void;
    onDelete: (state: ProceduralState) => void;
    empty?: ReactNode;
}

/** Fila con el número visual ya calculado: `Column.cell` no recibe el índice. */
type Row = ProceduralState & { n: number };

export function ProceduralStatesTable({
    rows, firstRowNumber, onEdit, onDelete, empty,
}: ProceduralStatesTableProps) {
    const numbered: Row[] = rows.map((state, i) => ({ ...state, n: firstRowNumber + i }));

    const columns: Column<Row>[] = [
        { id: 'n', header: '#', cell: (r) => r.n, mono: true, width: '1%', nowrap: true },
        { id: 'name', header: 'Estado procesal', cell: (r) => r.name },
        { id: 'jurisdiction', header: 'Fuero', cell: (r) => r.jurisdiction, nowrap: true },
        {
            id: 'limit',
            header: 'Días',
            cell: (r) => r.proceduralTimeLimit,
            mono: true,
            nowrap: true,
        },
        {
            id: 'dayType',
            header: 'Tipo de día',
            cell: (r) => <Pill tone={dayTypeTone(r.dayType)}>{r.dayType}</Pill>,
            nowrap: true,
        },
        {
            id: 'actions',
            header: '',
            actions: true,
            cell: (r) => (
                <>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(r)}>Modificar</Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(r)}>Eliminar</Button>
                </>
            ),
        },
    ];

    return (
        <DataTable
            columns={columns}
            rows={numbered}
            rowKey={(r) => String(r.id)}
            minWidth={820}
            empty={empty}
        />
    );
}
