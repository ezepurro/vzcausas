/**
 * Las formas del modelo formal, sacadas del contrato (V6 §3.10).
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
    /**
     * ISO 8601 con hora: "2026-08-21T17:40:00-03:00". Es la última vez que se
     * cargó el archivo: el alta o el último reemplazo (V6). Cambiar sólo el
     * nombre, los fueros o `copyToNewCases` no la mueve.
     */
    lastVersionAt: string
    lastVersionBy: PersonName & { id: number }
    /** Causas a cuya carpeta se copió. Calculado por el backend. */
    usageCount: number
    /**
     * Vale siempre `true`: un modelo dado de baja (HU37) no se lista ni se
     * puede consultar, y no hay "Reactivar" (D-126).
     */
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
 * Los valores del formulario, del alta y de la modificación. No entra en
 * `FormModal` (su `FormValues` sólo admite texto y booleanos): lleva una
 * lista de fueros y un archivo.
 *
 * En la modificación, `file` es el archivo **nuevo**: `null` si no se eligió
 * ninguno, y el modelo conserva el suyo.
 */
export interface DocumentTemplateFormValues {
    name: string
    jurisdictions: Jurisdiction[]
    copyToNewCases: boolean
    file: File | null
}

/**
 * Lo que cambió en "Modificar modelo formal" (HU36): sólo los campos
 * distintos del modelo. Un campo que no está no cambia. Es el paso previo al
 * cuerpo del `PATCH`, que viaja como `multipart/form-data`
 * (`toUpdateDocumentTemplateBody`).
 *
 * - `jurisdictions`, si está, **reemplaza** la lista entera (D-125).
 * - `file`, si está, reemplaza el archivo; el anterior va a la `Papelera` de
 *   Drive, sin historial.
 */
export interface DocumentTemplateChanges {
    name?: string
    jurisdictions?: Jurisdiction[]
    copyToNewCases?: boolean
    file?: File
}