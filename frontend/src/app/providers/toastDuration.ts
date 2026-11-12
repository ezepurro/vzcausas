import type { Toast } from './ToastContext'

/**
 * Cuánto queda a la vista cada tipo de aviso.
 *
 * Un error dura el doble: suele traer el mensaje del servidor, de dos
 * renglones, y es el que hay que leer para saber qué corregir. Antes todos
 * duraban 2 segundos y un error no se llegaba a leer (H-04).
 *
 * Vive aparte de `ToastProvider.tsx` para que ese archivo exporte sólo el
 * componente (`react/only-export-components`).
 */
export const TOAST_DURATION_MS: Record<Toast['kind'], number> = {
    success: 4000,
    info: 4000,
    error: 8000,
}
