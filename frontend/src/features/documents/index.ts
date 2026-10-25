/**
 * La cara pública del módulo.
 *
 * Otro módulo puede importar **esto** y nada más: `@/features/documents`,
 * nunca `@/features/documents/api/...`.
 *
 * El alta de causa usa `useDocumentTemplates` para "N modelos parametrizados
 * para el fuero …" (HU-40): pide los del fuero que se copian a las causas
 * nuevas y lee `pagination.totalItems`.
 */
export { useDocumentTemplates } from './api/useDocumentTemplates'
export type { DocumentTemplate } from './types/documentTemplate'
