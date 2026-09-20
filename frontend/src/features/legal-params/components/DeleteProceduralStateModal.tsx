import { FormModal } from '@/shared/components/forms';
import type { ProceduralState } from '@/features/legal-params/types/proceduralState';

export interface DeleteProceduralStateModalProps {
    state: ProceduralState;
    saving: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Confirmación de baja. Es un `FormModal` sin campos: el `shared/README` dice
 * que `tone="danger"` + sin `fields` es el modo "confirmar baja" del producto.
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
            sub={`${state.name} · fuero ${state.jurisdiction}`}
            tone="danger"
            width="sm"
            note="Las causas que hoy estén en este estado conservan el que tienen registrado, pero ninguna causa va a poder pasar a él. Si el estado tiene causas asociadas, el sistema no deja eliminarlo."
            values={{}}
            onChange={() => {}}
            okLabel="Eliminar"
            okDisabled={saving}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    );
}
