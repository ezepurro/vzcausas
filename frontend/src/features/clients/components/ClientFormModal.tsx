import { FormModal, type FieldSpec } from '@/shared/components/forms'
import type { ClientFormValues } from '@/features/clients/types/client'
import type { ClientFormErrors } from '@/features/clients/schemas/client.schema'

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
            k: 'dni',
            label: 'DNI',
            width: 'half',
            required: true,
            mono: true,
            placeholder: '00.000.000',
            note: 'Con o sin puntos.',
            error: errors.dni,
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
                    : 'Los datos de contacto se usan para los avisos de vencimiento.'
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
