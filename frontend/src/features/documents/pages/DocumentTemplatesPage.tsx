import { useState } from 'react'
import { isApiError } from '@/shared/api/ApiError'
import { useToast } from '@/app/providers/ToastContext'
import { Button, Icon, PageHeader, LoadError } from '@/shared/components/ui'
import { JURISDICTION_LABELS, type Jurisdiction } from '@/features/legal-params'
import { useDocumentTemplates } from '@/features/documents/api/useDocumentTemplates'
import { useCreateDocumentTemplate } from '@/features/documents/api/useCreateDocumentTemplate'
import { useDownloadDocumentTemplate } from '@/features/documents/api/useDownloadDocumentTemplate'
import type { DocumentTemplate, DocumentTemplateFormValues } from '@/features/documents/types/documentTemplate'
import {
    isValid,
    validateDocumentTemplate,
    type DocumentTemplateErrors,
} from '@/features/documents/schemas/documentTemplate.schema'
import { toCreateDocumentTemplateBody } from '@/features/documents/utils/toCreateDocumentTemplateBody'
import { toFormErrors } from '@/features/documents/utils/toFormErrors'
import { countLabel, jurisdictionsPhrase, summarizeByJurisdiction } from '@/features/documents/utils/templateFormat'
import { JurisdictionCard } from '@/features/documents/components/JurisdictionCard'
import { DocumentTemplateCard } from '@/features/documents/components/DocumentTemplateCard'
import { DocumentTemplatesSkeleton } from '@/features/documents/components/DocumentTemplatesSkeleton'
import { DocumentTemplateFormModal } from '@/features/documents/components/DocumentTemplateFormModal'
import { usePageTitle } from '@/shared/hooks/usePageTitle'

/**
 * El catálogo es chico: se trae entero, en la vista general y en la de cada
 * fuero (V4 §3.10, "Cómo lo usa el prototipo"; D-57).
 */
const LIMIT = 100

type Modal = { kind: 'create' } | null

/** El fuero que se está mirando, o Penal desde la vista general (prototipo). */
function emptyForm(jurisdiction: Jurisdiction | null): DocumentTemplateFormValues {
    return { name: '', jurisdictions: [jurisdiction ?? 'CRIMINAL'], copyToNewCases: true, file: null }
}

