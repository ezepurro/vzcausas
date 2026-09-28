import { ROLES, type Role } from '@/features/auth/types/session'


const ADMIN: readonly Role[] = ['ADMINISTRATOR']
const EVERYONE: readonly Role[] = ROLES

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
