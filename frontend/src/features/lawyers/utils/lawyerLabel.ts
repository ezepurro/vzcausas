/**
 * Cómo se nombra un abogado en un select o en un subtítulo: nombre y
 * matrícula juntos, porque dos profesionales pueden llamarse parecido.
 *
 * La matrícula no es obligatoria: sin ella queda sólo el nombre. Vive acá y
 * no en cada pantalla porque la usan las causas y los usuarios.
 */

import { formatPersonName } from '@/shared/lib/personName'
import type { Lawyer } from '@/features/lawyers/types/lawyer'

export function lawyerLabel(lawyer: Pick<Lawyer, 'lastName' | 'firstName' | 'registrationNumber'>): string {
    const name = formatPersonName(lawyer)
    return lawyer.registrationNumber ? `${name} · matrícula ${lawyer.registrationNumber}` : name
}
