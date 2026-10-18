import { FormModal, type FieldSpec } from '@/shared/components/forms'
import type { LawyerFormValues } from '@/features/lawyers/types/lawyer'
import type { LawyerFormErrors } from '@/features/lawyers/schemas/lawyer.schema'

export interface LawyerFormModalProps {
    values: LawyerFormValues
    errors: LawyerFormErrors
    /** true mientras la mutación está en vuelo: bloquea el confirmar */
    saving: boolean
    onChange: (k: string, v: string | boolean) => void
    onConfirm: () => void
    onCancel: () => void
}

/**
 * Alta de abogado. Por ahora sólo alta: cuando entre la modificación se le
 * agrega `mode`, como en `UserFormModal`.
 *
 * No valida ni guarda: recibe los errores ya calculados y avisa con
 * `onConfirm`. La decisión la toma quien lo abre.
 */
export function LawyerFormModal({
    values, errors, saving, onChange, onConfirm, onCancel,
}: LawyerFormModalProps) {
    const fields: FieldSpec[] = [
        /* Apellido y nombres por separado (V4, D-68), sin el tratamiento:
           "Dr." o "Dra." lo pone el front (D-81). */
        {
            k: 'lastName',
            label: 'Apellido',
            width: 'half',
            required: true,
            error: errors.lastName,
        },
        {
            k: 'firstName',
            label: 'Nombres',
            width: 'half',
            required: true,
            note: 'Sin "Dr." ni "Dra.".',
            error: errors.firstName,
        },
        {
            k: 'registrationNumber',
            label: 'Matrícula',
            width: 'half',
            required: true,
            mono: true,
            placeholder: '1-00000',
            error: errors.registrationNumber,
        },
    ]

    return (
        <FormModal
            title="Registrar abogado"
            sub="El abogado se debe vincular a un usuario para poder operar el sistema. La vinculación se realiza en la pantalla de usuarios a través del registro o la modificación de un usuario."
            fields={fields}
            values={values}
            onChange={onChange}
            okLabel="Registrar abogado"
            okDisabled={saving}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    )
}
