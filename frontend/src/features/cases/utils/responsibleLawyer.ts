/**
 * Sólo el abogado responsable de la causa registra sus actos procesales
 * (V3 D-30). No es un permiso por rol —ni otro abogado ni el administrador
 * pueden—, así que no vive en `ACTION_ACCESS`: depende de la causa.
 *
 * La excepción es la causa huérfana (V6 §4, "Causa huérfana", D-143): no
 * tiene responsable, y sus actos los opera sólo el Administrador
 * (`cases.actOnOrphanCase`). Ningún abogado, ni el que era responsable.
 *
 * Vive en `cases` porque lo usan el detalle de la causa (HU-22) y el alta de
 * acto (HU-26), y las dependencias van `proceedings → cases`.
 *
 * El backend responde `403` a quien no lo es: deshabilitar el botón acá es
 * para no ofrecer algo que no se puede usar.
 */

import { formatPersonFullName, formatPersonName } from '@/shared/lib/personName'
import type { Case } from '@/features/cases/types/case'

type WithResponsible = Pick<Case, 'responsibleLawyer'>

/** Cómo se muestra el responsable de una causa huérfana (V6 §3.13, D-145). */
export const UNASSIGNED_LABEL = 'Sin asignar'

/** Una causa huérfana: vigente, sin abogado responsable (D-143). */
export function isOrphanCase(c: WithResponsible): boolean {
    return c.responsibleLawyer === null
}

/** `Ríos, Malena`, o "Sin asignar" en una causa huérfana. */
export function responsibleLabel(c: WithResponsible): string {
    return c.responsibleLawyer === null ? UNASSIGNED_LABEL : formatPersonName(c.responsibleLawyer)
}

export function isResponsibleLawyer(c: WithResponsible, lawyerId: number | null): boolean {
    return lawyerId !== null && c.responsibleLawyer !== null && c.responsibleLawyer.id === lawyerId
}

/**
 * ¿Registra, modifica y anula los actos de la causa, procesales e
 * interruptivos? El responsable o, en una huérfana, quien tiene
 * `cases.actOnOrphanCase` (el Administrador, D-143). `actOnOrphan` lo resuelve
 * la página con `useCan`, así la regla por rol sigue viviendo sólo en
 * `ACTION_ACCESS`.
 */
export function canActOnCase(c: WithResponsible, lawyerId: number | null, actOnOrphan: boolean): boolean {
    return isOrphanCase(c) ? actOnOrphan : isResponsibleLawyer(c, lawyerId)
}

/**
 * El sujeto de las notas de los botones deshabilitados: quién puede lo que
 * el usuario no puede. Cada uno se completa con el verbo ("… registra
 * actos."). En una huérfana no hay abogado que nombrar (D-143).
 */
export interface CaseActors {
    /** Registrar, modificar y anular actos, y los interruptivos. */
    acts: string
    /** Modificar, dar de baja y la carpeta (D-110). */
    operate: string
    /** "Marcar prescripta" (D-110). */
    prescription: string
    /** La nota de quien no registra actos ni opera la causa, entera. */
    actsAndOperateNote: string
}

const ORPHAN = 'En una causa sin responsable, solo'

export function caseActors(c: WithResponsible): CaseActors {
    if (c.responsibleLawyer === null) {
        return {
            acts: `${ORPHAN} el Administrador`,
            operate: `${ORPHAN} el Administrador o la Secretaría`,
            prescription: `${ORPHAN} el Administrador`,
            actsAndOperateNote: `${ORPHAN} el Administrador registra actos, y el Administrador o la Secretaría la modifican o la dan de baja.`,
        }
    }
    const only = `Solo el abogado responsable (${formatPersonFullName(c.responsibleLawyer)})`
    return {
        acts: only,
        operate: only,
        prescription: only,
        actsAndOperateNote: `${only} registra actos, y modifica o da de baja la causa.`,
    }
}

/** Lo que el usuario puede hacer sobre cualquier causa, por su rol (`ACTION_ACCESS`). */
export interface AnyCaseAccess {
    /** `cases.operateAnyCase`: Administrador o Secretaría. */
    operate: boolean
    /** `cases.declarePrescriptionAnyCase`: Administrador. */
    declarePrescription: boolean
}

export interface CaseOperation {
    /** Modificar, dar de baja y crear o reintentar la carpeta (HU19, HU21, HU39). */
    canOperate: boolean
    /** "Marcar prescripta" (HU33). Que el botón se vea lo decide `cases.declarePrescription`. */
    canDeclarePrescription: boolean
}

/**
 * Qué operaciones de la causa habilita el usuario (V5 §4, "Operación de la
 * causa", D-110). Un abogado que no es el responsable sólo consulta y genera
 * el expediente; el Administrador y la Secretaría operan cualquier causa
 * (la Secretaría no la marca prescripta). Con varios roles alcanza con uno.
 * En una huérfana nadie es el responsable, así que deciden sólo los roles.
 *
 * Los roles los resuelve la página con `useCan`, así la regla por rol sigue
 * viviendo sólo en `ACTION_ACCESS`; acá se le suma lo que depende de la causa.
 */
export function caseOperation(
    c: WithResponsible,
    lawyerId: number | null,
    anyCase: AnyCaseAccess,
): CaseOperation {
    const responsible = isResponsibleLawyer(c, lawyerId)
    return {
        canOperate: responsible || anyCase.operate,
        canDeclarePrescription: responsible || anyCase.declarePrescription,
    }
}
