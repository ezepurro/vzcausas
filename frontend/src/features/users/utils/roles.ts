/**
 * Traducción de roles: el contrato los maneja en inglés y como arreglo, la
 * pantalla los muestra en castellano.
 */

import type { PillTone } from '@/shared/components/ui'
import { ROLES, type Role, type UserFormValues } from '@/features/users/types/user'

/** Código del contrato → lo que lee la persona (§2, `Role`). */
export const ROLE_LABELS: Record<Role, string> = {
    ADMINISTRATOR: 'Administrador',
    LAWYER: 'Abogado',
    SECRETARY: 'Secretaría',
}

export function roleLabel(role: Role): string {
    return ROLE_LABELS[role]
}

/**
 * La clave del formulario que le corresponde a cada rol.
 *
 * El formulario no tiene un select con el perfil sino un tilde por rol,
 * porque el contrato guarda un arreglo y una persona puede tener más de uno.
 * `satisfies` es lo que hace que agregar un rol al contrato y olvidarse de su
 * campo deje de compilar.
 */
export const ROLE_FIELD = {
    ADMINISTRATOR: 'roleAdministrator',
    LAWYER: 'roleLawyer',
    SECRETARY: 'roleSecretary',
} as const satisfies Record<Role, keyof UserFormValues>

/** Los roles tildados, en el orden en que los declara el contrato. */
export function rolesFromValues(values: UserFormValues): Role[] {
    return ROLES.filter((role) => values[ROLE_FIELD[role]] === true)
}

/** Los tildes que le corresponden a un usuario, para abrir la edición. */
export function roleChecks(roles: Role[]) {
    return {
        roleAdministrator: roles.includes('ADMINISTRATOR'),
        roleLawyer: roles.includes('LAWYER'),
        roleSecretary: roles.includes('SECRETARY'),
    }
}

/**
 * Tono del `Pill` de la tabla.
 *
 * `ok`, `warn` y `danger` están reservados para los plazos por convención
 * del producto, así que no se usan para roles.
 */
export function roleTone(role: Role): PillTone {
    return role === 'ADMINISTRATOR' ? 'primary' : 'neutral'
}
