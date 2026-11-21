import avatarUrl from '@/features/assistant/assets/assistant-avatar.webp'

export interface AssistantAvatarProps {
    /** Lado en píxeles. */
    size?: number
}

/**
 * El "agente del estudio": un ovejero de traje con vincha y micrófono de
 * atención, sobre el verde del estudio. La imagen trae un margen blanco
 * alrededor del círculo; el contenedor la recorta en redondo y la amplía
 * para que ese margen no se vea (`styles/assistant.css`).
 *
 * Decorativo: el nombre accesible lo pone el botón o el título que lo rodea.
 */
export function AssistantAvatar({ size = 32 }: AssistantAvatarProps) {
    return (
        <span className="vz-help-avatar" style={{ width: size, height: size }} aria-hidden="true">
            <img src={avatarUrl} alt="" draggable={false} />
        </span>
    )
}
