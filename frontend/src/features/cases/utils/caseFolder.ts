/**
 * La carpeta de la causa en la nube (HU39, HU40), como la ven el alta y su
 * aviso. Dónde se crea y qué se copia lo decide el backend (V4 §4, "Carpeta
 * de la causa"); acá sólo se arma lo que se muestra.
 */

import type { CaseFolder } from '@/features/cases/types/case'

/**
 * Dónde va a quedar la carpeta: `/VZ Causas/{abogado}/{fuero}/{carátula}`
 * (D-61), con el abogado como `Apellido, Nombres`. Es lo que va a devolver
 * `folder.path`; antes del alta se arma con lo que hay en el formulario.
 * `null` mientras falta el abogado o la carátula.
 */
export function folderPathPreview(lawyerName: string | null, jurisdictionLabel: string, caption: string): string | null {
    const trimmed = caption.trim()
    if (!lawyerName || !trimmed) return null
    return `/VZ Causas/${lawyerName}/${jurisdictionLabel}/${trimmed}`
}

/**
 * Lo que agrega la carpeta al aviso del alta, según cómo quedó:
 * " · carpeta creada en Drive con 6 modelos", " · carpeta creada en Drive" o
 * nada, si no se pidió. Si Drive falló, la causa igual se registró (D-60):
 * eso va en un aviso aparte (`folderFailed`).
 */
export function folderNoticeSuffix(folder: CaseFolder | null): string {
    if (folder?.status !== 'CREATED') return ''
    const copied = folder.templatesCopied
    if (copied === 0) return ' · carpeta creada en Drive'
    return ` · carpeta creada en Drive con ${copied} ${copied === 1 ? 'modelo' : 'modelos'}`
}

/** Se pidió la carpeta y el almacenamiento en la nube no respondió (CA-39.4). */
export function folderFailed(folder: CaseFolder | null): boolean {
    return folder?.status === 'ERROR'
}
