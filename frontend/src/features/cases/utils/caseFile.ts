/**
 * Lo que la pantalla "Generar expediente" (HU25) arma con los datos que ya
 * tiene: qué documentos se ofrecen, el orden, los textos de la carátula y el
 * cuerpo del `POST`. Funciones puras, sin React ni HTTP.
 */

import type { Jurisdiction } from '@/features/legal-params'
import type { CaseFileFormErrors } from '@/features/cases/schemas/caseFile.schema'
import type { Case } from '@/features/cases/types/case'
import type { CaseDocument } from '@/features/cases/types/caseDocument'
import type {
    CaseFileCover,
    CaseFileFormValues,
    CreateCaseFileBody,
    GeneratedCaseFile,
} from '@/features/cases/types/caseFile'
import { formatFileSize } from '@/features/cases/utils/caseDocument'

/* ---------------- documentos ---------------- */

/** Los documentos que la pantalla ofrece: un expediente no se incluye en otro (D-102). */
export function offeredDocuments(documents: readonly CaseDocument[]): CaseDocument[] {
    return documents.filter((doc) => doc.caseFile === null)
}

/**
 * Con qué arranca la lista: todo lo que se ofrece y se puede convertir, en el
 * orden de la carpeta, como el prototipo. Uno que no se puede convertir no se
 * elige solo: daría `422 DOCUMENT_NOT_CONVERTIBLE`.
 */
export function initialSelection(documents: readonly CaseDocument[]): string[] {
    return offeredDocuments(documents)
        .filter((doc) => doc.convertibleToPdf)
        .map((doc) => doc.id)
}

/** Los elegidos, en su orden. Un id que ya no está en la carpeta se descarta. */
export function selectedDocuments(documents: readonly CaseDocument[], selection: readonly string[]): CaseDocument[] {
    return selection
        .map((id) => documents.find((doc) => doc.id === id))
        .filter((doc): doc is CaseDocument => doc !== undefined)
}

/** Los que se ofrecen y no están elegidos, en el orden de la carpeta ("No incluidos"). */
export function excludedDocuments(documents: readonly CaseDocument[], selection: readonly string[]): CaseDocument[] {
    return offeredDocuments(documents).filter((doc) => !selection.includes(doc.id))
}

/**
 * Mueve un elemento a otra posición. `to` es el índice que termina teniendo.
 * Fuera de rango, devuelve la lista como estaba (copia).
 */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
    const next = list.slice()
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return next
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    return next
}

/* ---------------- carátula ---------------- */

/** "Plantilla Penal" o "Plantilla Administrativo": el amparo usa la administrativa (D-93). */
export function coverTemplateLabel(jurisdiction: Jurisdiction): string {
    return jurisdiction === 'CRIMINAL' ? 'Penal' : 'Administrativo'
}

/** Cómo se pide la parte que la causa penal no registra. */
export interface OpposingPartyField {
    label: string
    placeholder: string
    note: string
}

const PARTY_NOTE = 'La causa solo registra al cliente, así que esta parte se completa acá. Opcional, no se guarda en la causa.'

/**
 * La parte que no es el cliente (D-92): el imputado si el cliente es
 * querellante y el querellante si es la defensa. `null` fuera del penal, donde
 * no se pide (y mandarla responde `400`). Textos del prototipo.
 */
export function opposingPartyField(c: Pick<Case, 'jurisdiction' | 'proceduralRole'>): OpposingPartyField | null {
    if (c.jurisdiction !== 'CRIMINAL') return null
    if (c.proceduralRole === 'QUERELLANTE_PARTICULAR') {
        return {
            label: 'Imputado',
            placeholder: 'Ej. DOMINGUEZ ORLANDO; JULIO Y MARCOS',
            note: `Va en el recuadro Demandado / imputado. ${PARTY_NOTE}`,
        }
    }
    return {
        label: 'Querellante',
        placeholder: 'Ej. QUERELLANTE: PERALTA JUAN CARLOS\nAPODERADO: DR. MARTÍN SOSA',
        note: `Va en el recuadro Actor / querellante. ${PARTY_NOTE}`,
    }
}

/* ---------------- resultado ---------------- */

/**
 * El nombre que va a tener el expediente, para "Resultado". La versión la
 * lleva el servidor (V5 §3.12): esto la estima con la más alta que se ve en la
 * carpeta, y el nombre definitivo es el que vuelve en la respuesta.
 */
