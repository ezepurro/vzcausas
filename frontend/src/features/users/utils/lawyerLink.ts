/**
 * La regla del vínculo con la ficha profesional, en un solo lugar.
 *  Si los roles incluyen `LAWYER` o`ADMINISTRATOR` hay que 
 *  mandar ficha —`lawyerId` o `lawyer`—, y si el rol
 * es únicamente `SECRETARY` no hay que mandar ninguna de las dos.
 *
 * La usan el schema (para no gastar un viaje al servidor) y el formulario
 * (para mostrar u ocultar los campos).
 */

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
    return `${lawyer.fullName} · matrícula ${lawyer.registrationNumber}`
}
