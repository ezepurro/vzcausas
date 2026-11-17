import { useState } from 'react'
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
 * persona la cierra. Mientras corre no se cierra: es la única señal de que
 * algo sigue pasando.
 *
 * Va en `AppLayout` y no junto al proveedor: sus botones navegan, y fuera del
 * router no se puede. Así además sólo se ven con la sesión abierta.
 */
export function BackgroundTaskTray() {
    const { tasks, handlerFor, dismiss } = useBackgroundTasks()
    if (tasks.length === 0) return null

    return (
        <section className="vz-tasks" aria-label="Tareas en segundo plano">
            {tasks.map((task) => {
                const handler = handlerFor(task.kind)
                return handler
                    ? <TaskCard key={task.id} task={task} view={handler.describe(task)} onClose={() => dismiss(task.id)} />
                    : null
            })}
        </section>
    )
}

function TaskCard({ task, view, onClose }: {
    task: BackgroundTask
    view: TaskView
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
                {view.actions.length > 0 && (
                    <div className="vz-task__actions">
                        {view.actions.map((action) => <TaskActionButton key={action.label} action={action} />)}
                    </div>
                )}
            </div>
            {!running && (
                <button type="button" className="vz-task__close" onClick={onClose} aria-label={`Cerrar aviso: ${view.title}`}>
                    <span aria-hidden="true">×</span>
                </button>
            )}
        </div>
    )
}

function TaskActionButton({ action }: { action: TaskAction }) {
    const toast = useToast()
    const [busy, setBusy] = useState(false)

    if (action.to) {
        return <Link className="vz-btn vz-btn--secondary vz-btn--sm" to={action.to}>{action.label}</Link>
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
