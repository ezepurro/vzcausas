/**
 * El contrato maneja `role` como arreglo,
 * pero la pantalla muestra uno solo: el de más peso.
 */

import type { PillTone } from '@/shared/components/ui'
import type { Role } from '@/features/users/types/user'

/** Código del contrato → lo que lee la persona. */
export const ROLE_LABELS: Record<Role, string> = {
    ADMINISTATOR: 'Administrador',
    LAWYER: 'Abogado',
    SECRETARIAT: 'Secretaría',
}

/** Las opciones del select, en el orden en que se muestran. */
export const ROLE_OPTIONS: string[] = [
    ROLE_LABELS.ADMINISTATOR,
    ROLE_LABELS.LAWYER,
    ROLE_LABELS.SECRETARIAT,
]

/**
 * De mayor a menor peso. Decide cuál se muestra cuando hay varios.
 *
 * OJO: el mock usa otro orden en `sessionRoleFrom()` (LAWYER antes que
 * SECRETARIAT). Si el equipo unifica el criterio, se cambia acá.
 */
const ROLE_PRECEDENCE: readonly Role[] = ['ADMINISTATOR', 'SECRETARIAT', 'LAWYER']

export function roleLabel(role: Role): string {
    return ROLE_LABELS[role]
}

/** Del rótulo del select al código del contrato. `null` si no corresponde a ninguno. */
export function roleFromLabel(label: string): Role | null {
    const entry = Object.entries(ROLE_LABELS).find(([, text]) => text === label)
    return entry ? (entry[0] as Role) : null
}

/** El rol de más peso de un usuario. `null` si viene sin roles. */
export function principalRole(roles: Role[]): Role | null {
    return ROLE_PRECEDENCE.find((role) => roles.includes(role)) ?? null
}

/** El rótulo del rol de más peso, listo para la tabla. */
export function principalRoleLabel(roles: Role[]): string {
    const role = principalRole(roles)
    return role ? roleLabel(role) : '—'
}

/**
 * Reemplaza el rol principal y **conserva los demás**.
 *
 * Es lo que evita que editar a un usuario con dos roles le borre uno: si
 * `jperez` es ['LAWYER','ADMINISTATOR'] y le cambiás el perfil a Secretaría,
 * queda ['LAWYER','SECRETARIAT'], no ['SECRETARIAT'].
 */
export function withPrincipalRole(roles: Role[], role: Role): Role[] {
    const rest = roles.filter((r) => r !== principalRole(roles))
    return rest.includes(role) ? rest : [...rest, role]
}

/**
 * Tono del `Pill` de la tabla.
 *
 * `ok`, `warn` y `danger` están reservados para los plazos por convención
 * del producto (ver `shared/README.md`), así que no se usan para roles.
 */
export function roleTone(role: Role): PillTone {
    return role === 'ADMINISTATOR' ? 'primary' : 'neutral'
}
