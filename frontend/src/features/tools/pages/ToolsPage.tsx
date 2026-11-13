import { useState } from 'react'
import { PageHeader, Panel, SearchInput } from '@/shared/components/ui'
import { TOOL_CATEGORIES } from '@/features/tools/types/tool'
import { CATEGORY_INFO, TOOLS } from '@/features/tools/utils/catalog'
import { filterTools, groupByCategory } from '@/features/tools/utils/filterTools'
import { QuickAccessBand } from '@/features/tools/components/QuickAccessBand'
import { ToolSection } from '@/features/tools/components/ToolSection'
import { usePageTitle } from '@/shared/hooks/usePageTitle'

const FEATURED = TOOLS.filter((tool) => tool.featured)

/**
 * Herramientas: accesos directos a sitios externos que el estudio usa a
 * diario. No está en el prototipo ni en el contrato: el catálogo es fijo
 * (`utils/catalog.ts`) y no pide nada al servidor, así que el buscador
 * filtra en el momento, sin demora.
 *
 * Sin búsqueda se ve la franja de accesos rápidos y el catálogo entero,
 * agrupado; al buscar, sólo lo que coincide.
 */
export function ToolsPage() {
    usePageTitle('Herramientas')
    const [search, setSearch] = useState('')

    const results = filterTools(TOOLS, search)
    const browsing = !search.trim()

    function renderResults() {
        if (results.length === 0) {
            return (
                <div className="vz-empty">
                    <div className="vz-empty__title">Ninguna herramienta coincide con la búsqueda.</div>
                    <div className="vz-empty__text">Probá con otra palabra.</div>
                </div>
            )
        }
        return groupByCategory(results, TOOL_CATEGORIES).map((group) => (
            <ToolSection
                key={group.category}
                title={CATEGORY_INFO[group.category].label}
                description={CATEGORY_INFO[group.category].description}
                tools={group.tools}
            />
        ))
    }

    return (
        <>
            <PageHeader
                eyebrow="Trabajo diario"
                title="Herramientas"
                sub="Accesos directos a los sitios que acompañan el trabajo del estudio."
            />

            {browsing && <QuickAccessBand tools={FEATURED} />}

            <Panel
                title="Catálogo"
                sub={`${results.length} de ${TOOLS.length} herramientas`}
                actions={
                    <SearchInput
                        aria-label="Buscar herramienta"
                        placeholder="Buscar por nombre o para qué sirve"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                }
                footer="Los enlaces abren en una pestaña nueva. Son sitios externos al estudio: antes de subir un escrito con datos de un cliente, revisá sus condiciones de privacidad."
            >
                <div className="vz-tools-body">{renderResults()}</div>
            </Panel>
        </>
    )
}
