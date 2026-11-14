import { FormModal, type FieldSpec } from '@/shared/components/forms'
import {
    PROCEDURAL_ACT_ANNULMENT_MAX_LENGTH,
    type AnnulProceduralActFormErrors,
} from '@/features/cases/schemas/proceduralActAnnulment.schema'
import type { AnnulProceduralActFormValues } from '@/features/cases/types/proceduralActAnnulment'

export interface AnnulProceduralActModalProps {
    /** El acto, bajo el título: "Oposición al requerimiento de elevación · 09/09/2026". */
    actLabel: string
    values: AnnulProceduralActFormValues
    errors: AnnulProceduralActFormErrors
    /** true mientras la anulación está en vuelo: bloquea el confirmar. */
    saving: boolean
    onChange: (k: string, v: string | boolean) => void
    onConfirm: () => void
    onCancel: () => void
}

/**
 * El diálogo "Anular acto procesal" (HU29), con el título, el campo y el
 * botón del prototipo.
 *
 * La nota y el texto de ayuda del motivo no son los del prototipo: dicen que
 * el acto "queda asentado como anulado en el ciclo de vida", y manda D-124:
 * el acto deja de mostrarse y la causa se recalcula (`cases/CAMBIOS.md`).
 *
 * No valida ni anula: recibe los errores ya calculados y avisa con
 * `onConfirm`.
 */
export function AnnulProceduralActModal({
    actLabel, values, errors, saving, onChange, onConfirm, onCancel,
}: AnnulProceduralActModalProps) {
    const fields: FieldSpec[] = [
        {
            k: 'reason',
            label: 'Motivo de la anulación (opcional)',
            type: 'area',
            placeholder: 'Queda asentado en el historial de la causa.',
            maxLength: PROCEDURAL_ACT_ANNULMENT_MAX_LENGTH.reason,
            error: errors.reason,
        },
    ]

    return (
        <FormModal
            title="Anular acto procesal"
            sub={actLabel}
            tone="danger"
            width="sm"
            note="La baja es lógica: el acto deja de mostrarse en el ciclo de vida y el estado de la causa se recalcula con el acto anterior."
            fields={fields}
            values={values}
            onChange={onChange}
            okLabel="Anular acto"
            okDisabled={saving}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    )
}
