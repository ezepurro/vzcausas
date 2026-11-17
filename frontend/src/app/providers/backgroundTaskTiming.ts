/**
 * Cada cuánto se le pregunta al servidor por una tarea que no tiene pedido en
 * vuelo (después de un F5, o con una respuesta que se cortó): cada
 * `TASK_POLL_MS` durante el primer `TASK_POLL_FAST_FOR_MS` desde que empezó,
 * que es cuando suele terminar, y después cada `TASK_POLL_SLOW_MS`. Preguntar
 * por el expediente lee la carpeta en Drive: no se hace más de lo necesario.
 *
 * Vive aparte del proveedor para que ese archivo exporte sólo el componente
 * (`react/only-export-components`), igual que `toastDuration.ts`.
 */
export const TASK_POLL_MS = 4000
export const TASK_POLL_FAST_FOR_MS = 30_000
export const TASK_POLL_SLOW_MS = 15_000
