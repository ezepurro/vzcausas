import type { QueryClient } from '@tanstack/react-query'
import type {
    BackgroundTask,
    TaskAction,
    TaskData,
    TaskKindHandler,
    TaskOutcome,
    TaskView,
} from '@/app/providers/BackgroundTasksContext'
import type { CaseFolder } from '@/features/cases/types/case'
import type { CaseDocument } from '@/features/cases/types/caseDocument'
import type {
    GeneratedCaseFile,
    ReadyCaseFile,
    ReadyCaseFileNavigationState,
} from '@/features/cases/types/caseFile'
import { getCase, getCaseDocuments } from './cases.api'
import { casesKeys } from './cases.keys'

/**
 * Las dos tareas en segundo plano de la causa: generar el expediente (HU25) y
 * crear la carpeta en Drive (HU39). Las sigue `BackgroundTasksProvider`; acá
 * está lo que sólo sabe este módulo: cómo leer la respuesta, cómo preguntar al
 * servidor sin repetir el pedido y qué dice la tarjeta.
 *
 * Va en `api/` porque habla con el servidor, aunque también arme los textos de
 * la tarjeta: separarlo dejaría dos mitades de lo mismo.
 */

const caseIdOf = (task: BackgroundTask) => Number(task.params.caseId)

const viewCase = (task: BackgroundTask): TaskAction => ({ label: 'Ver causa', to: `/causas/${caseIdOf(task)}` })

/* ---------------- expediente ---------------- */

/**
 * Lo que necesita la tarea del expediente: la causa y la versión más alta que
 * había al pedirlo. Después de un F5 se busca en "Documentación" una versión
 * más nueva: no se compara por fecha porque el reloj del navegador y el del
 * servidor pueden no coincidir.
 */
export function caseFileTaskParams(caseId: number, documents: CaseDocument[]) {
    const previousVersion = Math.max(0, ...documents.map((doc) => doc.caseFile?.version ?? 0))
    return { caseId, previousVersion }
}

/**
 * Lo que guarda la tarea al terminar: lo que necesita el diálogo "Expediente
 * generado" (`ReadyCaseFile`). `partCount` es `null` si se encontró en
 * "Documentación" (después de un F5): la lista no dice de cuántas partes es.
 */
function caseFileDone(doc: CaseDocument, version: number, partCount: number | null): TaskOutcome {
    return {
        status: 'done',
        result: { documentId: doc.id, name: doc.name, version, partCount, sizeBytes: doc.sizeBytes },
    }
}

function readyCaseFileOf(result: TaskData): ReadyCaseFile {
    const optionalNumber = (value: TaskData[string]) => (typeof value === 'number' ? value : null)
    return {
        document: { id: String(result.documentId), name: String(result.name) },
        version: Number(result.version),
        partCount: optionalNumber(result.partCount),
        sizeBytes: optionalNumber(result.sizeBytes),
    }
}

export const CASE_FILE_TASK: TaskKindHandler = {
    /* El pedido espera hasta 2 minutos (`CASE_FILE_TIMEOUT_MS`); se le da un
       minuto más al servidor antes de decir que está demorando. */
    giveUpAfterMs: 3 * 60_000,

    fromResponse(response) {
        const file = response as GeneratedCaseFile
        return caseFileDone(file.document, file.version, file.parts.length)
    },

    async check(task, queryClient: QueryClient) {
        const caseId = caseIdOf(task)
        const previous = Number(task.params.previousVersion ?? 0)
        const { documents } = await getCaseDocuments(caseId)
        const found = documents.find((doc) => (doc.caseFile?.version ?? 0) > previous)
        if (!found?.caseFile) return null
        void queryClient.invalidateQueries({ queryKey: casesKeys.documents(caseId) })
        return caseFileDone(found, found.caseFile.version, null)
    },

    describe(task): TaskView {
        switch (task.status) {
            case 'running':
                return {
                    title: 'Generando expediente',
                    detail: `${task.subject}. Puede tardar unos minutos: te avisamos acá cuando esté listo.`,
                    actions: [viewCase(task)],
                }
            case 'done': {
                const ready = readyCaseFileOf(task.result ?? {})
                const state: ReadyCaseFileNavigationState = { readyCaseFile: ready }
                return {
                    title: 'Expediente listo',
                    detail: `Versión ${ready.version} · ${task.subject}. Ya está en la documentación de la causa.`,
                    actions: [
                        /* Lleva a "Generar expediente" con el diálogo "Expediente
                           generado" abierto: ahí se descarga o se imprime, igual
                           que si la persona se hubiera quedado esperando. */
                        {
                            label: 'Ver expediente',
                            to: `/causas/${caseIdOf(task)}/expediente`,
                            state,
                            closesTask: true,
                        },
                        viewCase(task),
                    ],
                }
            }
            case 'failed':
                return {
                    title: 'No se pudo generar el expediente',
                    detail: `${task.subject}. ${task.message ?? ''}`.trim(),
                    actions: [viewCase(task)],
                }
            case 'unconfirmed':
                /* Los textos son para abogados: qué hacer, no cómo funciona por dentro. */
                return {
                    title: 'El expediente está demorando',
                    detail: `${task.subject}. Revisá la documentación de la causa: si ya aparece la versión nueva, está listo. Si no, podés volver a generarlo.`,
                    actions: [viewCase(task)],
                }
        }
    },
}

/* ---------------- carpeta en Drive ---------------- */

const FOLDER_FAILED = 'Drive no respondió. Podés volver a intentarlo desde la causa.'

/** `null` mientras se sigue creando (`CREATING`). */
function folderOutcome(folder: CaseFolder | null): TaskOutcome | null {
    switch (folder?.status) {
        case 'CREATED':
            return { status: 'done', result: { url: folder.url } }
        case 'CREATING':
            return null
        default:
            return { status: 'failed', message: FOLDER_FAILED }
    }
}

export const CASE_FOLDER_TASK: TaskKindHandler = {
    /* El servidor espera un rato y, si Drive no contestó, sigue solo (V4 §4,
       "Carpeta de la causa"). Pasado este tiempo la tarjeta del detalle sigue
       mostrando cómo va. */
    giveUpAfterMs: 3 * 60_000,

    fromResponse(response) {
        return folderOutcome(response as CaseFolder)
    },

    async check(task, queryClient: QueryClient) {
        const caseId = caseIdOf(task)
        const c = await getCase(caseId)
        const outcome = folderOutcome(c.folder)
        if (outcome) queryClient.setQueryData(casesKeys.detail(caseId), c)
        return outcome
    },

    describe(task): TaskView {
        switch (task.status) {
            case 'running':
                return {
                    title: 'Creando carpeta en Drive',
                    detail: `${task.subject}. Puede tardar unos minutos: te avisamos acá cuando esté lista.`,
                    actions: [viewCase(task)],
                }
            case 'done': {
                const url = task.result?.url
                return {
                    title: 'Carpeta creada',
                    detail: task.subject,
                    actions: [...(typeof url === 'string' ? [{ label: 'Abrir en Drive', href: url }] : []), viewCase(task)],
                }
            }
            case 'failed':
                return {
                    title: 'No se pudo crear la carpeta',
                    detail: `${task.subject}. ${task.message ?? ''}`.trim(),
                    actions: [viewCase(task)],
                }
            case 'unconfirmed':
                return {
                    title: 'La carpeta está demorando',
                    detail: `${task.subject}. Drive todavía no terminó de crearla. Vas a verla en la causa cuando esté lista.`,
                    actions: [viewCase(task)],
                }
        }
    },
}
