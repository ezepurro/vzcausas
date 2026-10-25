/**
 * Las formas del modelo formal, sacadas del contrato (V4 §3.10).
 *
 * El modelo no tiene tipo de escrito (D-56): el prototipo lo muestra, pero no
 * viaja. Un modelo para varios fueros es un solo modelo con un solo archivo
 * (D-55).
 */
import type { Jurisdiction } from '@/features/legal-params'
import type { PersonName } from '@/shared/lib/personName'

/** El recurso tal como viene dentro de `data`. */
export interface DocumentTemplate {
    id: number
    name: string
    jurisdictions: Jurisdiction[]
    fileName: string
    copyToNewCases: boolean
    /** ISO 8601 con hora: "2026-08-21T17:40:00-03:00" */
    lastVersionAt: string
    lastVersionBy: PersonName & { id: number }
    /** Causas a cuya carpeta se copió. Calculado por el backend. */
    usageCount: number
    active: boolean
}

/** Parámetros de `GET /document-templates`. */
export interface DocumentTemplateListParams {
    page?: number
    limit?: number
    jurisdiction?: Jurisdiction
    /** `true`: sólo los que se copian a las causas nuevas (el número de HU-40 en el alta de causa). */
    copyToNewCases?: boolean
}

/**
 * Los valores del formulario de alta. No entra en `FormModal` (su
 * `FormValues` sólo admite texto y booleanos): lleva una lista de fueros y
 * un archivo.
 */
export interface DocumentTemplateFormValues {
    name: string
    jurisdictions: Jurisdiction[]
    copyToNewCases: boolean
    file: File | null
}
