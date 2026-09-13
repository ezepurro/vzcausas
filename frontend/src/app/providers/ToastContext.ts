import { createContext, useContext } from 'react'

/**
 * `info` es para acciones que salieron bien pero que no son un logro:
 * lo típico es una eliminación. Anunciar "2 proveedores eliminados" en
 * verde de éxito se lee raro — el verde promete que algo se creó o se
 * guardó. `info` usa un gris neutro y el mismo formato.
 */
export type Toast = { id: number; kind: 'success' | 'error' | 'info'; message: string }
export type ShowToast = (kind: Toast['kind'], message: string) => void

export const ToastContext = createContext<ShowToast | null>(null)

export function useToast(): ShowToast {
    const show = useContext(ToastContext)
    if (show === null) throw new Error('useToast() must be used inside <ToastProvider>')
    return show
}