import type { ReactNode } from 'react';
import { Button, DataTable, Pill, type Column } from '@/shared/components/ui';
import type { LegalQualification } from '@/features/legal-params/types/legalQualification';
import { formatPrescription } from '@/features/legal-params/utils/prescription';

export interface LegalQualificationsTableProps {
    rows: LegalQualification[];
    /** Sin `onEdit` ni `onDelete`, la tabla no tiene columna de acciones. */
    onEdit?: (qualification: LegalQualification) => void;
    onDelete?: (qualification: LegalQualification) => void;
    empty?: ReactNode;
}

/**
 * Las calificaciones legales vigentes. Presentacional: el orden alfabético por
 * nombre lo resuelve el backend.
 *
 * Las columnas son las del prototipo. La prescripción va en dos renglones: el
 * plazo como lo lee el estudio y, abajo, los meses tal como se guardan, para
 * que no haya dudas con los plazos de medio año.
 *
 * "Modificar" y "Eliminar" aparecen sólo si la pantalla pasa su callback: la
 * consulta (sin modificar ni dar de baja) muestra la tabla sin acciones.
 */
export function LegalQualificationsTable({
    rows, onEdit, onDelete, empty,
}: LegalQualificationsTableProps) {
    const columns: Column<LegalQualification>[] = [
        {
            id: 'name',
            header: 'Calificación legal',
            primary: true,
            cell: (q) => <span className="vz-table__primary">{q.name}</span>,
        },
        {
            id: 'prescription',
            header: 'Prescripción',
            cell: (q) => (
                <>
                    <div>{formatPrescription(q.prescriptionMonths)}</div>
                    <div className="vz-table__secondary vz-mono">{q.prescriptionMonths} meses</div>
                </>
            ),
            nowrap: true,
        },
        {
            id: 'activeCases',
            header: 'En uso',
            cell: (q) => (
                <Pill tone={q.activeCases > 0 ? 'primary' : 'neutral'}>
                    {usageLabel(q.activeCases)}
                </Pill>
            ),
            nowrap: true,
        },
    ];

    if (onEdit || onDelete) {
        columns.push({
            id: 'actions',
            header: '',
            actions: true,
            cell: (q) => (
                <>
                    {onEdit && <Button variant="ghost" size="sm" onClick={() => onEdit(q)}>Modificar</Button>}
                    {onDelete && <Button variant="ghost-danger" size="sm" onClick={() => onDelete(q)}>Eliminar</Button>}
                </>
            ),
        });
    }

    return (
        <DataTable
            columns={columns}
            rows={rows}
            rowKey={(q) => String(q.id)}
            minWidth={760}
            empty={empty}
        />
    );
}

/** "Sin causas", "1 causa", "3 causas". */
function usageLabel(count: number): string {
    if (count === 0) return 'Sin causas';
    return count === 1 ? '1 causa' : `${count} causas`;
}
