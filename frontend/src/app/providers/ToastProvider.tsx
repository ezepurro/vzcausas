import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ToastContext } from './ToastContext'
import type { Toast, ShowToast } from './ToastContext'
import { TOAST_DURATION_MS } from './toastDuration'

let nextId = 0

/** Cuántos avisos se ven a la vez: el tercero saca al más viejo. */
const MAX_TOASTS = 2

const SYMBOL: Record<Toast['kind'], string> = { success: '✓', error: '!', info: 'i' }

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    /* Mientras el mouse está sobre la pila o el foco está adentro, ningún
       aviso se va: no se le saca de abajo a quien lo está leyendo o está por
       cerrarlo. */
    const [hovered, setHovered] = useState(false)
    const [focused, setFocused] = useState(false)
    const paused = hovered || focused

    const show = useCallback<ShowToast>((kind, message) => {
        const id = nextId++
        setToasts((current) => [...current, { id, kind, message }].slice(-MAX_TOASTS))
    }, [])

    const dismiss = useCallback((id: number) => {
        setToasts((current) => current.filter((t) => t.id !== id))
    }, [])

    /* Cerrar a mano suelta la pausa: el botón desaparece con el mouse y el
       foco encima, así que ni `mouseleave` ni `blur` llegan, y la pausa
       quedaba prendida para el aviso siguiente. */
    const close = useCallback((id: number) => {
        dismiss(id)
        setHovered(false)
        setFocused(false)
    }, [dismiss])

    return (
        <ToastContext.Provider value={show}>
            {children}
            {/* Sin `aria-live` acá: cada aviso ya trae su rol (`alert` o
                `status`), y una región viva alrededor lo hacía anunciar dos
                veces. */}
            <div
                className="vz-toasts"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            >
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} paused={paused} onExpire={dismiss} onClose={close} />
                ))}
            </div>
        </ToastContext.Provider>
    )
}

interface ToastItemProps {
    toast: Toast
    paused: boolean
    /** pasó su tiempo */
    onExpire: (id: number) => void
    /** lo cerraron con el botón */
    onClose: (id: number) => void
}

/**
 * Un aviso con su propio temporizador. Vive en el componente y no en `show`
 * para que se cancele solo: al cerrarlo a mano, al pausarlo o al desmontarse.
 * Al salir de la pausa vuelve a contar desde cero.
 */
function ToastItem({ toast, paused, onExpire, onClose }: ToastItemProps) {
    const { id, kind, message } = toast

    useEffect(() => {
        if (paused) return
        const timer = setTimeout(() => onExpire(id), TOAST_DURATION_MS[kind])
        return () => clearTimeout(timer)
    }, [id, kind, paused, onExpire])

    return (
        /* Un error interrumpe (`alert`); un "guardado" o una baja se anuncian
           cuando el lector de pantalla termina lo que estaba diciendo
           (`status`). */
        <div className={`vz-toast vz-toast--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
            {/* Círculo con el símbolo. Es decorativo (aria-hidden): el estado
                ya lo dice el texto del mensaje. */}
            <span className="vz-toast__icon" aria-hidden="true">{SYMBOL[kind]}</span>
            <p className="vz-toast__message">{message}</p>
            <button
                type="button"
                className="vz-toast__close"
                onClick={() => onClose(id)}
                aria-label="Cerrar aviso"
            >
                <span aria-hidden="true">×</span>
            </button>
        </div>
    )
}