export function DocumentTemplatesPage() {
    usePageTitle('Modelos formales')
    const toast = useToast()

    // null = vista general (tarjetas por fuero); un fuero = sus modelos.
    const [jurisdiction, setJurisdiction] = useState<Jurisdiction | null>(null)
    const [modal, setModal] = useState<Modal>(null)
    const [values, setValues] = useState<DocumentTemplateFormValues>(() => emptyForm(null))
    const [errors, setErrors] = useState<DocumentTemplateErrors>({})

    const query = useDocumentTemplates({ limit: LIMIT, jurisdiction: jurisdiction ?? undefined })
    const create = useCreateDocumentTemplate()
    const download = useDownloadDocumentTemplate()

    /* Al cambiar de vista, `keepPreviousData` dejaría a la vista los modelos
       de la anterior (los de todos los fueros) mientras llegan los nuevos. */
    const loading = query.isPending || query.isPlaceholderData
    const templates = query.data?.data ?? []

    //MODALES
    function openCreate() {
        setValues(emptyForm(jurisdiction))
        setErrors({})
        setModal({ kind: 'create' })
    }
    function closeModal() {
        setModal(null)
    }

    //ERRORES DEL SERVIDOR
    function handleCreateError(error: unknown) {
        if (!isApiError(error)) throw error

        // CA-34.9: el nombre repetido se marca en su campo.
        if (error.is('DOCUMENT_TEMPLATE_ALREADY_EXISTS')) {
            setErrors({ name: error.message })
            return
        }
        // CA-34.10
        if (error.is('FILE_TOO_LARGE')) {
            setErrors({ file: error.message })
            return
        }
        if (error.isValidation) {
            const fieldErrors = toFormErrors(error.details)
            if (!isValid(fieldErrors)) {
                setErrors(fieldErrors)
                return
            }
            // Un 400 sin ningún campo que marcar no puede quedar mudo.
        }
        // CA-34.7: Drive no responde (502). El modal queda abierto para reintentar.
        toast('error', error.message)
    }

    //ALTA DEL MODELO
    function submitCreate() {
        const found = validateDocumentTemplate(values)
        setErrors(found)
        if (!isValid(found)) return
        create.mutate(toCreateDocumentTemplateBody(values), {
            onSuccess: (template) => {
                toast('success', `Modelo "${template.name}" registrado para ${jurisdictionsPhrase(template.jurisdictions)}.`)
                closeModal()
            },
            onError: handleCreateError,
        })
    }

    //DESCARGA (CA-35.6)
    function downloadFile(template: DocumentTemplate) {
        download.mutate(template, {
            onError: (error) => {
                if (!isApiError(error)) throw error
                toast('error', error.message)
            },
        })
    }

    //ESTADOS DE LA CONSULTA
    function renderStatus() {
        if (loading) return <DocumentTemplatesSkeleton view={jurisdiction ? 'templates' : 'jurisdictions'} />
        return (
            <LoadError title="No se pudieron cargar los modelos" error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
        )
    }

    //VISTA GENERAL: UNA TARJETA POR FUERO (CA-35.4, CA-35.11)
    function renderOverview() {
        if (loading || query.isError) return renderStatus()
        return (
            <div className="vz-card-grid">
                {summarizeByJurisdiction(templates).map((summary) => (
                    <JurisdictionCard
                        key={summary.jurisdiction}
                        summary={summary}
                        onOpen={() => setJurisdiction(summary.jurisdiction)}
                    />
                ))}
            </div>
        )
    }

    //VISTA DE UN FUERO (CA-35.2, CA-35.3, CA-35.5, CA-35.10)
    function renderJurisdiction(current: Jurisdiction) {
        return (
            <>
                <div className="vz-template-bar">
                    <Button variant="secondary" size="sm" icon={<Icon name="back" />} onClick={() => setJurisdiction(null)}>
                        Fueros
                    </Button>
                    <span className="vz-template-bar__sep" aria-hidden="true">/</span>
                    <h2 className="vz-template-bar__title">Fuero {JURISDICTION_LABELS[current]}</h2>
                    {!loading && query.data && (
                        <span className="vz-template-bar__count">
                            {countLabel(query.data.pagination.totalItems, 'modelo', 'modelos')}
                        </span>
                    )}
                </div>

                {loading || query.isError ? renderStatus() : templates.length === 0 ? (
                    <div className="vz-empty">
                        <div className="vz-empty__text">Todavía no hay modelos en este fuero.</div>
                    </div>
                ) : (
                    // El orden alfabético lo da el backend (CA-35.3): acá no se ordena.
                    <div className="vz-card-grid">
                        {templates.map((template) => (
                            <DocumentTemplateCard
                                key={template.id}
                                template={template}
                                downloading={download.isPending && download.variables?.id === template.id}
                                onDownload={() => downloadFile(template)}
                            />
                        ))}
                    </div>
                )}

                <p className="vz-template-foot">
                    Lo que se copia a la carpeta de una causa es el archivo tal como estaba ese día: cada causa
                    conserva la versión con la que se abrió.
                </p>
            </>
        )
    }

    //PANTALLA
    return (
        <>
            <PageHeader
                eyebrow="Trabajo diario"
                title="Modelos formales"
                sub="Los escritos tipo del estudio, por fuero. Los que estén marcados para copiar se suman a la carpeta en Drive de cada causa nueva."
                actions={
                    <Button icon={<Icon name="plus" />} size="md" onClick={openCreate}>
                        Registrar modelo
                    </Button>
                }
            />

            {jurisdiction === null ? renderOverview() : renderJurisdiction(jurisdiction)}

            {modal?.kind === 'create' && (
                <DocumentTemplateFormModal
                    values={values}
                    errors={errors}
                    saving={create.isPending}
                    onChange={(key, value) => setValues((s) => ({ ...s, [key]: value }))}
                    onConfirm={submitCreate}
                    onCancel={closeModal}
                />
            )}
        </>
    )
}
