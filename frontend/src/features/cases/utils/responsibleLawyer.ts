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
