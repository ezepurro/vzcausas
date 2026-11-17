/**
 * Cada cuánto se le pregunta al servidor por una tarea que no tiene pedido en
 * vuelo (después de un F5, o con una respuesta que se cortó).
 *
 * Vive aparte del proveedor para que ese archivo exporte sólo el componente
 * (`react/only-export-components`), igual que `toastDuration.ts`.
 */
export const TASK_POLL_MS = 4000
