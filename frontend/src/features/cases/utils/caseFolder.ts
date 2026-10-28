/**
 * La carpeta de la causa en la nube (HU39, HU40), como la ven el alta y su
 * aviso. Dónde se crea y qué se copia lo decide el backend (V5 §4, "Carpeta
 * de la causa"); acá sólo se arma lo que se muestra.
 */

import type { CaseFolder } from '@/features/cases/types/case'

/**
 * El nombre de una carpeta en Drive (V5 §4, "Carpeta de la causa"): sin los
 * caracteres que la nube no admite, con los espacios repetidos juntados y
 * cortado en 255. `GÓMEZ, Ariel c/ PÉREZ` queda `GÓMEZ, Ariel c PÉREZ`.
 */
function driveFolderName(name: string): string {
    // eslint-disable-next-line no-control-regex
    return name.replace(/[/\\:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 255)
}

/**
 * Dónde va a quedar la carpeta: `/VZ Causas/Causas/{abogado}/{fuero}/{carátula}`
 * (V5 §4), con el abogado como `Apellido, Nombres`. Es lo que va a devolver
 * `folder.path`; antes del alta se arma con lo que hay en el formulario.
 * `null` mientras falta el abogado o la carátula.
 */
export function folderPathPreview(lawyerName: string | null, jurisdictionLabel: string, caption: string): string | null {
    const folderName = driveFolderName(caption)
    if (!lawyerName || !folderName) return null
    return `/VZ Causas/Causas/${driveFolderName(lawyerName)}/${jurisdictionLabel}/${folderName}`
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

/** "6 modelos copiados", "1 modelo copiado" o `null` si no se copió ninguno. */
export function copiedTemplatesText(folder: CaseFolder): string | null {
    const n = folder.templatesCopied
    if (n === 0) return null
    return n === 1 ? '1 modelo copiado' : `${n} modelos copiados`
}
