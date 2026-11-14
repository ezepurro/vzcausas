import type { Mutation, MutationCache } from '@tanstack/react-query'
import { isApiError } from './ApiError'

/**
 * Errores de operaciones que quedaron en curso cuando la persona salió de la
 * pantalla.
 *
 * Cada pantalla avisa cómo terminó lo que guardó con el `onError` de su
 * `mutate(…)`. Pero TanStack sólo corre esas funciones si el componente sigue
 * montado: si la persona salió antes de la respuesta —tocó otro ítem del
 * rail, volvió con "Atrás", cerró el diálogo—, un rechazo del servidor no lo
 * veía nadie. Lo más grave era "Registrar causa": un SAC repetido, y la causa
 * no se registraba sin que nadie se enterara (tanda 13 de
 * `docs/auditoria-front`).
 *
 * Acá se lleva la cuenta de quién escucha cada mutación y, si falla sin que
 * nadie la escuche, se avisa con un error general. Si la pantalla sigue ahí,
 * no se agrega nada: el aviso es el suyo.
 */

/** Lo que muestra el aviso. Lo registra el proveedor de avisos (`ToastProvider`). */
let onLeftBehindError: ((message: string) => void) | null = null

export function setLeftBehindErrorHandler(handler: ((message: string) => void) | null): void {
    onLeftBehindError = handler
}

/**
 * El texto del aviso, o `null` si no corresponde avisar.
 *
 * Un `UNAUTHENTICATED` no se avisa: la sesión se cierra y la guarda del
 * router lleva al login, que ya dice lo que pasó.
 */
export function leftBehindMessage(error: unknown): string | null {
    if (isApiError(error) && error.is('UNAUTHENTICATED')) return null
    const detail = isApiError(error) ? error.message : 'Ocurrió un error inesperado.'
    return `No se completó lo que dejaste en curso: ${detail}`
}

type AnyMutation = Mutation<unknown, unknown, unknown, unknown>

/** Quién escucha cada mutación. Se lleva por eventos: la mutación no lo publica. */
const listeners = new WeakMap<AnyMutation, Set<unknown>>()

/**
 * Las mutaciones que se sacaron de la caché con algo en vuelo. Pasa al
 * cerrar la sesión (`queryClient.clear()`): lo que falle después es de una
 * sesión que ya terminó y no se avisa. En los tests, `afterEach` también vacía
 * la caché, así que un error de un test no aparece en el siguiente.
 */
const discarded = new WeakSet<AnyMutation>()

/**
 * Empieza a llevar la cuenta en `cache`. Lo llama `queryClient.ts` una sola
 * vez, al crear la caché.
 */
export function trackMutationListeners(cache: MutationCache): void {
    cache.subscribe((event) => {
        if (event.type === 'removed') {
            discarded.add(event.mutation as AnyMutation)
            return
        }
        if (event.type !== 'observerAdded' && event.type !== 'observerRemoved') return
        const mutation = event.mutation as AnyMutation
        const current = listeners.get(mutation) ?? new Set()
        if (event.type === 'observerAdded') current.add(event.observer)
        else current.delete(event.observer)
        listeners.set(mutation, current)
    })
}

/**
 * Para el `onError` de la caché de mutaciones: avisa si la mutación que
 * falló ya no tiene a nadie escuchando.
 */
export function reportIfLeftBehind(error: unknown, mutation: AnyMutation): void {
    if (discarded.has(mutation)) return
    if ((listeners.get(mutation)?.size ?? 0) > 0) return
    const message = leftBehindMessage(error)
    if (message !== null) onLeftBehindError?.(message)
}
