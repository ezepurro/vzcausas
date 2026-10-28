import { FormModal, type FieldSpec } from '@/shared/components/forms'
import type { DeleteCaseFormErrors } from '@/features/cases/schemas/caseDeletion.schema'
import type { DeleteCaseFormValues } from '@/features/cases/types/caseDeletion'

export interface DeleteCaseModalProps {
    /** La carátula de la causa, bajo el título. */
    caption: string
    values: DeleteCaseFormValues
    errors: DeleteCaseFormErrors
    /** true mientras la baja está en vuelo: bloquea el confirmar. */
    saving: boolean
    onChange: (k: string, v: string | boolean) => void
    onConfirm: () => void
    onCancel: () => void
}

/**
 * El diálogo "Dar de baja la causa" (HU21), con los textos del prototipo.
 *
 * La baja es lógica (RN12) y la puede cualquier perfil. El motivo es opcional
 * (CA-21.2) y queda en la auditoría de la causa.
 *
 * No valida ni da de baja: recibe los errores ya calculados y avisa con
 * `onConfirm`.
 */
export function DeleteCaseModal({
    caption, values, errors, saving, onChange, onConfirm, onCancel,
}: DeleteCaseModalProps) {
    const fields: FieldSpec[] = [
        {
            k: 'reason',
            label: 'Motivo (opcional)',
            type: 'area',
            placeholder: 'Queda asentado en el historial de la causa.',
            error: errors.reason,
        },
    ]

    return (
        <FormModal
            title="Dar de baja la causa"
            sub={caption}
            tone="danger"
            note="La baja es lógica: la causa sale de los listados activos pero se conserva con todos sus actos y documentos."
            fields={fields}
            values={values}
            onChange={onChange}
            okLabel="Dar de baja"
            okDisabled={saving}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    )
}