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
        {
            k: 'fullName',
            label: 'Apellido y Nombre',
            width: 'half',
            required: true,
            placeholder: 'Dr. / Dra. Apellido Nombre',
            error: errors.fullName,
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
