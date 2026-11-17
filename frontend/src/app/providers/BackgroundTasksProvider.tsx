import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isApiError } from '@/shared/api/ApiError'
import { useAuth } from './AuthContext'
import { BackgroundTasksContext } from './BackgroundTasksContext'
import type {
    BackgroundTask,
    BackgroundTaskKind,
    BackgroundTasksValue,
    StartTaskRequest,
    TaskHandlerLoaders,
    TaskKindHandler,
    TaskOutcome,
} from './BackgroundTasksContext'
import { readBackgroundTasks, writeBackgroundTasks } from './backgroundTaskStorage'
import { TASK_POLL_MS } from './backgroundTaskTiming'

let nextId = 0
const newTaskId = () => `${Date.now().toString(36)}-${(nextId++).toString(36)}`

/**
 * Lleva las tareas en segundo plano de quien tiene la sesión abierta.
 *
 * Una tarea se sigue de dos formas:
 *
 * 1. **Con el pedido en vuelo**: cuando responde, el manejador de su clase
 *    dice cómo terminó (`fromResponse`).
 * 2. **Preguntando al servidor** cada `TASK_POLL_MS` (`check`), cuando no hay
 *    pedido que esperar: después de un F5, cuando el pedido se cortó sin
 *    respuesta, o cuando la respuesta dice que sigue en curso. Si pasa
 *    `giveUpAfterMs` sin saberlo, queda `unconfirmed`.
 *
 * Va dentro de `AuthProvider`: cambia con la sesión. Al cerrarla quedan sin
 * tareas en memoria; si fue a pedido, `AuthProvider` además borra las
 * guardadas, y si se venció se conservan para cuando vuelva a entrar.
 */
