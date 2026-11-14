import type { ReactNode } from 'react'
import { FormModal, type FieldSpec } from '@/shared/components/forms'
import { CLIENT_DELETION_MAX_LENGTH, type DeleteClientFormErrors } from '@/features/clients/schemas/clientDeletion.schema'
import type { DeleteClientFormValues } from '@/features/clients/types/clientDeletion'

/** Lo que muestra el diálogo cuando el backend no deja dar de baja al cliente. */
export interface DeleteClientBlocked {
    /** El mensaje del `409 CLIENT_HAS_ACTIVE_CASES`, tal como lo manda el backend. */
    message: string
    /** La lista de sus causas activas: la arma `cases` (`ClientActiveCases`). */
    activeCases: ReactNode
}

export interface DeleteClientModalProps {
    /** El nombre del cliente, bajo el título: "JUÁREZ, Mónica E.". */
    clientName: string
    values: DeleteClientFormValues
    errors: DeleteClientFormErrors
    /** `null` hasta que el backend responda `409`: ahí el diálogo dice por qué y no deja confirmar. */
    blocked: DeleteClientBlocked | null
    /** true mientras la baja está en vuelo: bloquea el confirmar. */
    saving: boolean
    onChange: (k: string, v: string | boolean) => void
    onConfirm: () => void
    onCancel: () => void
}

/**
 * El diálogo "Eliminar cliente" (HU11), con los textos del prototipo.
 *
 * La baja es lógica (RN12) y la puede cualquier perfil. El motivo es opcional
 * (CA-11.7) y queda en la auditoría.
 *
 * Con causas activas no procede (D-122): el prototipo deja eliminar y sólo
 * avisa cuántas tiene, pero manda el contrato. Cuando el backend responde
 * `409`, el diálogo muestra su mensaje y la lista de causas activas
 * (CA-11.2), y "Eliminar" queda deshabilitado: volver a intentarlo daría lo
 * mismo.
 *
 * No valida ni da de baja: recibe los errores ya calculados y avisa con
 * `onConfirm`.
 */
export function DeleteClientModal({
    clientName, values, errors, blocked, saving, onChange, onConfirm, onCancel,
}: DeleteClientModalProps) {
    const fields: FieldSpec[] = [
        {
            k: 'reason',
            label: 'Motivo (opcional)',
            type: 'area',
            placeholder: 'Queda asentado en el historial.',
            maxLength: CLIENT_DELETION_MAX_LENGTH.reason,
            error: errors.reason,
        },
    ]

    return (
        <FormModal
            title="Eliminar cliente"
            sub={clientName}
            tone="danger"
            width="sm"
            /* `alert`: el aviso llega después de confirmar, y un lector de
               pantalla lo tiene que leer sin que el foco vaya a buscarlo. */
            note={blocked && <span role="alert">{blocked.message}</span>}
            fields={fields}
            values={values}
            onChange={onChange}
            okLabel="Eliminar"
            okDisabled={saving || blocked !== null}
            onConfirm={onConfirm}
            onCancel={onCancel}
        >
            {blocked?.activeCases}
        </FormModal>
    )
}