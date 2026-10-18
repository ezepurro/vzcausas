import { FormModal } from '@/shared/components/forms'
import { formatPersonName } from '@/shared/lib/personName'
import type { User } from '@/features/users/types/user'

export interface DeleteUserModalProps {
    user: User
    saving: boolean
    onConfirm: () => void
    onCancel: () => void
}

/**
 * Confirmación de baja. Es un `FormModal` sin campos: `tone="danger"` sin
 * `fields` es el modo "confirmar baja" del producto (ver `SHARED.md`).
 *
 * La baja es **lógica**: el usuario deja de entrar al sistema y desaparece
 * del listado
 */
export function DeleteUserModal({ user, saving, onConfirm, onCancel }: DeleteUserModalProps) {
    return (
        <FormModal
            title="Eliminar usuario"
            sub={`${formatPersonName(user)} · ${user.username}`}
            tone="danger"
            width="sm"
            note="El usuario sera eliminado. Las causas donde figure como responsable deben reasignarse."
            values={{}}
            onChange={() => {}}
            okLabel="Eliminar"
            okDisabled={saving}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    )
}
