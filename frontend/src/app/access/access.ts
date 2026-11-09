import { ROLES, type Role } from '@/features/auth/types/session'


const ADMIN: readonly Role[] = ['ADMINISTRATOR']
const LAWYER: readonly Role[] = ['LAWYER']
const ADMIN_AND_LAWYER: readonly Role[] = ['ADMINISTRATOR', 'LAWYER']
const LAWYER_AND_SECRETARY: readonly Role[] = ['LAWYER', 'SECRETARY']
const ADMIN_AND_SECRETARY: readonly Role[] = ['ADMINISTRATOR', 'SECRETARY']
const EVERYONE: readonly Role[] = ROLES
export const ROUTE_ACCESS: Record<string, readonly Role[]> = {
    '/inicio': ADMIN_AND_LAWYER,  // cada tablero de Inicio es de un rol (V4 §3.11)
    '/causas': EVERYONE,
    '/clientes': EVERYONE,
    '/modelos': ADMIN_AND_LAWYER, // la Secretaría no ve ni registra modelos
    // Accesos directos a sitios externos: no pide nada al servidor (ver features/tools/CAMBIOS.md).
    '/herramientas': EVERYONE,
    '/usuarios': ADMIN,
    // Consultar abogados y administrar estados procesales y calificaciones
    // legales es de los tres perfiles (V3 §4, matriz del 11/10/2026, D-39).
    '/abogados': EVERYONE,
    '/estados-y-plazos': EVERYONE,
    '/calificaciones-legales': EVERYONE,
    '/reportes': ADMIN,
}
/**
 * La sección de `ROUTE_ACCESS` a la que pertenece la ruta. Sin distinguir
 * mayúsculas, como React Router: si no, `/Abogados` abre la pantalla pero
 * acá no se encuentra y termina en "Sin acceso".
 */
export function matchRoute(pathname: string): string | undefined {
    const path = pathname.toLowerCase()
    return Object.keys(ROUTE_ACCESS).find(
        (route) => path === route || path.startsWith(`${route}/`),
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
export type Action =
    | 'lawyers.create'
    | 'lawyers.update'
    | 'dashboard.lawyer'
    | 'dashboard.administrator'
    | 'cases.declarePrescription'
    | 'cases.declarePrescriptionAnyCase'
    | 'cases.operateAnyCase'
    | 'cases.downloadDocument'

export const ACTION_ACCESS: Record<Action, readonly Role[]> = {
    // Registrar y modificar abogados es sólo del Administrador; la pantalla
    // la ven los tres perfiles (V5 §4, matriz del 11/10/2026, CA-14.6).
    'lawyers.create': ADMIN,
    'lawyers.update': ADMIN,
    // Cada tablero de Inicio es de un rol (V4 §3.11): "Mi día" del Abogado y
    // "Estudio" del Administrador. Quien tiene los dos roles ve las dos pestañas.
    'dashboard.lawyer': LAWYER,
    'dashboard.administrator': ADMIN,
    // "Marcar prescripta" una causa penal: quién ve el botón. La Secretaría
    // no (V4 §4, D-52, CA-33.2). Entre los abogados, sólo el responsable lo
    // opera (D-110): eso depende de la causa y lo resuelve `caseOperation`.
    'cases.declarePrescription': ADMIN_AND_LAWYER,
    // "Marcar prescripta" sobre cualquier causa, sin ser el responsable:
    // sólo el Administrador (V5 §4, "Operación de la causa", D-110).
    'cases.declarePrescriptionAnyCase': ADMIN,
    // Modificar, dar de baja y crear o reintentar la carpeta de cualquier
    // causa, sin ser el responsable: el Administrador y la Secretaría. Un
    // abogado, sólo las suyas (V5 §4, "Operación de la causa", D-110).
    'cases.operateAnyCase': ADMIN_AND_SECRETARY,
    // "Descargar" un documento de la causa que no es un expediente: el
    // Abogado y la Secretaría, que tienen la carpeta compartida en Drive; el
    // Administrador no (V5 §3.12, D-103, D-83). El expediente lo descarga
    // cualquiera: eso no es un permiso por rol y lo resuelve la tarjeta.
    'cases.downloadDocument': LAWYER_AND_SECRETARY,
}


/** ¿Algún rol del usuario habilita esta acción? */
export function can(roles: readonly Role[], action: Action): boolean {
    return ACTION_ACCESS[action].some((role) => roles.includes(role))
}