export function BackgroundTasksProvider({ handlers, children }: { handlers: TaskHandlerLoaders; children: ReactNode }) {
    const { session } = useAuth()
    const userId = session?.user.id ?? null
    const queryClient = useQueryClient()

    const [owner, setOwner] = useState(userId)
    const [tasks, setTasks] = useState<BackgroundTask[]>(() => (userId === null ? [] : readBackgroundTasks(userId)))

    /* Otra sesión, otras tareas. Derivado en el render y no en un efecto: así
       no hay un render con las tarjetas del usuario anterior. */
    if (owner !== userId) {
        setOwner(userId)
        setTasks(userId === null ? [] : readBackgroundTasks(userId))
    }

    useEffect(() => {
        if (userId !== null) writeBackgroundTasks(userId, tasks)
    }, [userId, tasks])

    const tasksRef = useRef(tasks)
    useEffect(() => {
        tasksRef.current = tasks
    }, [tasks])

    /* ---------- manejadores, cargados cuando hacen falta ---------- */

    const [loaded, setLoaded] = useState<Partial<Record<BackgroundTaskKind, TaskKindHandler>>>({})
    const loading = useRef(new Map<BackgroundTaskKind, Promise<TaskKindHandler>>())

    const ensureHandler = useCallback((kind: BackgroundTaskKind): Promise<TaskKindHandler> => {
        let pending = loading.current.get(kind)
        if (!pending) {
            pending = handlers[kind]().then((handler) => {
                setLoaded((current) => ({ ...current, [kind]: handler }))
                return handler
            })
            /* Si no se pudo descargar, que el próximo intento lo vuelva a pedir. */
            pending.catch(() => loading.current.delete(kind))
            loading.current.set(kind, pending)
        }
        return pending
    }, [handlers])

    useEffect(() => {
        for (const task of tasks) void ensureHandler(task.kind).catch(() => {})
    }, [tasks, ensureHandler])

    /* ---------- cambios de estado ---------- */

    const settle = useCallback((id: string, outcome: TaskOutcome) => {
        setTasks((current) =>
            current.map((task) =>
                task.id === id && task.status === 'running'
                    ? {
                        ...task,
                        status: outcome.status,
                        result: outcome.status === 'done' ? outcome.result : null,
                        message: outcome.status === 'failed' ? outcome.message : null,
                    }
                    : task,
            ),
        )
    }, [])

    const giveUp = useCallback((id: string) => {
        setTasks((current) =>
            current.map((task) => (task.id === id && task.status === 'running' ? { ...task, status: 'unconfirmed' } : task)),
        )
    }, [])

    const dismiss = useCallback((id: string) => {
        setTasks((current) => current.filter((task) => task.id !== id))
    }, [])

    /* ---------- 1. con el pedido en vuelo ---------- */

    /** Las tareas que todavía esperan su pedido: no se le pregunta al servidor por ellas. */
    const live = useRef(new Set<string>())

    const start = useCallback((request: StartTaskRequest): string => {
        const task: BackgroundTask = {
            id: newTaskId(),
            kind: request.kind,
            subject: request.subject,
            params: request.params,
            startedAt: Date.now(),
            status: 'running',
            result: null,
            message: null,
        }
        setTasks((current) => [...current, task])
        live.current.add(task.id)

        void (async () => {
            let outcome: TaskOutcome | null
            try {
                const response = await request.work
                outcome = (await ensureHandler(task.kind)).fromResponse(response, task)
            } catch (error) {
                /* Sin respuesta no se sabe: el servidor pudo haberlo hecho
                   igual. Se sigue preguntando, en vez de darlo por fallido. */
                outcome = isApiError(error) && error.isNetworkError
                    ? null
                    : { status: 'failed', message: isApiError(error) ? error.message : 'Ocurrió un error inesperado.' }
            } finally {
                live.current.delete(task.id)
            }
            if (outcome) settle(task.id, outcome)
        })()

        return task.id
    }, [ensureHandler, settle])

    /* ---------- 2. preguntando al servidor ---------- */

    const checking = useRef(new Set<string>())

    const poll = useCallback(() => {
        for (const task of tasksRef.current) {
            if (task.status !== 'running' || live.current.has(task.id) || checking.current.has(task.id)) continue
            checking.current.add(task.id)
            void (async () => {
                let handler: TaskKindHandler | undefined
                try {
                    handler = await ensureHandler(task.kind)
                    const outcome = await handler.check(task, queryClient)
                    if (outcome) {
                        settle(task.id, outcome)
                        return
                    }
                } catch (error) {
                    /* La causa ya no existe (se dio de baja): no hay qué esperar. */
                    if (isApiError(error) && error.isNotFound) {
                        settle(task.id, { status: 'failed', message: error.message })
                        return
                    }
                    /* Cualquier otro error: se vuelve a preguntar en la próxima vuelta. */
                } finally {
                    checking.current.delete(task.id)
                }
                if (handler && Date.now() - task.startedAt > handler.giveUpAfterMs) giveUp(task.id)
            })()
        }
    }, [ensureHandler, queryClient, settle, giveUp])

    const anyRunning = tasks.some((task) => task.status === 'running')

    useEffect(() => {
        if (!anyRunning) return
        poll()
        const timer = setInterval(poll, TASK_POLL_MS)
        return () => clearInterval(timer)
    }, [anyRunning, poll])

    /* Cerrar o recargar la pestaña con algo en curso: el aviso del navegador.
       Un F5 se recupera, pero cerrar la pestaña pierde la tarjeta. */
    useEffect(() => {
        if (!anyRunning) return
        const warn = (event: BeforeUnloadEvent) => {
            event.preventDefault()
            event.returnValue = ''
        }
        window.addEventListener('beforeunload', warn)
        return () => window.removeEventListener('beforeunload', warn)
    }, [anyRunning])

    const handlerFor = useCallback((kind: BackgroundTaskKind) => loaded[kind], [loaded])

    const value = useMemo<BackgroundTasksValue>(
        () => ({ tasks, start, dismiss, handlerFor }),
        [tasks, start, dismiss, handlerFor],
    )

    return <BackgroundTasksContext.Provider value={value}>{children}</BackgroundTasksContext.Provider>
}
