import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
    useBackgroundTasks,
    type BackgroundTask,
    type TaskAction,
    type TaskView,
} from '@/app/providers/BackgroundTasksContext'
import { useToast } from '@/app/providers/ToastContext'
import { isApiError } from '@/shared/api/ApiError'
import { Button } from '@/shared/components/ui'

const SYMBOL: Record<Exclude<BackgroundTask['status'], 'running'>, string> = {
    done: '✓',
    failed: '!',
    unconfirmed: '?',
}

/**
 * Las tarjetas de las tareas en segundo plano, abajo a la derecha.
 *
 * A diferencia de un aviso (`ToastProvider`), una tarjeta no se va sola: dice
 * qué está en curso y, al terminar, queda con el resultado hasta que la
 * persona la cierra. Mientras espera la respuesta de su pedido no se cierra:
 * es la única señal de que algo sigue pasando. Después de un F5 sí, porque
 * sólo queda preguntar y la persona puede no querer esperar.
 *
 * Mientras corre muestra cuánto lleva ("Hace 1 min"), así se ve que no está
 * trabada.
 *
 * Va en `AppLayout` y no junto al proveedor: sus botones navegan, y fuera del
 * router no se puede. Así además sólo se ven con la sesión abierta.
 */
export function BackgroundTaskTray() {
    const { tasks, handlerFor, dismiss, isWaitingForResponse } = useBackgroundTasks()
    const now = useNow(tasks.some((task) => task.status === 'running'))
    if (tasks.length === 0) return null

    return (
        <section className="vz-tasks" aria-label="Tareas en segundo plano">
            {tasks.map((task) => {
                const handler = handlerFor(task.kind)
                return handler
                    ? (
                        <TaskCard
                            key={task.id}
                            task={task}
                            view={handler.describe(task)}
                            closable={task.status !== 'running' || !isWaitingForResponse(task.id)}
                            now={now}
                            onClose={() => dismiss(task.id)}
                        />
                    )
                    : null
            })}
        </section>
    )
}

/** La hora, renovada cada `ELAPSED_REFRESH_MS` mientras haya algo en curso. */
function useNow(active: boolean): number {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        if (!active) return
        /* Sin renovar acá: hasta el primer tic, una tarea recién empezada da
           "Hace menos de un minuto" igual (`elapsedText` no baja de cero). */
        const timer = setInterval(() => setNow(Date.now()), ELAPSED_REFRESH_MS)
        return () => clearInterval(timer)
    }, [active])
    return now
}

const ELAPSED_REFRESH_MS = 10_000

/** "Hace menos de un minuto", "Hace 1 min", "Hace 4 min". */
function elapsedText(startedAt: number, now: number): string {
    const minutes = Math.floor(Math.max(0, now - startedAt) / 60_000)
    return minutes === 0 ? 'Hace menos de un minuto' : `Hace ${minutes} min`
}

function TaskCard({ task, view, closable, now, onClose }: {
    task: BackgroundTask
    view: TaskView
    closable: boolean
    now: number
    onClose: () => void
}) {
    const { status } = task
    const running = status === 'running'

    return (
        <div className={`vz-task vz-task--${status}`} role="status" aria-busy={running}>
            <span className="vz-task__icon" aria-hidden="true">
                {status === 'running' ? <span className="vz-task__spinner" /> : SYMBOL[status]}
            </span>
            <div className="vz-task__body">
                <p className="vz-task__title">{view.title}</p>
                <p className="vz-task__detail">{view.detail}</p>
                {running && <p className="vz-task__elapsed">{elapsedText(task.startedAt, now)}</p>}
                {view.actions.length > 0 && (
                    <div className="vz-task__actions">
                        {view.actions.map((action) => (
                            <TaskActionButton key={action.label} action={action} onClose={onClose} />
                        ))}
                    </div>
                )}
            </div>
            {closable && (
                <button type="button" className="vz-task__close" onClick={onClose} aria-label={`Cerrar aviso: ${view.title}`}>
                    <span aria-hidden="true">×</span>
                </button>
            )}
        </div>
    )
}

function TaskActionButton({ action, onClose }: { action: TaskAction; onClose: () => void }) {
    const toast = useToast()
    const [busy, setBusy] = useState(false)

    if (action.to) {
        return (
            <Link
                className={`vz-btn vz-btn--${action.closesTask ? 'primary' : 'secondary'} vz-btn--sm`}
                to={action.to}
                state={action.state}
                onClick={action.closesTask ? onClose : undefined}
            >
                {action.label}
            </Link>
        )
    }
    if (action.href) {
        return (
            <a className="vz-btn vz-btn--secondary vz-btn--sm" href={action.href} target="_blank" rel="noreferrer">
                {action.label}
            </a>
        )
    }

    async function run() {
        if (!action.run) return
        setBusy(true)
        try {
            await action.run()
        } catch (error) {
            toast('error', isApiError(error) ? error.message : 'Ocurrió un error inesperado.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <Button size="sm" disabled={busy} onClick={() => void run()}>
            {busy ? `${action.label}…` : action.label}
        </Button>
    )
}
