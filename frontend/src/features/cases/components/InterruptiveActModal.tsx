import { FormModal, type FieldSpec } from '@/shared/components/forms'
import type { InterruptiveActFormValues } from '@/features/cases/types/interruptiveAct'
import type { InterruptiveActFormErrors } from '@/features/cases/schemas/interruptiveAct.schema'

export interface InterruptiveActModalProps {
    /** La carátula de la causa, debajo del título. */
    caption: string
    values: InterruptiveActFormValues
    errors: InterruptiveActFormErrors
    /** true mientras la mutación está en vuelo: bloquea el confirmar */
    saving: boolean
    onChange: (k: string, v: string | boolean) => void
    onConfirm: () => void
    onCancel: () => void
}

/**
 * "Registrar acto interruptivo" (HU31), con los textos del prototipo. No
 * valida ni guarda: recibe los errores ya calculados y avisa con `onConfirm`.
 */
export function InterruptiveActModal({
    caption, values, errors, saving, onChange, onConfirm, onCancel,
}: InterruptiveActModalProps) {
    const fields: FieldSpec[] = [
        {
            k: 'name',
            label: 'Acto interruptivo',
            required: true,
            placeholder: 'Ej. Citación a juicio, indagatoria, sentencia no firme',
            error: errors.name,
        },
        {
            k: 'actDate',
            label: 'Fecha del acto',
            type: 'date',
            width: 'half',
            required: true,
            mono: true,
            error: errors.actDate,
        },
        {
            k: 'notes',
            label: 'Observaciones',
            type: 'area',
            placeholder: 'Constancia, foja o referencia del expediente.',
            error: errors.notes,
        },
    ]

    return (
        <FormModal
            title="Registrar acto interruptivo"
            sub={caption}
            note="Un acto interruptivo reinicia el cómputo de la prescripción de la acción desde su fecha."
            fields={fields}
            values={values}
            onChange={onChange}
            okLabel="Registrar acto interruptivo"
            okDisabled={saving}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    )
}
