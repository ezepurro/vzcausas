import { FormModal } from '@/shared/components/forms'

export interface DeleteDocumentTemplateModalProps {
    /** El nombre del modelo, bajo el título. */
    templateName: string
    /** true mientras la baja está en vuelo: bloquea el confirmar. */
    saving: boolean
    onConfirm: () => void
    onCancel: () => void
}

/**
 * El diálogo "Dar de baja el modelo" (HU37), con los textos del prototipo.
 * Es un `FormModal` sin campos: `tone="danger"` sin `fields` es el modo
 * "confirmar baja" del producto (ver `SHARED.md`), como `DeleteUserModal`.
 *
 * La baja es lógica y sin vuelta atrás (D-126): no hay "Reactivar". No lleva
 * motivo. Su archivo va a la `Papelera` de Drive (D-131).
 */
export function DeleteDocumentTemplateModal({
    templateName, saving, onConfirm, onCancel,
}: DeleteDocumentTemplateModalProps) {
    return (
        <FormModal
            title="Dar de baja el modelo"
            sub={templateName}
            tone="danger"
            width="sm"
            note="Deja de copiarse en las causas nuevas. Las copias ya distribuidas no se tocan."
            values={{}}
            onChange={() => {}}
            okLabel="Dar de baja"
            okDisabled={saving}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    )
}