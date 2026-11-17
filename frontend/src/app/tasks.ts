import type { TaskHandlerLoaders } from '@/app/providers/BackgroundTasksContext'

/**
 * Quién sabe manejar cada clase de tarea en segundo plano.
 *
 * Con `import()`, como las pantallas (`router/pages.ts`): el módulo de causas
 * no se descarga antes del login. Se carga cuando aparece una tarea suya, y
 * para entonces casi siempre ya está, porque la tarea la empezó una de sus
 * pantallas. Después de un F5 en otra sección, se descarga ahí.
 */
export const TASK_HANDLERS: TaskHandlerLoaders = {
    'cases.caseFile': () => import('@/features/cases').then((m) => m.CASE_FILE_TASK),
    'cases.folder': () => import('@/features/cases').then((m) => m.CASE_FOLDER_TASK),
}
