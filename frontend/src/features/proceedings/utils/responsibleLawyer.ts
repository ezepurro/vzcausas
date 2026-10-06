/**
 * Quién puede registrar actos en una causa.
 */

import type { Case } from '@/features/cases'

/**
 * `true` si el abogado de la sesión es el responsable de la causa. Sólo él
 * registra actos y pide el vencimiento (V3 D-30): ni otro abogado ni el
 * administrador. Un usuario sin ficha de abogado (`lawyerId` en `null`) nunca
 * lo es.
 *
 * Esconder el formulario es comodidad: quien autoriza es el backend, que
 * responde `403` igual.
 */
export function isResponsibleLawyer(
    c: Pick<Case, 'responsibleLawyer'>,
    lawyerId: number | null,
): boolean {
    return lawyerId !== null && lawyerId === c.responsibleLawyer.id
}
