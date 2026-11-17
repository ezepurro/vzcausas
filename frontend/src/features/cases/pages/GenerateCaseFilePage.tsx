import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useBackgroundTasks } from '@/app/providers/BackgroundTasksContext'
import { useStillShowing } from '@/shared/hooks/useStillShowing'
import { caseFileTaskParams } from '@/features/cases/api/caseTasks'
import { usePageTitle } from '@/shared/hooks/usePageTitle'
import { useCan } from '@/app/access/useCan'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { useToast } from '@/app/providers/ToastContext'
import { useGoBack } from '@/app/router/useGoBack'
import { caseOperation } from '@/features/cases/utils/responsibleLawyer'
import { isApiError } from '@/shared/api/ApiError'
import { Breadcrumbs, LoadError, PageHeader, Panel, type BreadcrumbItem } from '@/shared/components/ui'
import { useCase } from '@/features/cases/api/useCase'
import { useCaseCover } from '@/features/cases/api/useCaseCover'
import { useCaseEdit } from '@/features/cases/api/useCaseEdit'
import { useCaseDocuments } from '@/features/cases/api/useCaseDocuments'
import { useCreateCaseFile } from '@/features/cases/api/useCreateCaseFile'
import { useDownloadCaseDocument } from '@/features/cases/api/useDownloadCaseDocument'
import { CaseEditForm } from '@/features/cases/components/CaseEditForm'
import { CaseFileCoverPanel } from '@/features/cases/components/CaseFileCoverPanel'
import { CaseFileDocumentsPanel } from '@/features/cases/components/CaseFileDocumentsPanel'
import { CaseFileReadyModal } from '@/features/cases/components/CaseFileReadyModal'
import { CaseFileResultAside } from '@/features/cases/components/CaseFileResultAside'
import { CaseDetailSkeleton } from '@/features/cases/components/CaseSkeletons'
import { CoverPreviewModal } from '@/features/cases/components/CoverPreviewModal'
import {
    NO_DOCUMENTS_MESSAGE,
    validateCaseFile,
    type CaseFileFormErrors,
} from '@/features/cases/schemas/caseFile.schema'
import type { Case } from '@/features/cases/types/case'
import type { CaseFileFormValues, FileDisposition, GeneratedCaseFile } from '@/features/cases/types/caseFile'
import {
    caseFileNamePreview,
    caseFileSummary,
    coverTemplateLabel,
    excludedDocuments,
    generatingMessage,
    initialSelection,
    moveItem,
    opposingPartyField,
    selectedDocuments,
    toCaseFileFormErrors,
    toCreateCaseFileBody,
    UNCONFIRMED_CASE_FILE_MESSAGE,
} from '@/features/cases/utils/caseFile'
import { sacLabel } from '@/features/cases/utils/sac'

/**
 * "Generar expediente" (HU25), en `/causas/:caseId/expediente`.
 *
 * Arma un único PDF: la carátula (HU24), que se genera con los datos de la
 * causa, y después los documentos de la carpeta que se elijan, en el orden de
 * la lista. Lo genera cualquier perfil (V5 §3.12): la ruta hereda el acceso
 * de `/causas` y no hay nada en `ACTION_ACCESS`.
 */
export function GenerateCaseFilePage() {
    const { caseId: param } = useParams()
    const caseId = Number(param)
    const navigate = useNavigate()
    const validId = Number.isInteger(caseId) && caseId > 0
    const query = useCase(caseId)
    const goBack = useGoBack(`/causas/${caseId}`)

    const c = query.data
    usePageTitle(c ? `Generar expediente · ${c.caption}` : 'Generar expediente')
    const crumbs: BreadcrumbItem[] = [
        { label: 'Causas', onClick: () => navigate('/causas') },
        { label: c ? sacLabel(c.sacNumber) : '…', onClick: c ? () => navigate(`/causas/${c.id}`) : undefined },
        { label: 'Generar expediente' },
    ]

    let body: ReactNode
    if (!validId) {
        body = <Empty title="No se encontró la causa" text="La dirección no corresponde a ninguna causa." />
    } else if (query.isPending) {
        body = <CaseDetailSkeleton />
    } else if (query.isError) {
        body = (
            <Panel>
                <LoadError title="No se pudo cargar la causa" error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
            </Panel>
        )
    } else {
        body = <CaseFileGenerator case={query.data} />
    }

    return (
        <>
            <Breadcrumbs items={crumbs} onBack={goBack} />
            {body}
        </>
    )
}

/** El diálogo "Expediente generado", con lo que ya se descargó o se mandó a imprimir. */
interface ReadyState {
    file: GeneratedCaseFile
    downloaded: boolean
    printed: boolean
}

