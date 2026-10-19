import { Icon } from '@/shared/components/ui'
import type { Tool } from '@/features/tools/types/tool'
import { displayHost } from '@/features/tools/utils/filterTools'
import { brandStyle } from '@/features/tools/utils/brandStyle'
import { ToolSeal } from '@/features/tools/components/ToolSeal'

interface ToolCardProps {
    tool: Tool
}

/**
 * Una herramienta del catálogo. Toda la tarjeta es el enlace y abre el sitio
 * en una pestaña nueva: es externo y no tiene que sacar al usuario del
 * sistema. Lleva el logo y el color de marca del sitio; lo que no tiene,
 * lo toma del grupo.
 */
export function ToolCard({ tool }: ToolCardProps) {
    return (
        <a
            className={`vz-tool vz-tool--${tool.category}`}
            style={brandStyle(tool)}
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
        >
            <div className="vz-tool__head">
                <ToolSeal tool={tool} />
                <div className="vz-tool__title">
                    <span className="vz-tool__name">{tool.name}</span>
                    <span className="vz-tool__host">{displayHost(tool.url)}</span>
                </div>
                <Icon name="external" size={16} className="vz-tool__go" />
            </div>
            <p className="vz-tool__desc">{tool.description}</p>
            <ul className="vz-tool__tags" aria-label="Para qué sirve">
                {tool.tags.map((tag) => (
                    <li key={tag} className="vz-tool__tag">{tag}</li>
                ))}
            </ul>
            <span className="vz-sr-only">(se abre en una pestaña nueva)</span>
        </a>
    )
}
