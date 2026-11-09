/**
 * Las opciones del select "Abogado responsable", en el alta y en "Modificar
 * causa".
 *
 * Si quien usa la pantalla es abogado, su ficha va primero y lo dice:
 * "Ríos, Malena · matrícula 1-36842 (asignarme a mí)". No queda elegida sola:
 * asignarse es una decisión. No está en el prototipo (`cases/CAMBIOS.md`).
 *
 * Sólo se ofrece si su ficha está entre los abogados vigentes que llegaron:
 * una ficha dada de baja no se puede asignar a una causa.
 */

import { lawyerLabel, type Lawyer } from '@/features/lawyers'

/** Una opción del select: el id del abogado y cómo se lo nombra. */
export interface LawyerOption {
    value: string
    label: string
}

/** Lo que se suma al nombre de la ficha propia. */
export const ASSIGN_TO_ME_SUFFIX = '(asignarme a mí)'

export function buildLawyerOptions(lawyers: readonly Lawyer[], myLawyerId: number | null): LawyerOption[] {
    const mine = myLawyerId === null ? undefined : lawyers.find((lawyer) => lawyer.id === myLawyerId)
    const others = mine ? lawyers.filter((lawyer) => lawyer !== mine) : lawyers
    return [
        ...(mine ? [{ value: String(mine.id), label: `${lawyerLabel(mine)} ${ASSIGN_TO_ME_SUFFIX}` }] : []),
        ...others.map((lawyer) => ({ value: String(lawyer.id), label: lawyerLabel(lawyer) })),
    ]
}
