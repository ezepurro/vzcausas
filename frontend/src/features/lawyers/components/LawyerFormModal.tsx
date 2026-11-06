import { FormModal, type FieldSpec } from '@/shared/components/forms'
import type { LawyerFormValues } from '@/features/lawyers/types/lawyer'
import { LAWYER_MAX_LENGTH, type LawyerFormErrors } from '@/features/lawyers/schemas/lawyer.schema'

export interface LawyerFormModalProps {
    mode: 'create' | 'edit'
    /** Debajo del título. En la edición, quién es: "Peralta, Ignacio · matrícula 1-35207". */
    sub?: string
    values: LawyerFormValues
    errors: LawyerFormErrors
    /** true mientras la mutación está en vuelo: bloquea el confirmar */
    saving: boolean
    onChange: (k: string, v: string | boolean) => void
    onConfirm: () => void
    onCancel: () => void
}

/**
 * Alta y modificación de abogado (HU14) en el mismo modal, como
 * `UserFormModal`: los tres campos son los mismos.
 *
 * No valida ni guarda: recibe los errores ya calculados y avisa con
 * `onConfirm`. La decisión la toma quien lo abre.
 */
const CREATE_SUB = 'El abogado se debe vincular a un usuario para poder operar el sistema. La vinculación se realiza en la pantalla de usuarios a través del registro o la modificación de un usuario.'

export function LawyerFormModal({
    mode, sub, values, errors, saving, onChange, onConfirm, onCancel,
}: LawyerFormModalProps) {
    const creating = mode === 'create'

    const fields: FieldSpec[] = [
        /* Apellido y nombres por separado (V4, D-68), sin el tratamiento:
           "Dr." o "Dra." lo pone el front (D-81). */
        {
            k: 'lastName',
            label: 'Apellido',
            width: 'half',
            required: true,
            maxLength: LAWYER_MAX_LENGTH.lastName,
            error: errors.lastName,
        },
        {
            k: 'firstName',
            label: 'Nombres',
            width: 'half',
            required: true,
            note: 'Sin "Dr." ni "Dra.".',
            maxLength: LAWYER_MAX_LENGTH.firstName,
            error: errors.firstName,
        },
        {
            k: 'registrationNumber',
            label: 'Matrícula',
            width: 'half',
            mono: true,
            placeholder: '1-00000',
            note: 'Opcional.',
            maxLength: LAWYER_MAX_LENGTH.registrationNumber,
            error: errors.registrationNumber,
        },
    ]

    return (
        <FormModal
            title={creating ? 'Registrar abogado' : 'Modificar abogado'}
            sub={creating ? CREATE_SUB : sub}
            fields={fields}
            values={values}
            onChange={onChange}
            okLabel={creating ? 'Registrar abogado' : 'Guardar cambios'}
            okDisabled={saving}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    )
}