/** La pantalla con la causa ya cargada. */
function CaseFileGenerator({ case: c }: { case: Case }) {
    const toast = useToast()

    /* Los documentos se leen de la carpeta: sin ella creada no hay pedido, y el
       expediente no se puede guardar (`422 CASE_FOLDER_NOT_AVAILABLE`). */
    const folderCreated = c.folder?.status === 'CREATED'
    const documentsQuery = useCaseDocuments(c.id, folderCreated)
    const documents = documentsQuery.data?.documents ?? []

    const [previewOpen, setPreviewOpen] = useState(false)
    const cover = useCaseCover(c.id, previewOpen)
    const createCaseFile = useCreateCaseFile(c.id)
    const download = useDownloadCaseDocument(c.id)
    /* "Modificá los datos de la causa" abre el mismo diálogo que el detalle
       (HU19), sin salir de la pantalla: al guardar, la carátula ya sale con
       los datos nuevos. Un abogado que no es el responsable genera el
       expediente pero no modifica la causa (D-110): a él no se le ofrece. */
    const edit = useCaseEdit(c)
    const { lawyer } = useCurrentUser()
    const operateAnyCase = useCan('cases.operateAnyCase')
    const { canOperate } = caseOperation(c, lawyer?.id ?? null, {
        operate: operateAnyCase,
        declarePrescription: false,
    })

    const [values, setValues] = useState<CaseFileFormValues>({ opposingParty: '', notes: '' })
    const [errors, setErrors] = useState<CaseFileFormErrors>({})
    /* `null` mientras nadie tocó la lista: vale la selección inicial, que se
       arma con los documentos cuando llegan, sin copiarlos a un estado. */
    const [selection, setSelection] = useState<string[] | null>(null)
    const [ready, setReady] = useState<ReadyState | null>(null)
    /** El último intento terminó sin respuesta: no se sabe si quedó guardado. */
    const [unconfirmed, setUnconfirmed] = useState(false)
    const generating = createCaseFile.isPending
    /* Antes la pantalla frenaba la salida mientras generaba ("Salir igual" /
       "Quedarme"). Desde que la generación es una tarea en segundo plano,
       salir no pierde el resultado; el aviso al cerrar o recargar la pestaña
       lo da `BackgroundTasksProvider`. */
    const tasks = useBackgroundTasks()
    const isHere = useStillShowing(c.id)

    const order = selection ?? initialSelection(documents)
    const selected = selectedDocuments(documents, order)
    const excluded = excludedDocuments(documents, order)
    const includable = excluded.filter((doc) => doc.convertibleToPdf)
    const selectedIds = selected.map((doc) => doc.id)

    const toggleAllLabel = !documentsQuery.isSuccess
        ? null
        : includable.length > 0
            ? 'Incluir todos'
            : selected.length > 0 ? 'Quitar todos' : null

    /** Cambia la lista y saca el error de la lista, si había. */
    function changeSelection(next: string[]) {
        setSelection(next)
        setErrors((current) => ({ ...current, documentIds: undefined }))
    }

    function toggleAll() {
        changeSelection(includable.length > 0 ? [...selectedIds, ...includable.map((doc) => doc.id)] : [])
    }

    function changeValue(key: keyof CaseFileFormValues, value: string) {
        setValues((current) => ({ ...current, [key]: value }))
        setErrors((current) => ({ ...current, [key]: undefined }))
    }

    /* La generación es una tarea en segundo plano (`api/caseTasks.ts`): la
       persona puede irse a otra pantalla y una tarjeta le avisa cómo terminó,
       aun después de un F5. Si sigue acá cuando termina, el resultado lo
       muestra esta pantalla y la tarjeta se saca.

       Un 400 con detalle se marca en su lugar; el resto (los 422 de carpeta
       o de conversión, el 502 de Drive) va al aviso con el mensaje del
       servidor. La selección y los textos quedan como estaban.

       Sin respuesta (corte por tiempo o red caída) no se dice "intentá de
       nuevo": el backend pudo haberlo guardado y un reintento dejaría otra
       versión. Queda un aviso fijo en "Resultado", se vuelve a leer la
       carpeta, y la tarjeta sigue preguntando hasta saberlo. */
    function generate() {
        const validation = validateCaseFile(values, selectedIds)
        setErrors(validation)
        if (Object.keys(validation).length > 0) return

        setUnconfirmed(false)
        const caseId = c.id
        const work = createCaseFile.mutateAsync(toCreateCaseFileBody(values, selectedIds, c.jurisdiction))
        const taskId = tasks.start({
            kind: 'cases.caseFile',
            subject: c.caption,
            params: caseFileTaskParams(caseId, documents),
            work,
        })

        work.then(
            (file) => {
                if (!isHere(caseId)) return
                tasks.dismiss(taskId)
                setReady({ file, downloaded: false, printed: false })
            },
            (error: unknown) => {
                if (!isHere(caseId)) return
                if (isApiError(error) && error.isNetworkError) {
                    setUnconfirmed(true)
                    void documentsQuery.refetch()
                    return
                }
                tasks.dismiss(taskId)
                if (!isApiError(error)) {
                    toast('error', 'Ocurrió un error inesperado.')
                    return
                }
                if (error.isValidation) {
                    const fieldErrors = toCaseFileFormErrors(error.details)
                    if (Object.keys(fieldErrors).length > 0) {
                        setErrors(fieldErrors)
                        return
                    }
                }
                toast('error', error.message)
            },
        )
    }

    function fetchCaseFile(disposition: FileDisposition) {
        if (!ready) return
        download.mutate(
            { document: ready.file.document, disposition },
            {
                onSuccess: () =>
                    setReady((current) =>
                        current && (disposition === 'attachment'
                            ? { ...current, downloaded: true }
                            : { ...current, printed: true })),
                onError: (error) => toast('error', isApiError(error) ? error.message : 'Ocurrió un error inesperado.'),
            },
        )
    }

    // Se llega desde el detalle: volver saca esta pantalla del historial.
    const goToCase = useGoBack(`/causas/${c.id}`)

    return (
        <>
            <PageHeader
                title="Generar expediente"
                sub={`${c.caption}. Se arma un único PDF: primero la carátula, que se genera con los datos de la causa, y después los documentos de la causa que elijas, en el orden que definas.`}
            />

            <div className="vz-split">
                {/* Mientras se genera, nada de lo que se mandó cambia en pantalla:
                    el `fieldset` deshabilita todos los controles de los dos paneles. */}
                <fieldset className="vz-casefile__panels" disabled={generating}>
                    <CaseFileCoverPanel
                        templateLabel={coverTemplateLabel(c.jurisdiction)}
                        partyField={opposingPartyField(c)}
                        values={values}
                        errors={errors}
                        onChange={changeValue}
                        onPreview={() => setPreviewOpen(true)}
                        onEditCase={canOperate ? edit.open : null}
                    />
                    <CaseFileDocumentsPanel
                        folderCreated={folderCreated}
                        loading={documentsQuery.isPending}
                        error={
                            documentsQuery.isError
                                ? isApiError(documentsQuery.error) ? documentsQuery.error.message : 'Ocurrió un error inesperado.'
                                : null
                        }
                        selected={selected}
                        excluded={excluded}
                        selectionError={errors.documentIds}
                        toggleAllLabel={toggleAllLabel}
                        onToggleAll={toggleAll}
                        onInclude={(id) => changeSelection([...selectedIds, id])}
                        onRemove={(id) => changeSelection(selectedIds.filter((selectedId) => selectedId !== id))}
                        onMove={(from, to) => changeSelection(moveItem(selectedIds, from, to))}
                        disabled={generating}
                    />
                </fieldset>
                <aside className="vz-split__aside">
                    <CaseFileResultAside
                        fileName={caseFileNamePreview(c, documents)}
                        parts={selected}
                        summary={caseFileSummary(selected)}
                        help={selected.length === 0 ? NO_DOCUMENTS_MESSAGE : 'Las partes se unen en el orden de la lista.'}
                        canGenerate={folderCreated && documentsQuery.isSuccess && selected.length > 0}
                        generating={generating}
                        progress={generatingMessage(selected.length)}
                        notice={unconfirmed ? UNCONFIRMED_CASE_FILE_MESSAGE : null}
                        onGenerate={generate}
                    />
                </aside>
            </div>

            {previewOpen && (
                <CoverPreviewModal
                    file={cover.data}
                    loading={cover.isPending}
                    error={
                        cover.isError
                            ? isApiError(cover.error) ? cover.error.message : 'Ocurrió un error inesperado.'
                            : null
                    }
                    onClose={() => setPreviewOpen(false)}
                />
            )}
            {edit.form && <CaseEditForm {...edit.form} />}
            {ready && (
                <CaseFileReadyModal
                    result={ready.file}
                    busy={download.isPending ? download.variables.disposition : null}
                    downloaded={ready.downloaded}
                    printed={ready.printed}
                    onDownload={() => fetchCaseFile('attachment')}
                    onPrint={() => fetchCaseFile('inline')}
                    onKeepEditing={() => setReady(null)}
                    onBackToCase={goToCase}
                />
            )}
        </>
    )
}

/** Error o causa inexistente, dentro de un panel. */
function Empty({ title, text }: { title: string; text?: string }) {
    return (
        <Panel>
            <div className="vz-empty">
                <div className="vz-empty__title">{title}</div>
                {text && <div className="vz-empty__text">{text}</div>}
            </div>
        </Panel>
    )
}
