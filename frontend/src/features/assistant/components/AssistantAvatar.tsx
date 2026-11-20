import { useId } from 'react'

export interface AssistantAvatarProps {
    /** Lado en píxeles. */
    size?: number
}

/** Tonos de piel del dibujo: el sistema de diseño no tiene tokens para esto. */
const SKIN = '#F1D3B5'
const SKIN_SHADE = '#E3BC98'

/**
 * El "agente del estudio": un abogado de traje con vincha y micrófono de
 * atención, sobre el verde del estudio, con un destello dorado que sugiere que
 * es un asistente con IA. Dibujado a mano para la demo (sin imágenes externas);
 * los colores salen de los tokens (`styles/tokens.css`) salvo la piel.
 *
 * Decorativo: el nombre accesible lo pone el botón o el título que lo rodea.
 */
export function AssistantAvatar({ size = 32 }: AssistantAvatarProps) {
    const clip = useId()

    return (
        <svg
            className="vz-help-avatar"
            width={size}
            height={size}
            viewBox="0 0 48 48"
            aria-hidden="true"
            focusable="false"
        >
            <defs>
                <clipPath id={clip}>
                    <circle cx="24" cy="24" r="22" />
                </clipPath>
            </defs>

            <circle cx="24" cy="24" r="22" fill="var(--vz-primary)" />

            <g clipPath={`url(#${clip})`}>
                {/* traje */}
                <path d="M5 50c0-10.5 8.5-16.5 19-16.5S43 39.5 43 50z" fill="var(--vz-rail)" />
                {/* camisa */}
                <path d="M18.6 34.4 24 42.5l5.4-8.1A18 18 0 0 0 24 33.6a18 18 0 0 0-5.4.8z" fill="var(--vz-surface)" />
                {/* solapas */}
                <path d="M18.6 34.4 21.4 45M29.4 34.4 26.6 45" fill="none" stroke="var(--vz-rail-on-bg)" strokeWidth="1.3" strokeLinecap="round" />
                {/* corbata */}
                <path d="M22.8 35.6h2.4l.8 1.8-2 6.4-2-6.4z" fill="var(--vz-fuero-amparo)" />
                {/* cuello */}
                <path d="M20.8 27h6.4v5.6a3.2 3.2 0 0 1-6.4 0z" fill={SKIN_SHADE} />
                {/* cara */}
                <circle cx="24" cy="21" r="8" fill={SKIN} />
                {/* pelo */}
                <path d="M15.8 21.6c-.7-6.1 3.2-10.6 8.2-10.6 4.7 0 8.7 3.7 8.2 9.8-.8-1.8-2.1-3.1-3.6-3.9-1.4 1.8-3.8 2.7-6.9 2.7-2.3 0-4.3-.5-5.5-1.4-.3.9-.4 2.1-.4 3.4z" fill="var(--vz-rail)" />
                {/* ojos y sonrisa */}
                <circle cx="21.1" cy="21.6" r="0.95" fill="var(--vz-rail)" />
                <circle cx="26.9" cy="21.6" r="0.95" fill="var(--vz-rail)" />
                <path d="M21.5 24.4c1.4 1.3 3.6 1.3 5 0" fill="none" stroke="var(--vz-rail)" strokeWidth="1.1" strokeLinecap="round" />
                {/* vincha y auriculares */}
                <path d="M15 21.5a9 9 0 0 1 18 0" fill="none" stroke="var(--vz-surface)" strokeWidth="1.7" strokeLinecap="round" />
                <rect x="13.5" y="19.6" width="3.2" height="5.6" rx="1.6" fill="var(--vz-surface)" />
                <rect x="31.3" y="19.6" width="3.2" height="5.6" rx="1.6" fill="var(--vz-surface)" />
                {/* micrófono */}
                <path d="M15.2 25c.3 2.9 2.5 4.5 5.4 4.6" fill="none" stroke="var(--vz-surface)" strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="21.1" cy="29.6" r="1.25" fill="var(--vz-surface)" />
            </g>

            {/* destello: la IA */}
            <path
                d="M40 3.5l1.4 3.4 3.4 1.4-3.4 1.4L40 13.1l-1.4-3.4-3.4-1.4 3.4-1.4z"
                fill="var(--vz-fuero-amparo)"
                stroke="var(--vz-surface)"
                strokeWidth="1"
                strokeLinejoin="round"
            />
        </svg>
    )
}
