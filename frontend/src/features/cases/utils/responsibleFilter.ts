/**
 * El filtro "Responsable" del listado de causas: todos, un abogado o "Sin
 * asignar", las causas huérfanas (D-143). Son dos parámetros excluyentes de
 * `GET /cases` (`responsibleLawyerId` y `unassigned`, que juntos dan `400`):
 * como salen del mismo select, nunca viajan los dos.
 */

import type { CaseListParams } from '@/features/cases/types/case'
import { UNASSIGNED_LABEL } from '@/features/cases/utils/responsibleLawyer'

/** El valor de la opción "Sin asignar". Los abogados van con su id como texto. */
export const UNASSIGNED_FILTER = 'UNASSIGNED'

export const UNASSIGNED_FILTER_OPTION = { value: UNASSIGNED_FILTER, label: UNASSIGNED_LABEL }

/** `''` = todos; `UNASSIGNED_FILTER` = sólo las huérfanas; si no, el id del abogado. */
export function responsibleFilterParams(value: string): Pick<CaseListParams, 'responsibleLawyerId' | 'unassigned'> {
    if (value === '') return {}
    if (value === UNASSIGNED_FILTER) return { unassigned: true }
    return { responsibleLawyerId: Number(value) }
}
