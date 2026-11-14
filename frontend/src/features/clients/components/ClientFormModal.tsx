import { FormModal, type FieldSpec } from '@/shared/components/forms'
import { DOCUMENT_TYPES, type ClientFormValues } from '@/features/clients/types/client'
import { CLIENT_MAX_LENGTH, type ClientFormErrors } from '@/features/clients/schemas/client.schema'
import { DOCUMENT_TYPE_LABELS } from '@/features/clients/utils/clientFormat'

/* El código viaja y el rótulo se lee: `PASSPORT` se elige como "Pasaporte". */
const DOCUMENT_TYPE_OPTIONS = DOCUMENT_TYPES.map((value) => ({ value, label: DOCUMENT_TYPE_LABELS[value] }))

export interface ClientFormModalProps {
    /**
     * `create` (por defecto) registra; `edit` modifica (HU10). Los campos son
     * los mismos: cambian el título, el texto de abajo y el botón.
     */
    mode?: 'create' | 'edit'
    /**
     * Debajo del título, en la edición: quién es, como en el prototipo.
     * "GÓMEZ, Ariel Fernando · DNI 34.812.905". En el alta no se usa.
     */
    sub?: string
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
 * Alta y modificación de cliente en el mismo modal, como `LawyerFormModal`.
 * No valida ni guarda: recibe los errores ya calculados y avisa con
 * `onConfirm`. La decisión la toma quien lo abre, que puede ser la pantalla
 * Clientes o el alta de causa.
 *
 * En la edición el documento se puede cambiar (D-121, CA-10.3): el tipo y el
 * número quedan habilitados, como en el alta.
 */
export function ClientFormModal({
    mode = 'create', sub, values, errors, fromCase = false, saving, onChange, onConfirm, onCancel,
}: ClientFormModalProps) {
    const creating = mode === 'create'

    const fields: FieldSpec[] = [
        {
            k: 'lastName',
            label: 'Apellido',
            width: 'half',
            required: true,
            placeholder: 'GÓMEZ',
            maxLength: CLIENT_MAX_LENGTH.lastName,
            error: errors.lastName,
        },
        {
            k: 'firstName',
            label: 'Nombres',
            width: 'half',
            required: true,
            placeholder: 'Ariel Fernando',
            maxLength: CLIENT_MAX_LENGTH.firstName,
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
        /* El placeholder y el tope siguen al tipo elegido: 8 dígitos sin
           puntos para el DNI, hasta 20 letras y números para el pasaporte. */
        values.documentType === 'PASSPORT'
            ? {
                k: 'documentNumber',
                label: 'Número de documento',
                width: 'half',
                required: true,
                mono: true,
                placeholder: 'AAA000000',
                maxLength: CLIENT_MAX_LENGTH.passport,
                error: errors.documentNumber,
            }
            : {
                k: 'documentNumber',
                label: 'Número de documento',
                width: 'half',
                required: true,
                mono: true,
                placeholder: '00000000',
                note: 'Sin puntos.',
                maxLength: CLIENT_MAX_LENGTH.dni,
                error: errors.documentNumber,
            },
        {
            k: 'address',
            label: 'Dirección',
            width: 'full',
            required: true,
            placeholder: 'Calle, número, localidad',
            maxLength: CLIENT_MAX_LENGTH.address,
            error: errors.address,
        },
        {
            k: 'phone',
            label: 'Teléfono',
            width: 'half',
            required: true,
            mono: true,
            placeholder: '351 000-0000',
            maxLength: CLIENT_MAX_LENGTH.phone,
            error: errors.phone,
        },
        {
            k: 'email',
            label: 'Correo electrónico',
            type: 'email',
            width: 'half',
            placeholder: 'nombre@correo.com',
            error: errors.email,
        },
    ]

    return (
        <FormModal
            title={creating ? 'Registrar cliente' : 'Modificar cliente'}
            sub={creating ? createSub(fromCase) : sub}
            fields={fields}
            values={values}
            onChange={onChange}
            okLabel={creating ? 'Registrar cliente' : 'Guardar cambios'}
            okDisabled={saving}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    )
}

/** El texto de abajo del título en el alta: depende de dónde se abre. */
function createSub(fromCase: boolean): string {
    return fromCase
        ? 'Al confirmar, el cliente queda seleccionado en la causa.'
        : 'Después lo vas a poder elegir al registrar sus causas. El correo es opcional.'
}