/**
 * La regla del vínculo con la ficha profesional, en un solo lugar.
 *
 * Si los roles incluyen `LAWYER` hay que mandar ficha —`lawyerId` o
 * `lawyer`—; si no, no hay que mandar ninguna de las dos. El contrato lo dice
 * así: "un usuario con rol `ADMINISTRATOR` o `SECRETARY` que no ejerce no
 * posee matrícula". O sea que `ADMINISTRATOR` **no** pide ficha por sí solo;
 * quien es administrador y abogado a la vez la pide por lo segundo.
 *
 * La usan el schema (para no gastar un viaje al servidor) y el formulario
 * (para mostrar u ocultar los campos).
 */

import { formatPersonName } from '@/shared/lib/personName'
import { LAWYER_MODES, type EmbeddedLawyer, type Role } from '@/features/users/types/user'

/** `true` si un usuario con alguno de esos roles necesita ficha profesional. */
export function needsLawyer(roles: Role[]): boolean {
    return roles.includes('LAWYER')
}

/** `true` si el modo elegido es dar de alta una ficha nueva. */
export function isCreatingLawyer(mode: string): boolean {
    return mode === LAWYER_MODES.create
}

/**
 * Cómo se nombra una ficha en el select y en la tabla: nombre y matrícula
 * juntos, porque dos profesionales pueden llamarse parecido.
 */
export function lawyerOptionLabel(lawyer: EmbeddedLawyer): string {
    return `${formatPersonName(lawyer)} · matrícula ${lawyer.registrationNumber}`
}
