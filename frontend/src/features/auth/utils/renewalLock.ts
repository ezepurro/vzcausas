/**
 * Serializa la renovación del token **entre pestañas**.
 *
 * `http.ts` ya evita renovar dos veces a la vez, pero sólo dentro de una
 * pestaña. La cookie de renovación es una sola para todo el navegador y el
 * backend la rota en cada uso: si dos pestañas renuevan al mismo tiempo, la
 * segunda presenta una cookie ya rotada, el backend la toma como robada y
 * revoca la sesión entera —se cierran las dos—.
 *
 * Con la Web Locks API una sola pestaña renueva por vez. La que espera, al
 * conseguir el lock, tiene que fijarse si la otra ya dejó un token nuevo
 * antes de llamar al backend: eso lo hace `AuthProvider`.
 *
 * Donde no hay `navigator.locks` (navegadores viejos, contextos no seguros,
 * jsdom) se renueva sin lock: es lo que pasaba antes, y dentro de la pestaña
 * sigue protegido por `http.ts`.
 */

const LOCK_NAME = 'vz.auth.refresh'

export function withRenewalLock<T>(task: () => Promise<T>): Promise<T> {
    const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
    if (!locks) return task()
    return locks.request(LOCK_NAME, task)
}
