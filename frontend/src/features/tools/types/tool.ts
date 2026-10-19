/**
 * Las herramientas son accesos directos a sitios externos que el estudio usa
 * en el día a día. No hay endpoint: el catálogo es fijo y vive en el front
 * (`utils/catalog.ts`).
 */

/** Los grupos en que se ordena el catálogo. */
export type ToolCategory = 'judicial' | 'documents'

export const TOOL_CATEGORIES: readonly ToolCategory[] = ['judicial', 'documents']

export interface Tool {
    /** Identificador estable: clave de React y ancla para los tests. */
    id: string
    name: string
    /** Lo que se ve en la tarjeta: para qué sirve, en una frase. */
    description: string
    url: string
    category: ToolCategory
    /**
     * Logo del sitio, servido desde `public/tools/` (PNG cuadrado de 128 px).
     * Sin logo, la tarjeta muestra `monogram` en el tono del grupo.
     */
    logo?: string
    /** Dos o tres caracteres para el sello cuando no hay logo: "BO", "CD". */
    monogram: string
    /**
     * Color de marca del sitio: el filete de arriba de la tarjeta y el borde
     * al pasar el mouse. Es un dato de la herramienta, no del tema.
     */
    brand?: string
    /** Lo que se puede hacer ahí, en pocas palabras. También entra en la búsqueda. */
    tags: string[]
    /** Va en la franja de "accesos rápidos" de arriba. */
    featured?: boolean
}
