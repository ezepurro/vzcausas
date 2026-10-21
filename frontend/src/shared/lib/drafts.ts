/**
 * Borradores de formularios: lo que el usuario dejó a medio cargar al irse a
 * otra pantalla.
 *
 * Viven en `sessionStorage`, no en `localStorage`: duran lo que la pestaña y
 * no quedan en el navegador al cerrarla. Son datos de causas.
 *
 * Todas las claves llevan el mismo prefijo para que quien cierra la sesión
 * pueda borrarlos sin conocer cada formulario: `auth` no tiene por qué saber
 * qué es una causa. Cada módulo arma su clave con `draftKey`.
 */

const DRAFT_PREFIX = 'vz-draft:'

/** La clave de un borrador: `vz-draft:{formulario}:{usuario}`. */
export function draftKey(form: string, userId: number): string {
    return `${DRAFT_PREFIX}${form}:${userId}`
}

/**
 * Borra todos los borradores de la pestaña, de cualquier formulario y de
 * cualquier usuario. Lo llama el cierre de sesión a pedido del usuario: en una
 * máquina compartida, el siguiente no tiene por qué verlos.
 */
export function clearDrafts(): void {
    try {
        const keys: string[] = []
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i)
            if (key?.startsWith(DRAFT_PREFIX)) keys.push(key)
        }
        // Se juntan antes de borrar: borrar mientras se recorre corre los índices.
        for (const key of keys) sessionStorage.removeItem(key)
    } catch {
        /* Si no se puede leer el almacenamiento, tampoco se pudo guardar nada. */
    }
}
