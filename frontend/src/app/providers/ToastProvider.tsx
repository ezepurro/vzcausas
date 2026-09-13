import { useState } from 'react'
import type { ReactNode } from 'react'
import { ToastContext } from './ToastContext'
import type { Toast, ShowToast } from './ToastContext'

let nextId = 0

/**
 * Muestra los avisos de la app. Cualquier pantalla pide uno con
 * useToast() y no se preocupa por dónde se dibuja.
 *
 * Sin estilos todavía: el marcado tiene los nombres de clase puestos
 * (toasts, toast, toast--success, ...) pero no hay ningún CSS que los
 * defina, así que por ahora los avisos se ven como texto suelto abajo de
 * la página. Cuando esté la hoja de estilos, se escriben esas clases y
 * este archivo no se toca.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const show: ShowToast = (kind, message) => {
        const id = nextId++
        // slice(-2): nunca más de dos avisos a la vez, para no tapar la
        // pantalla. El más viejo se cae cuando entra uno nuevo.
        setToasts((current) => [...current, { id, kind, message }].slice(-2))
        setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 2000)
    }

    return (
        <ToastContext.Provider value={show}>
            {children}

            {/* aria-live="polite": el lector de pantalla anuncia el aviso
                cuando termina de leer lo que estaba leyendo, sin interrumpir. */}
            <div className="toasts" role="region" aria-live="polite">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast toast--${t.kind}`} role="alert">
                        <p className="toast__message">{t.message}</p>
                        <button
                            type="button"
                            className="toast__close"
                            onClick={() => setToasts((c) => c.filter((x) => x.id !== t.id))}
                            aria-label="Cerrar aviso"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}