export function caseFileNamePreview(c: Pick<Case, 'id' | 'sacNumber'>, documents: readonly CaseDocument[]): string {
    const lastVersion = Math.max(0, ...documents.map((doc) => doc.caseFile?.version ?? 0))
    return `Expediente_${c.sacNumber ?? `causa-${c.id}`}_v${lastVersion + 1}.pdf`
}

/** "3 partes en un solo PDF · 561 KB aprox. Se guarda en la carpeta de la causa en Drive." */
export function caseFileSummary(selected: readonly CaseDocument[]): string {
    const parts = selected.length + 1 // la carátula siempre va
    const bytes = selected.reduce((total, doc) => total + (doc.sizeBytes ?? 0), 0)
    const size = bytes > 0 ? ` · ${formatFileSize(bytes)} aprox` : ''
    return `${partsLabel(parts)} en un solo PDF${size}. Se guarda en la carpeta de la causa en Drive.`

}

/** "Versión 2 · 3 partes · 561 KB", del diálogo "Expediente generado". */
export function generatedCaseFileMeta(result: GeneratedCaseFile): string {
    return [`Versión ${result.version}`, partsLabel(result.parts.length), formatFileSize(result.document.sizeBytes)]
        .filter(Boolean)
        .join(' · ')
}

function partsLabel(n: number): string {
    return `${n} ${n === 1 ? 'parte' : 'partes'}`
}

/* ---------------- mientras se genera ---------------- */

/**
 * "Uniendo la carátula y 3 documentos. Puede tardar un par de minutos."
 *
 * El `POST` es sincrónico y el contrato no le pone límite de tamaño (C-29):
 * con varios documentos tarda, y sin este texto parece colgado.
 */
export function generatingMessage(documentCount: number): string {
    const documents = `${documentCount} ${documentCount === 1 ? 'documento' : 'documentos'}`
    return `Uniendo la carátula y ${documents}. Puede tardar un par de minutos.`
}

/** "Lleva 42 s", "Lleva 1 min 05 s": cuánto va de la generación. */
export function elapsedLabel(seconds: number): string {
    if (seconds < 60) return `Lleva ${seconds} s`
    const rest = String(seconds % 60).padStart(2, '0')
    return `Lleva ${Math.floor(seconds / 60)} min ${rest} s`
}

/**
 * El aviso cuando el pedido termina sin respuesta: se cortó por tiempo o se
 * cayó la red. El backend pudo haberlo guardado igual, y volver a generar
 * dejaría otra versión en la carpeta.
 */
export const UNCONFIRMED_CASE_FILE_MESSAGE =
    'No llegó la respuesta del servidor, pero el expediente puede haberse generado igual. ' +
    'Antes de volver a generarlo, fijate en "Documentación" de la causa si ya está la versión nueva.'

/* ---------------- cuerpo y errores ---------------- */

/**
 * El cuerpo del `POST`. `cover` viaja sólo si tiene algo, y `opposingParty`
 * sólo en el penal. Los textos van recortados; las mayúsculas las pone el
 * backend al imprimir.
 */
export function toCreateCaseFileBody(
    values: CaseFileFormValues,
    documentIds: readonly string[],
    jurisdiction: Jurisdiction,
): CreateCaseFileBody {
    const cover: CaseFileCover = {}
    const opposingParty = jurisdiction === 'CRIMINAL' ? values.opposingParty.trim() : ''
    const notes = values.notes.trim()
    if (opposingParty) cover.opposingParty = opposingParty
    if (notes) cover.notes = notes

    return Object.keys(cover).length > 0
        ? { cover, documentIds: [...documentIds] }
        : { documentIds: [...documentIds] }
}

/**
 * De los `details` de un `400` a los errores de la pantalla. `cover` sin más
 * es "la parte sólo corresponde al penal": va en el campo de la parte.
 */
const SERVER_FIELDS: Record<string, keyof CaseFileFormErrors> = {
    documentIds: 'documentIds',
    cover: 'opposingParty',
    'cover.opposingParty': 'opposingParty',
    'cover.notes': 'notes',
}

export function toCaseFileFormErrors(details: Record<string, string> | null): CaseFileFormErrors {
    const errors: CaseFileFormErrors = {}
    for (const [serverName, message] of Object.entries(details ?? {})) {
        const field = SERVER_FIELDS[serverName]
        if (field) errors[field] = message
    }
    return errors
}
