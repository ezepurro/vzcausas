import { ROLES, type Role } from '@/features/auth/types/session'


const ADMIN: readonly Role[] = ['ADMINISTRATOR']
const LAWYER: readonly Role[] = ['LAWYER']
const ADMIN_AND_LAWYER: readonly Role[] = ['ADMINISTRATOR', 'LAWYER']
const EVERYONE: readonly Role[] = ROLES
export const ROUTE_ACCESS: Record<string, readonly Role[]> = {
    '/inicio': ADMIN_AND_LAWYER,  // cada tablero de Inicio es de un rol (V4 §3.11)
    '/causas': EVERYONE,
    '/clientes': EVERYONE,
    '/modelos': EVERYONE,
    '/usuarios': ADMIN,
    // Consultar abogados y administrar estados procesales y calificaciones
    // legales es de los tres perfiles (V3 §4, matriz del 11/10/2026, D-39).
    '/abogados': EVERYONE,
    '/estados-y-plazos': EVERYONE,
    '/calificaciones-legales': EVERYONE,
    '/reportes': ADMIN,
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
 * La pantalla de entrada según los roles: Inicio si tiene algún tablero; si
 * no (la Secretaría), Causas (CA-41.13). La usan todos los lugares que mandan
 * "al inicio", así la regla vive en un solo lugar.
 */
export function homeRoute(roles: readonly Role[]): string {
    return canAccess(roles, '/inicio') ? '/inicio' : '/causas'
}
/**
 * Lo que `ROUTE_ACCESS` no puede decir: acciones de una pantalla que ven
 * todos, pero que sólo opera un perfil. Sale de la tabla de permisos por
 * perfil del contrato (V3 §4).
 */
export type Action = 'lawyers.create' | 'dashboard.lawyer' | 'dashboard.administrator'

export const ACTION_ACCESS: Record<Action, readonly Role[]> = {
    // Registrar, modificar y dar de baja abogados es sólo del Administrador;
    // la pantalla la ven los tres perfiles (V3 §4, matriz del 11/10/2026).
    'lawyers.create': ADMIN,
    // Cada tablero de Inicio es de un rol (V4 §3.11): "Mi día" del Abogado y
    // "Estudio" del Administrador. Quien tiene los dos roles ve las dos pestañas.
    'dashboard.lawyer': LAWYER,
    'dashboard.administrator': ADMIN,
}


/** ¿Algún rol del usuario habilita esta acción? */
export function can(roles: readonly Role[], action: Action): boolean {
    return ACTION_ACCESS[action].some((role) => roles.includes(role))
}
