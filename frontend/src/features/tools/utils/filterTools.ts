import type { Tool, ToolCategory } from '@/features/tools/types/tool'

/** Sin mayúsculas ni tildes: "Córdoba" se encuentra escribiendo "cordoba". */
function normalize(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

/**
 * Las herramientas que coinciden con la búsqueda. Busca en el nombre, la
 * descripción y las etiquetas. Respeta el orden del catálogo.
 */
export function filterTools(tools: readonly Tool[], search: string): Tool[] {
    const term = normalize(search)
    return tools.filter((tool) => {
        if (!term) return true
        const haystack = normalize([tool.name, tool.description, ...tool.tags].join(' '))
        return haystack.includes(term)
    })
}

/** Agrupa por categoría en el orden dado, y saca los grupos vacíos. */
export function groupByCategory(
    tools: readonly Tool[],
    order: readonly ToolCategory[],
): { category: ToolCategory; tools: Tool[] }[] {
    return order
        .map((category) => ({ category, tools: tools.filter((t) => t.category === category) }))
        .filter((group) => group.tools.length > 0)
}

/** El dominio que se muestra bajo el nombre: "ilovepdf.com". */
export function displayHost(url: string): string {
    return new URL(url).hostname.replace(/^www\./, '')
}
