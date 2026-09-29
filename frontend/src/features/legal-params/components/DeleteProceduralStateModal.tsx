import { FormModal } from '@/shared/components/forms';
import {
    JURISDICTION_LABELS,
    type ProceduralState,
} from '@/features/legal-params/types/proceduralState';

export interface DeleteProceduralStateModalProps {
    state: ProceduralState;
    saving: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Confirmación de eliminación. Es un `FormModal` sin campos: el `shared/README`
 * dice que `tone="danger"` + sin `fields` es el modo "confirmar baja" del
 * producto.
 *
 * Del lado del servidor la baja es lógica, pero eso es asunto del backend: acá
 * el estado se elimina y no hay forma de traerlo de vuelta desde la pantalla.
 * El texto no promete lo contrario.
 *
 * `values` y `onChange` son obligatorios aunque no haya campos, así que van
 * vacíos.
 */
export function DeleteProceduralStateModal({
    state, saving, onConfirm, onCancel,
}: DeleteProceduralStateModalProps) {
    return (
        <FormModal
            title="Eliminar el estado"
            sub={`${state.name} · fuero ${JURISDICTION_LABELS[state.jurisdiction]}`}
            tone="danger"
            width="sm"
            note="Esta acción es irreversible. El estado se eliminará del fuero, conservándose únicamente como registro histórico en las causas que ya lo hayan transitado. No es posible eliminarlo si existen causas activas asociadas."
            values={{}}
            onChange={() => {}}
            okLabel="Eliminar"
            okDisabled={saving}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    );
}
