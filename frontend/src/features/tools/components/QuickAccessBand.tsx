import { Icon } from '@/shared/components/ui'
import type { Tool } from '@/features/tools/types/tool'
import { displayHost } from '@/features/tools/utils/filterTools'
import { ToolSeal } from '@/features/tools/components/ToolSeal'
import { brandStyle } from '@/features/tools/utils/brandStyle'

interface QuickAccessBandProps {
    tools: Tool[]
}

/**
 * La franja oscura de arriba con las herramientas destacadas. Sigue el
 * lenguaje de la banda de indicadores de Inicio: mismo fondo que el rail.
 */
export function QuickAccessBand({ tools }: QuickAccessBandProps) {
    if (tools.length === 0) return null

    return (
        <section className="vz-tools-band" aria-label="Accesos rápidos">
            <div className="vz-tools-band__intro">
                <div className="vz-tools-band__eyebrow">Accesos rápidos</div>
                <div className="vz-tools-band__title">Lo que más se usa en el estudio</div>
            </div>
            <ul className="vz-tools-band__list">
                {tools.map((tool) => (
                    <li key={tool.id}>
                        <a
                            className={`vz-tools-quick vz-tool--${tool.category}`}
                            style={brandStyle(tool)}
                            href={tool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <ToolSeal tool={tool} />
                            <span className="vz-tools-quick__body">
                                <span className="vz-tools-quick__name">{tool.name}</span>
                                <span className="vz-tools-quick__host">{displayHost(tool.url)}</span>
                            </span>
                            <Icon name="external" size={15} className="vz-tools-quick__go" />
                            <span className="vz-sr-only">(se abre en una pestaña nueva)</span>
                        </a>
                    </li>
                ))}
            </ul>
        </section>
    )
}
