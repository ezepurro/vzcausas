import { createContext, useContext } from 'react'
import type { QueryClient } from '@tanstack/react-query'

/**
 * Tareas en segundo plano: lo que tarda (generar el expediente, crear la
 * carpeta en Drive) sigue mientras la persona trabaja en otra pantalla, y una
 * tarjeta le avisa cómo terminó.
 *
 * Vive en `app/providers/`, como `useToast()`, porque la usan los módulos y el
 * marco de la aplicación. Qué es cada tarea y cómo se pregunta por ella lo
 * sabe su módulo (`TaskKindHandler`); acá sólo se lleva la cuenta.
 */

/** Cada clase de tarea. El prefijo es el módulo que la sabe manejar. */
export type BackgroundTaskKind = 'cases.caseFile' | 'cases.folder'

/** Datos de una tarea. Planos, porque se guardan en `sessionStorage`. */
export type TaskData = Record<string, string | number | null>

/**
 * - `running`: el servidor la está haciendo, o todavía no se sabe.
 * - `done` y `failed`: terminó, bien o mal.
 * - `unconfirmed`: se dejó de preguntar sin respuesta. Puede haber terminado.
 */
export type BackgroundTaskStatus = 'running' | 'done' | 'failed' | 'unconfirmed'

export interface BackgroundTask {
    id: string
    kind: BackgroundTaskKind
    /** De qué es: la carátula de la causa. */
    subject: string
    /** Lo que hace falta para volver a preguntar por ella (la causa, la versión anterior). */
    params: TaskData
    /** Milisegundos desde 1970, del reloj del navegador. */
    startedAt: number
    status: BackgroundTaskStatus
    /** Con `done`: lo que dejó (el documento, el enlace de la carpeta). */
    result: TaskData | null
    /** Con `failed`: el mensaje del servidor. */
    message: string | null
}

export type TaskOutcome =
    | { status: 'done'; result: TaskData }
    | { status: 'failed'; message: string }

/** Un botón de la tarjeta: lleva a una pantalla, abre otra pestaña o hace algo. */
export interface TaskAction {
    label: string
    /** Ruta de la aplicación. */
    to?: string
    /** Enlace externo, en otra pestaña (Drive). */
    href?: string
    run?: () => Promise<void>
}

/** Lo que muestra la tarjeta. */
export interface TaskView {
    title: string
    detail: string
    actions: TaskAction[]
}

/**
 * Lo que sabe el módulo dueño de una clase de tarea. Lo publica en su
 * `index.ts` y `app/tasks.ts` lo carga recién cuando hace falta.
 */
export interface TaskKindHandler {
    /** Desde que empezó, cuánto se sigue preguntando antes de pasar a `unconfirmed`. */
    giveUpAfterMs: number
    /**
     * Cómo terminó, según la respuesta del pedido original. `null` si la
     * respuesta dice que sigue en curso (una carpeta en `CREATING`).
     */
    fromResponse: (response: unknown, task: BackgroundTask) => TaskOutcome | null
    /**
     * Le pregunta al servidor cómo va, sin repetir el pedido. `null` si sigue
     * en curso. Al terminar, deja la caché al día.
     */
    check: (task: BackgroundTask, queryClient: QueryClient) => Promise<TaskOutcome | null>
    describe: (task: BackgroundTask) => TaskView
}

export type TaskHandlerLoaders = Record<BackgroundTaskKind, () => Promise<TaskKindHandler>>

export interface StartTaskRequest {
    kind: BackgroundTaskKind
    subject: string
    params: TaskData
    /** El pedido ya lanzado. */
    work: Promise<unknown>
}

export interface BackgroundTasksValue {
    /** Las de quien tiene la sesión abierta, en el orden en que empezaron. */
    tasks: BackgroundTask[]
    /** Empieza a seguir un pedido. Devuelve el id de la tarea. */
    start: (request: StartTaskRequest) => string
    /**
     * Saca la tarjeta. Lo usa la pantalla que pidió la tarea si sigue a la
     * vista cuando termina: el resultado ya lo muestra ella.
     */
    dismiss: (id: string) => void
    /** El manejador de esa clase, si ya se cargó. */
    handlerFor: (kind: BackgroundTaskKind) => TaskKindHandler | undefined
}

export const BackgroundTasksContext = createContext<BackgroundTasksValue | null>(null)

export function useBackgroundTasks(): BackgroundTasksValue {
    const value = useContext(BackgroundTasksContext)
    if (value === null) throw new Error('useBackgroundTasks() must be used inside <BackgroundTasksProvider>')
    return value
}
