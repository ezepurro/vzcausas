import { FormModal, type FieldSpec } from '@/shared/components/forms'
import { DOCUMENT_TYPES, type ClientFormValues } from '@/features/clients/types/client'
import type { ClientFormErrors } from '@/features/clients/schemas/client.schema'
import { DOCUMENT_TYPE_LABELS } from '@/features/clients/utils/clientFormat'

/* El código viaja y el rótulo se lee: `PASSPORT` se elige como "Pasaporte". */
const DOCUMENT_TYPE_OPTIONS = DOCUMENT_TYPES.map((value) => ({ value, label: DOCUMENT_TYPE_LABELS[value] }))

export interface ClientFormModalProps {
    values: ClientFormValues
    errors: ClientFormErrors
    /**
     * `true` si se abre desde "Registrar cliente nuevo" del alta de causa: el
     * texto avisa que el cliente queda elegido en la causa al confirmar.
     */
    fromCase?: boolean
    /** true mientras la mutación está en vuelo: bloquea el confirmar */
    saving: boolean
    onChange: (k: string, v: string | boolean) => void
    onConfirm: () => void
    onCancel: () => void
}

/**
 * Alta de cliente 
 * No valida ni guarda: recibe los errores ya calculados y avisa con
 * `onConfirm`. La decisión la toma quien lo abre, que puede ser la pantalla
 * Clientes o el alta de causa.
 */
export function ClientFormModal({
    values, errors, fromCase = false, saving, onChange, onConfirm, onCancel,
}: ClientFormModalProps) {
    const fields: FieldSpec[] = [
        {
            k: 'lastName',
            label: 'Apellido',
            width: 'half',
            required: true,
            placeholder: 'GÓMEZ',
            error: errors.lastName,
        },
        {
            k: 'firstName',
            label: 'Nombres',
            width: 'half',
            required: true,
            placeholder: 'Ariel Fernando',
            error: errors.firstName,
        },
        {
            k: 'documentType',
            label: 'Tipo de documento',
            type: 'select',
            width: 'half',
            required: true,
            options: DOCUMENT_TYPE_OPTIONS,
            error: errors.documentType,
        },
        /* El placeholder y la nota siguen al tipo elegido: los puntos son
           sólo del DNI. */
        values.documentType === 'PASSPORT'
            ? {
                k: 'documentNumber',
                label: 'Número de documento',
                width: 'half',
                required: true,
                mono: true,
                placeholder: 'AAA000000',
                error: errors.documentNumber,
            }
            : {
                k: 'documentNumber',
                label: 'Número de documento',
                width: 'half',
                required: true,
                mono: true,
                placeholder: '00.000.000',
                note: 'Con o sin puntos.',
                error: errors.documentNumber,
            },
        {
            k: 'address',
            label: 'Dirección',
            width: 'full',
            placeholder: 'Calle, número, localidad',
            error: errors.address,
        },
        {
            k: 'phone',
            label: 'Teléfono',
            width: 'half',
            mono: true,
            placeholder: '351 000-0000',
            error: errors.phone,
        },
        {
            k: 'email',
            label: 'Correo electrónico',
            width: 'half',
            placeholder: 'nombre@correo.com',
            error: errors.email,
        },
    ]

    return (
        <FormModal
            title="Registrar cliente"
            sub={
                fromCase
                    ? 'Al confirmar, el cliente queda seleccionado en la causa.'
                    : 'Después lo vas a poder elegir al registrar sus causas. La dirección, el teléfono y el correo son opcionales.'
            }
            fields={fields}
            values={values}
            onChange={onChange}
            okLabel="Registrar cliente"
            okDisabled={saving}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    )
}
