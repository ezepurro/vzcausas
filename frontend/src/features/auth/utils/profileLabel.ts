import type { Role } from '@/features/auth/types/session'

/**
 * Cómo se nombra cada perfil en pantalla. Los códigos viajan en inglés
 * porque así los define el contrato; lo que lee el usuario va en castellano,
 * con los rótulos del §2.
 */
export const ROLE_LABELS: Record<Role, string> = {
    ADMINISTRATOR: 'Administrador',
    LAWYER: 'Abogado',
    SECRETARY: 'Secretaría',
}

/**
 * Orden de precedencia para elegir un rol cuando hay varios.
 *
 * Un usuario puede tener más de uno —lo habitual es administrador y abogado a
 * la vez— pero el pie del rail muestra uno solo. Se elige el de mayor alcance.
 */
const ROLE_PRECEDENCE: readonly Role[] = ['ADMINISTRATOR', 'SECRETARY', 'LAWYER']

/**
 * El perfil que se muestra cuando hay lugar para uno solo.
 *
 * Función pura: entran los roles del usuario y sale el texto.
 */
export function profileLabel(roles: Role[]): string {
    const principal = ROLE_PRECEDENCE.find((role) => roles.includes(role))
    return principal ? ROLE_LABELS[principal] : 'Sin perfil asignado'
}
