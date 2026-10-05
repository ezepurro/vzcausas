import { ROLES, type Role } from '@/features/auth/types/session'


const ADMIN: readonly Role[] = ['ADMINISTRATOR']
const EVERYONE: readonly Role[] = ROLES
const SECRETARY: readonly Role[] = ['SECRETARY']
export const ROUTE_ACCESS: Record<string, readonly Role[]> = {
    '/inicio': EVERYONE,
    '/causas': EVERYONE,
    '/vencimientos': EVERYONE,
    '/clientes': EVERYONE,
    '/modelos': EVERYONE,
    '/usuarios': ADMIN,
    '/abogados': ADMIN,
    '/estados-y-plazos': ADMIN,
    '/reportes': ADMIN,   // ← a definir con el equipo
}
export function matchRoute(pathname: string): string | undefined {
    return Object.keys(ROUTE_ACCESS).find(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
    )
}
/** ¿Algún rol del usuario habilita esta ruta? (también /usuarios/8 → /usuarios) */
export function canAccess(roles: readonly Role[], pathname: string): boolean {
    const route = matchRoute(pathname)
    if (route === undefined) return false   // no declarada → denegada
    return ROUTE_ACCESS[route].some((role) => roles.includes(role))
}
/**
 * Lo que `ROUTE_ACCESS` no puede decir: acciones de una pantalla que ven
 * todos, pero que sólo opera un perfil. Sale de la tabla de permisos por
 * perfil del contrato (V3 §4).
 */
export type Action = 'clients.create'

export const ACTION_ACCESS: Record<Action, readonly Role[]> = {
    // Administrar clientes es sólo de la Secretaría (V3 D-05).
    'clients.create': SECRETARY,
}

/** ¿Algún rol del usuario habilita esta acción? */
export function can(roles: readonly Role[], action: Action): boolean {
    return ACTION_ACCESS[action].some((role) => roles.includes(role))
}
