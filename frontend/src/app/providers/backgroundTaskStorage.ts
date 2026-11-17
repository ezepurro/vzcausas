import type { BackgroundTask } from './BackgroundTasksContext'

/**
 * Las tareas en segundo plano se guardan en `sessionStorage` para que un F5 no
 * las pierda: al volver a cargar, la tarjeta reaparece y se vuelve a preguntar
 * al servidor cómo terminaron.
 *
 * `sessionStorage` y no `localStorage`, como los borradores
 * (`shared/lib/drafts.ts`): dura lo que la pestaña, y otra pestaña no ve los
 * avisos de esta. Cada lista lleva el id del usuario, así que otra persona que
 * entre en la misma pestaña no ve los del anterior. Al cerrar sesión a pedido
 * se borra (`AuthProvider`).
 *
 * Cualquier acceso puede fallar (modo privado, almacenamiento lleno): sin él,
 * las tareas se siguen igual, sólo que no sobreviven al F5.
 */

const STORAGE_KEY = 'vz-background-tasks'

interface Stored {
    userId: number
    tasks: BackgroundTask[]
}

export function readBackgroundTasks(userId: number): BackgroundTask[] {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY)
        if (raw === null) return []
        const stored = JSON.parse(raw) as Stored
        return stored.userId === userId && Array.isArray(stored.tasks) ? stored.tasks : []
    } catch {
        return []
    }
}

export function writeBackgroundTasks(userId: number, tasks: BackgroundTask[]): void {
    try {
        if (tasks.length === 0) sessionStorage.removeItem(STORAGE_KEY)
        else sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, tasks } satisfies Stored))
    } catch {
        /* Sin almacenamiento: no sobreviven al F5. */
    }
}

export function clearBackgroundTasks(): void {
    try {
        sessionStorage.removeItem(STORAGE_KEY)
    } catch {
        /* Nada que borrar. */
    }
}
