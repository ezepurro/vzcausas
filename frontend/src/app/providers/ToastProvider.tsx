import { useState } from 'react'
import type { ReactNode } from 'react'
import { ToastContext } from './ToastContext'
import type { Toast as TipoToast, ShowToast } from './ToastContext'

let nextId = 0

/**
 * Muestra los avisos de la app. Cualquier pantalla pide uno con useToast()
 * y no se preocupa por dónde se dibuja.
 *
 * El aspecto lo pone el <Toast> del sistema de diseño (clase .vz-toast):
 * una sola barra oscura abajo y al centro de la pantalla. Por eso acá se
 * muestra UNO solo, el último pedido, y no una pila: en el prototipo el
 * aviso está centrado y dos superpuestos quedarían uno encima del otro.
 *
 * El `kind` ('success' | 'error' | 'info') se sigue recibiendo y guardando
 * porque las pantallas ya lo mandan, pero el diseño todavía no distingue
 * el aviso de error del de éxito. Cuando el prototipo defina esa variante,
 * se agrega el tono al <Toast> y se lee de acá.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toast, setToast] = useState<TipoToast | null>(null)

    const show: ShowToast = (kind, message) => {
        const id = nextId++
        setToast({ id, kind, message })
        // Se limpia sólo si no llegó otro aviso encima mientras tanto.
        setTimeout(() => setToast((actual) => (actual?.id === id ? null : actual)), 2000)
    }

    return (
        <ToastContext.Provider value={show}>
            {children}
            {toast && <Toast mensaje={toast.message} />}
        </ToastContext.Provider>
    )
}