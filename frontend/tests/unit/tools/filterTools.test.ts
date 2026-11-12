import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { displayHost, filterTools, groupByCategory } from '@/features/tools/utils/filterTools'
import { TOOLS } from '@/features/tools/utils/catalog'
import { TOOL_CATEGORIES } from '@/features/tools/types/tool'

const ids = (tools: { id: string }[]) => tools.map((t) => t.id)

describe('filterTools', () => {
    it('sin búsqueda devuelve el catálogo entero, en su orden', () => {
        expect(ids(filterTools(TOOLS, ''))).toEqual(ids(TOOLS))
    })

    it('busca sin importar mayúsculas ni tildes', () => {
        expect(ids(filterTools(TOOLS, 'CORDOBA'))).toContain('pj-portal')
    })

    it('busca también en las etiquetas', () => {
        expect(ids(filterTools(TOOLS, 'bancor'))).toEqual(['pj-tasa-justicia'])
    })

    // Pedido del 08/11/2026: el portal de la Nación y Claude.
    it('encuentra el Poder Judicial de la Nación y Claude', () => {
        expect(ids(filterTools(TOOLS, 'nacion'))).toContain('pjn-portal')
        expect(ids(filterTools(TOOLS, 'redacción'))).toEqual(['claude'])
    })

    it('sin coincidencias devuelve una lista vacía', () => {
        expect(filterTools(TOOLS, 'zzzz')).toEqual([])
    })
})

describe('groupByCategory', () => {
    it('saca los grupos vacíos', () => {
        const groups = groupByCategory(filterTools(TOOLS, 'bancor'), TOOL_CATEGORIES)
        expect(groups.map((g) => g.category)).toEqual(['judicial'])
    })
})

describe('el catálogo', () => {
    it('no repite identificadores y todas las URL son https', () => {
        expect(new Set(ids(TOOLS)).size).toBe(TOOLS.length)
        expect(TOOLS.every((t) => t.url.startsWith('https://'))).toBe(true)
    })

    it('muestra el dominio sin "www."', () => {
        expect(displayHost('https://www.ilovepdf.com/es')).toBe('ilovepdf.com')
    })

    it('cada logo existe en public/tools', () => {
        for (const tool of TOOLS.filter((t) => t.logo)) {
            const file = tool.logo!.replace(import.meta.env.BASE_URL, '')
            expect(existsSync(`public/${file}`), tool.id).toBe(true)
        }
    })
})
