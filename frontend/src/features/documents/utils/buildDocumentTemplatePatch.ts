/**
 * Del formulario a lo que cambió en "Modificar modelo formal" (HU36): **sólo
 * los campos distintos** del modelo.
 *
 * El contrato responde 400 a un PATCH vacío (CA-36.1), así que si no cambió
 * nada la página ni siquiera tiene que llamar: para eso está `hasChanges`. El
 * `FormData` del cuerpo lo arma `toUpdateDocumentTemplateBody`.
 */

import type {
    DocumentTemplate,
    DocumentTemplateChanges,
    DocumentTemplateFormValues,
} from '@/features/documents/types/documentTemplate'

export function buildDocumentTemplatePatch(
    original: DocumentTemplate,
    values: DocumentTemplateFormValues,
): DocumentTemplateChanges {
    const changes: DocumentTemplateChanges = {}

    /* Se recorta ANTES de comparar: un espacio de más no es un cambio. */
    const name = values.name.trim()
    if (name !== original.name) changes.name = name

    /* Los fueros son un conjunto: el orden en que se tildaron no importa. Si
       cambió, viaja la lista entera, porque reemplaza a la anterior (D-125). */
    if (!sameJurisdictions(values.jurisdictions, original.jurisdictions)) {
        changes.jurisdictions = values.jurisdictions
    }

    if (values.copyToNewCases !== original.copyToNewCases) changes.copyToNewCases = values.copyToNewCases

    /* El archivo es opcional (CA-36.4): sólo viaja si se eligió uno nuevo. */
    if (values.file) changes.file = values.file

    return changes
}

/** `true` si hay algo para mandar. */
export function hasChanges(changes: DocumentTemplateChanges): boolean {
    return Object.keys(changes).length > 0
}

/** Los mismos fueros, en cualquier orden. */
function sameJurisdictions(a: readonly string[], b: readonly string[]): boolean {
    return a.length === b.length && a.every((j) => b.includes(j))
}