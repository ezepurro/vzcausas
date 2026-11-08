/**
 * Sólo el abogado responsable de la causa registra sus actos procesales
 * (V3 D-30). No es un permiso por rol —ni otro abogado ni el administrador
 * pueden—, así que no vive en `ACTION_ACCESS`: depende de la causa.
 *
 * Vive en `cases` porque lo usan el detalle de la causa (HU-22) y el alta de
 * acto (HU-26), y las dependencias van `proceedings → cases`.
 *
 * El backend responde `403` a quien no lo es: deshabilitar el botón acá es
 * para no ofrecer algo que no se puede usar.
 */

import type { Case } from '@/features/cases/types/case'

export function isResponsibleLawyer(
    c: Pick<Case, 'responsibleLawyer'>,
    lawyerId: number | null,
): boolean {
    return lawyerId !== null && c.responsibleLawyer.id === lawyerId
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
 *
 * Los roles los resuelve la página con `useCan`, así la regla por rol sigue
 * viviendo sólo en `ACTION_ACCESS`; acá se le suma lo que depende de la causa.
 */
export function caseOperation(
    c: Pick<Case, 'responsibleLawyer'>,
    lawyerId: number | null,
    anyCase: AnyCaseAccess,
): CaseOperation {
    const responsible = isResponsibleLawyer(c, lawyerId)
    return {
        canOperate: responsible || anyCase.operate,
        canDeclarePrescription: responsible || anyCase.declarePrescription,
    }
}
