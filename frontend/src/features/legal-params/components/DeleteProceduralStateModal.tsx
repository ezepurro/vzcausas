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
 * La baja procede aunque haya causas en el estado (V3 D-06): esas causas lo
 * conservan y lo siguen mostrando hasta que un acto las lleve a otro. El texto
 * lo dice, como el prototipo, para que quien elimina sepa qué pasa con ellas.
 *
 * `values` y `onChange` son obligatorios aunque no haya campos, así que van
 * vacíos.
 */
export function DeleteProceduralStateModal({
    state, saving, onConfirm, onCancel,
}: DeleteProceduralStateModalProps) {
    // Cuenta todas las causas del estado, activas o no (V4 D-70).
    const inUse = state.caseCount > 0;

    return (
        <FormModal
            title="Eliminar el estado"
            sub={`${state.name} · fuero ${JURISDICTION_LABELS[state.jurisdiction]}`}
            tone="danger"
            width="sm"
            note={
                inUse
                    ? `Hay ${state.caseCount === 1 ? '1 causa' : `${state.caseCount} causas`} en este estado. Al eliminarlo dejan de poder avanzar a él, pero conservan el estado que ya tienen registrado.`
                    : 'Este estado no tiene causas asociadas.'
            }
            values={{}}
            onChange={() => {}}
            okLabel="Eliminar"
            okDisabled={saving}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    );
}
