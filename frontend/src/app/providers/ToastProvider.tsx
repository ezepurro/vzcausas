import { useState } from 'react'
import type { ReactNode } from 'react'
import { ToastContext } from './ToastContext'
import type { Toast, ShowToast } from './ToastContext'
import './ToastProvider.css'

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const show: ShowToast = (kind, message) => {
        const id = nextId++
        setToasts((current) => [...current, { id, kind, message }].slice(-2))
        setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 2000)
    }

    return (
        <ToastContext.Provider value={show}>
        {children}
            <div className="toasts" role="region" aria-live="polite">
            {toasts.map((t) => (
                <div key={t.id} className={`toast toast--${t.kind}`} role="alert">
                    {/* Círculo con el símbolo. Es decorativo (aria-hidden):
                        el estado ya lo dice el texto del mensaje, y el
                        contenedor es role="alert". */}
                    <span className="toast__icon" aria-hidden="true">
                        {t.kind === 'success' ? '✓' : t.kind === 'error' ? '!' : 'i'}
                    </span>
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
