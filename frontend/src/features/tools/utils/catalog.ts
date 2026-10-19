import type { Tool, ToolCategory } from '@/features/tools/types/tool'

/**
 * Rótulo y bajada de cada grupo. El orden de las claves es el orden en que
 * aparecen las secciones.
 */
export const CATEGORY_INFO: Record<ToolCategory, { label: string; description: string }> = {
    judicial: {
        label: 'Poder Judicial de Córdoba',
        description: 'El portal, el SAC, la tasa de justicia y la jurisprudencia.',
    },
    documents: {
        label: 'Trámites y documentos',
        description: 'ARCA, PDF y cartas documento.',
    },
}

/** Los logos viven en `public/tools/`; con el `base` de Vite, por si cambia. */
const logo = (file: string) => `${import.meta.env.BASE_URL}tools/${file}`

/** Marca compartida por los servicios del Poder Judicial de Córdoba. */
const PJ_LOGO = logo('justicia-cordoba.png')
const PJ_BRAND = '#2F9488'

/**
 * El catálogo: las herramientas de la página vieja del estudio. Para sumar
 * una alcanza con agregarla acá: la página arma las secciones y la búsqueda
 * solas.
 */
export const TOOLS: Tool[] = [
    // ── Poder Judicial de Córdoba ──
    {
        id: 'pj-extranet',
        name: 'Servicios Extranet',
        description: 'Ingreso con usuario a los servicios para auxiliares de la justicia, como el SAC para Auxiliares.',
        url: 'https://www.justiciacordoba.gob.ar/JusticiaCordoba/extranet.aspx',
        category: 'judicial',
        logo: PJ_LOGO,
        monogram: 'SAC',
        brand: PJ_BRAND,
        tags: ['SAC', 'Expedientes', 'Con usuario'],
        featured: true,
    },
    {
        id: 'pj-portal',
        name: 'Justicia de Córdoba',
        description: 'Portal del Poder Judicial: servicios, consultas y novedades.',
        url: 'https://www.justiciacordoba.gob.ar/JusticiaCordoba/Inicio/index.aspx',
        category: 'judicial',
        logo: PJ_LOGO,
        monogram: 'PJ',
        brand: PJ_BRAND,
        tags: ['Portal', 'Servicios', 'Novedades'],
    },
    {
        id: 'pj-tasa-justicia',
        name: 'Tasa de Justicia',
        description: 'Generar la boleta de la tasa de justicia de una causa para pagarla en Bancor o en línea.',
        url: 'https://www.justiciacordoba.gob.ar/tasajusticia/Comprobantes/_Comprobantes_Administrativo.aspx',
        category: 'judicial',
        logo: PJ_LOGO,
        monogram: 'TJ',
        brand: PJ_BRAND,
        tags: ['Boleta', 'Pago', 'Bancor'],
        featured: true,
    },
    {
        id: 'jurisemia',
        name: 'Jurisemia',
        description: 'Buscador semántico de jurisprudencia de Córdoba: se pregunta en lenguaje corriente.',
        url: 'https://www.justiciacordoba.gob.ar/Jurisemia/#/home',
        category: 'judicial',
        logo: PJ_LOGO,
        monogram: 'JS',
        brand: '#1F5E57',
        tags: ['Jurisprudencia', 'Córdoba', 'Boletín Judicial'],
        featured: true,
    },
    // ── Trámites y documentos ──
    {
        id: 'arca',
        name: 'ARCA (ex AFIP)',
        description: 'Clave fiscal, constancia de CUIT y trámites ante la agencia de recaudación.',
        url: 'https://www.arca.gob.ar/landing/default.asp',
        category: 'documents',
        logo: logo('arca.png'),
        monogram: 'AR',
        brand: '#33A5DC',
        tags: ['Clave fiscal', 'CUIT', 'Constancias'],
    },
    {
        id: 'ilovepdf',
        name: 'iLovePDF',
        description: 'Unir, dividir, comprimir y pasar a Word los PDF de la causa.',
        url: 'https://www.ilovepdf.com/es',
        category: 'documents',
        logo: logo('ilovepdf.png'),
        monogram: 'iL',
        brand: '#E5322D',
        tags: ['Unir', 'Comprimir', 'PDF a Word'],
        featured: true,
    },
    {
        id: 'carta-documento-preimpresos',
        name: 'Imprimir carta documento',
        description: 'Completar la carta documento en pantalla e imprimirla sobre el formulario preimpreso del Correo.',
        url: 'https://imprimir-carta-documento.preimpresos.com/',
        category: 'documents',
        monogram: 'CD',
        brand: '#2A2C6B',
        tags: ['Carta documento', 'Imprimir'],
    },
]
