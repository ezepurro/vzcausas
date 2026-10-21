/**
 * El borrador del alta de causa: lo que el usuario dejó cargado al irse a otra
 * pantalla sin registrar ni cancelar. Al volver, la página ofrece recuperarlo.
 *
 * Es un caché, no un dato: si no se puede leer, o tiene otra forma que la del
 * formulario actual, se descarta sin preguntar. La clave lleva el usuario, así
 * nadie recupera la causa a medio cargar de otro en la misma pestaña.
 *
 * Cuándo se borra lo decide la página (registrar, cancelar, "Empezar de
 * nuevo") y el cierre de sesión a pedido del usuario (`clearDrafts`). Un token
 * vencido no lo borra: quien vuelve a entrar lo recupera.
 */

import { draftKey } from '@/shared/lib/drafts'
import type { CaseFormValues } from '@/features/cases/types/case'
import { emptyCaseForm } from '@/features/cases/utils/caseForm'

const FORM = 'case'

export function readCaseDraft(userId: number): CaseFormValues | null {
    const key = draftKey(FORM, userId)
    try {
        const raw = sessionStorage.getItem(key)
        if (raw === null) return null

        const draft: unknown = JSON.parse(raw)
        if (hasFormShape(draft)) return draft

        // De una versión anterior del formulario, o roto: no sirve más.
        sessionStorage.removeItem(key)
        return null
    } catch {
        // `JSON.parse` falló, o el navegador no deja leer.
        tryRemove(key)
        return null
    }
}

/**
 * Guarda lo cargado. El formulario vacío no se guarda —borra lo que hubiera—:
 * entrar y salir sin tocar nada no tiene que dejar nada que recuperar.
 */
export function writeCaseDraft(userId: number, values: CaseFormValues): void {
    const key = draftKey(FORM, userId)
    if (isEmptyCaseForm(values)) {
        tryRemove(key)
        return
    }
    try {
        sessionStorage.setItem(key, JSON.stringify(values))
    } catch {
        /* Cuota llena o modo privado: el formulario sigue andando, sólo que
           sin borrador. */
    }
}

export function clearCaseDraft(userId: number): void {
    tryRemove(draftKey(FORM, userId))
}

/** Si los valores son los del formulario recién abierto. */
export function isEmptyCaseForm(values: CaseFormValues): boolean {
    return JSON.stringify(values) === JSON.stringify(emptyCaseForm())
}

/**
 * Si lo guardado tiene la forma del formulario actual: las mismas claves que
 * `emptyCaseForm()`, ni una más ni una menos, y cada valor del mismo tipo.
 * El día que `CaseFormValues` sume o saque un campo, los borradores viejos
 * dejan de valer solos.
 *
 * Las calificaciones se miran fila por fila: son lo único que no es texto ni
 * casilla, y una fila sin id rompería la página.
 */
function hasFormShape(draft: unknown): draft is CaseFormValues {
    if (typeof draft !== 'object' || draft === null || Array.isArray(draft)) return false

    const record = draft as Record<string, unknown>
    const template: Record<string, unknown> = emptyCaseForm()
    const keys = Object.keys(template)

    if (Object.keys(record).length !== keys.length) return false

    for (const key of keys) {
        if (!(key in record)) return false
        const expected = template[key]
        const value = record[key]
        if (Array.isArray(expected)) {
            if (!Array.isArray(value)) return false
        } else if (typeof value !== typeof expected) {
            return false
        }
    }

    return (record.legalQualifications as unknown[]).every(isQualificationValue)
}

function isQualificationValue(row: unknown): boolean {
    if (typeof row !== 'object' || row === null) return false
    const { legalQualificationId, offenseDate } = row as Record<string, unknown>
    return Number.isInteger(legalQualificationId) && typeof offenseDate === 'string'
}

function tryRemove(key: string): void {
    try {
        sessionStorage.removeItem(key)
    } catch {
        /* Nada que hacer. */
    }
}
