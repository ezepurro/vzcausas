import { useId } from 'react'
import type { Tool } from '@/features/tools/types/tool'
import { ToolCard } from '@/features/tools/components/ToolCard'

interface ToolSectionProps {
    /** Sin título, la grilla va sola: es lo que se ve con un grupo elegido. */
    title?: string
    description?: string
    tools: Tool[]
}

/** Un grupo del catálogo: su título y la grilla de tarjetas. */
export function ToolSection({ title, description, tools }: ToolSectionProps) {
    const headingId = useId()

    return (
        <section className="vz-tools-section" aria-labelledby={title ? headingId : undefined}>
            {title && (
                <header className="vz-tools-section__head">
                    <h2 id={headingId} className="vz-tools-section__title">
                        {title}
                        <span className="vz-tools-section__count">{tools.length}</span>
                    </h2>
                    {description && <p className="vz-tools-section__desc">{description}</p>}
                </header>
            )}
            <div className="vz-tools-grid">
                {tools.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} />
                ))}
            </div>
        </section>
    )
}
