import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCan } from '@/app/access/useCan'
import { useGoBack } from '@/app/router/useGoBack'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { useToast } from '@/app/providers/ToastContext'
import { isApiError } from '@/shared/api/ApiError'
import { Breadcrumbs, Button, Icon, Panel, type BreadcrumbItem } from '@/shared/components/ui'
import { formatDate, todayIsoDate } from '@/shared/lib/dates'
import { formatPersonFullName } from '@/shared/lib/personName'
import { useCase } from '@/features/cases/api/useCase'
import { useCaseEdit } from '@/features/cases/api/useCaseEdit'
import { useCaseTimeline } from '@/features/cases/api/useCaseTimeline'
import { useCreateCaseFolder } from '@/features/cases/api/useCreateCaseFolder'
import { useDeclarePrescription } from '@/features/cases/api/useDeclarePrescription'
import { useRegisterInterruptiveAct } from '@/features/cases/api/useRegisterInterruptiveAct'
import { CaseEditForm } from '@/features/cases/components/CaseEditForm'
import { CaseHeader } from '@/features/cases/components/CaseHeader'
import { CaseFacts } from '@/features/cases/components/CaseFacts'
import { CaseFolderCard } from '@/features/cases/components/CaseFolderCard'
import { CaseDetailSkeleton } from '@/features/cases/components/CaseSkeletons'
import { CaseTimeline } from '@/features/cases/components/CaseTimeline'
import { ClientCard } from '@/features/cases/components/ClientCard'
import { InterruptiveActModal } from '@/features/cases/components/InterruptiveActModal'
import { PrescriptionBar } from '@/features/cases/components/PrescriptionBar'
import { PrescriptionDeclarationModal } from '@/features/cases/components/PrescriptionDeclarationModal'
import {
    validateInterruptiveAct,
    type InterruptiveActFormErrors,
} from '@/features/cases/schemas/interruptiveAct.schema'
import {
    validatePrescriptionDeclaration,
    type PrescriptionDeclarationFormErrors,
} from '@/features/cases/schemas/prescriptionDeclaration.schema'
import type { Case } from '@/features/cases/types/case'
import type { InterruptiveActFormValues } from '@/features/cases/types/interruptiveAct'
import type { PrescriptionDeclarationFormValues } from '@/features/cases/types/prescriptionDeclaration'
import type { ProceduralAct } from '@/features/cases/types/proceduralAct'
import { prescriptionNote } from '@/features/cases/utils/prescription'
import { isResponsibleLawyer } from '@/features/cases/utils/responsibleLawyer'
import { sacLabel } from '@/features/cases/utils/sac'
import { toCreateInterruptiveActBody } from '@/features/cases/utils/toCreateInterruptiveActBody'
import { toDeclarePrescriptionBody } from '@/features/cases/utils/toDeclarePrescriptionBody'
import { toInterruptiveActFormErrors } from '@/features/cases/utils/toInterruptiveActFormErrors'
import { toPrescriptionDeclarationFormErrors } from '@/features/cases/utils/toPrescriptionDeclarationFormErrors'
import { useDeleteCase } from '@/features/cases/api/useDeleteCase'
import { DeleteCaseModal } from '@/features/cases/components/DeleteCaseModal'
import { validateDeleteCase, type DeleteCaseFormErrors } from '@/features/cases/schemas/caseDeletion.schema'
import type { DeleteCaseFormValues } from '@/features/cases/types/caseDeletion'
import { toDeleteCaseBody } from '@/features/cases/utils/toDeleteCaseBody'
import { useCaseDocuments } from '@/features/cases/api/useCaseDocuments'
import { CaseDocumentsCard } from '@/features/cases/components/CaseDocumentsCard'
/**
 * Detalle de causa (HU22), en `/causas/:caseId`.
 *
 * Muestra el encabezado con el estado actual y su vencimiento, la prescripción
 * que rige la causa, la línea de vida (HU27), la tarjeta del cliente y los
 * datos propios del fuero (V4 D-67). Lo ve cualquier perfil: todo el estudio
 * accede a todas las causas (RN11).
 *
 *  * "Modificar causa" (HU19) y "Dar de baja" (HU21) los opera cualquier perfil,
 * sin ser el responsable (V5 §3.7). Dar de baja vuelve al listado: para el
 * cliente la causa deja de existir (D-97). La fila "Sobre la causa" lleva, en
 * todos los fueros, "Generar expediente" (HU25), y en las causas penales suma
 * "Registrar acto interruptivo" (HU31) y "Marcar prescripta" (HU33). El pago
 * de tasa, que el prototipo también pone ahí, es de otra historia y no se dibuja.
 *
 * Al costado, la carpeta de la causa en Drive (HU39), con la que se crea o se
 * reintenta si falta, y debajo sus documentos (HU38), que se leen de ella.
 */
export function CaseDetailPage() {
    const { caseId: param } = useParams()
    const caseId = Number(param)
    const navigate = useNavigate()
    const validId = Number.isInteger(caseId) && caseId > 0
    const query = useCase(caseId)
    // Al listado o a Inicio, según de dónde se entró.
    const goBack = useGoBack('/causas')

    const c = query.data
    const crumbs: BreadcrumbItem[] = [
        { label: 'Causas', onClick: () => navigate('/causas') },
        { label: c ? sacLabel(c.sacNumber) : '…' },
    ]

    let body: ReactNode
    if (!validId) {
        body = <Empty title="No se encontró la causa" text="La dirección no corresponde a ninguna causa." />
    } else if (query.isPending) {
        body = <CaseDetailSkeleton />
    } else if (query.isError) {
        body = (
            <Empty
                title="No se pudo cargar la causa"
                text={isApiError(query.error) ? query.error.message : 'Ocurrió un error inesperado.'}
            />
        )
    } else {
        body = <CaseDetail case={query.data} />
    }

    return (
        <>
            <Breadcrumbs items={crumbs} onBack={goBack} />
            {body}
        </>
    )
}

/** El aviso de "Dar de baja", del prototipo. */
const CASE_DELETED = 'Causa dada de baja. Se conserva el historial completo.'
/**
 * Qué modal está abierto, con sus valores y sus errores. "Modificar causa"
 * lleva su propio estado, en `useCaseEdit`, porque también lo abre "Generar
 * expediente".
 */
type ModalState =
    | { kind: 'interruptive'; values: InterruptiveActFormValues; errors: InterruptiveActFormErrors }
    | { kind: 'prescription'; values: PrescriptionDeclarationFormValues; errors: PrescriptionDeclarationFormErrors }
    | { kind: 'delete'; values: DeleteCaseFormValues; errors: DeleteCaseFormErrors }
    | null

/** La pantalla con la causa ya cargada. */
function CaseDetail({ case: c }: { case: Case }) {
    const navigate = useNavigate()
    const toast = useToast()
    const { lawyer } = useCurrentUser()
    const canDeclarePrescription = useCan('cases.declarePrescription')
    const timeline = useCaseTimeline(c.id)
    /* Los documentos se leen de la carpeta: sin ella creada no hay pedido (CA-38.5). */
    const folderCreated = c.folder?.status === 'CREATED'
    const documents = useCaseDocuments(c.id, folderCreated)
    const registerInterruptive = useRegisterInterruptiveAct(c.id)
    const declarePrescription = useDeclarePrescription(c.id)
    const createFolder = useCreateCaseFolder(c.id)
    const edit = useCaseEdit(c)
    const deleteCase = useDeleteCase(c.id)
    const [modal, setModal] = useState<ModalState>(null)

    /* Sólo el abogado responsable registra los actos de esta causa, procesales
       e interruptivos (D-30, D-50). No es un permiso por rol: depende de la causa. */
    const isResponsible = isResponsibleLawyer(c, lawyer?.id ?? null)
    const goRegisterAct = () => navigate(`/causas/${c.id}/acto`)

    /* Los actos de una causa prescripta no se modifican (D-99): ahí la línea
       de vida no ofrece "Modificar" (ver cases/CAMBIOS.md). */
    const canModifyActs = c.prescriptionDeclaration === null

    function modifyAct(act: ProceduralAct) {
        // Como al registrar un acto interruptivo: el botón está para todos y avisa quién puede.
        if (!isResponsible) {
            toast('info', 'Solo el abogado responsable de la causa modifica sus actos procesales.')
            return
        }
        navigate(`/causas/${c.id}/acto/${act.id}`)
    }

    /* Actos interruptivos y prescripción sólo existen en el penal (D-50, D-52).
       Una causa ya prescripta está cerrada: no se ofrece ninguno de los dos. */
    const showCaseActions = c.jurisdiction === 'CRIMINAL' && c.prescriptionDeclaration === null

    function openInterruptive() {
        // Como en el prototipo: el botón está para todos y avisa quién puede.
        if (!isResponsible) {
            toast(
                'info',
                `Solo el abogado responsable de la causa (${formatPersonFullName(c.responsibleLawyer)}) registra actos interruptivos.`,
            )
            return
        }
        setModal({ kind: 'interruptive', values: { name: '', actDate: todayIsoDate(), notes: '' }, errors: {} })
    }

    function openPrescription() {
        setModal({
            kind: 'prescription',
            values: { prescriptionDate: todayIsoDate(), resolution: '', grounds: '' },
            errors: {},
        })
    }

        function openDelete() {
        setModal({ kind: 'delete', values: { reason: '' }, errors: {} })
    }
    function changeValue(k: string, v: string | boolean) {
        setModal((m) => (m === null ? m : ({ ...m, values: { ...m.values, [k]: v } } as ModalState)))
    }

    /* ---------------- errores del servidor ---------------- */

    /* Un 400 con detalle se marca en sus campos; el resto (los 422 de estado
       terminal o de prescripción que no aplica) va al aviso, con el mensaje
       del servidor. Los errores de "Modificar causa" los maneja `useCaseEdit`. */
    function handleApiError(error: unknown) {
        if (!isApiError(error)) throw error
        if (error.isValidation && modal !== null) {
            // Sólo los campos que el modal abierto muestra.
            const fieldErrors = modal.kind === 'interruptive'
                ? toInterruptiveActFormErrors(error.details)
                : modal.kind === 'prescription'
                    ? toPrescriptionDeclarationFormErrors(error.details)
                    : (error.details?.reason ? { reason: error.details.reason } : {})
            if (Object.keys(fieldErrors).length > 0) {
                setModal((m) => (m === null ? m : ({ ...m, errors: fieldErrors } as ModalState)))
                return
            }
            // Un 400 sin ningún campo que marcar no puede quedar mudo.
        }
        toast('error', error.message)
    }

    function submitInterruptive(values: InterruptiveActFormValues) {
        const errors = validateInterruptiveAct(values)
        setModal({ kind: 'interruptive', values, errors })
        if (Object.keys(errors).length > 0) return
        registerInterruptive.mutate(toCreateInterruptiveActBody(values), {
            onSuccess: (act) => {
                toast(
                    'success',
                    `Acto interruptivo registrado. La prescripción se reinició desde el ${formatDate(act.actDate)}.`,
                )
                setModal(null)
            },
            onError: handleApiError,
        })
    }

    function submitPrescription(values: PrescriptionDeclarationFormValues) {
        const errors = validatePrescriptionDeclaration(values)
        setModal({ kind: 'prescription', values, errors })
        if (Object.keys(errors).length > 0) return
        declarePrescription.mutate(toDeclarePrescriptionBody(values), {
            onSuccess: () => {
                toast('success', 'Causa marcada como prescripta. Se cerraron los plazos abiertos.')
                setModal(null)
            },
            onError: handleApiError,
        })
    }

        /**
     * Da de baja la causa y vuelve al listado (CA-21.1). El motivo es opcional
     * (CA-21.2). El aviso es `info`: salió bien, pero no es un logro. Si falla,
     * el diálogo queda abierto con el mensaje del servidor y la causa sigue.
     */
    function submitDelete(values: DeleteCaseFormValues) {
        const errors = validateDeleteCase(values)
        setModal({ kind: 'delete', values, errors })
        if (Object.keys(errors).length > 0) return
        deleteCase.mutate(toDeleteCaseBody(values), {
            onSuccess: () => {
                toast('info', CASE_DELETED)
                navigate('/causas')
            },
            onError: handleApiError,
        })
    }

    return (
        <>
            <CaseHeader
                case={c}
                showInstructor
                actions={
                    <>
                        <Button icon={<Icon name="plus" />} disabled={!isResponsible} onClick={goRegisterAct}>
                            Registrar acto procesal
                        </Button>
                        {!isResponsible && (
                            <p className="vz-case-head__note">
                                Solo el abogado responsable ({formatPersonFullName(c.responsibleLawyer)}) registra actos.
                            </p>
                        )}
                                              {/* Los dos los opera cualquier perfil (V5 §3.7): no se declaran en ACTION_ACCESS. */}
                        <div className="vz-case-head__buttons">
                            <Button variant="secondary" size="sm" onClick={edit.open}>
                                Modificar causa
                            </Button>
                            <Button variant="danger" size="sm" onClick={openDelete}>
                                Dar de baja
                            </Button>
                        </div>
                    </>
                }
            >
                <CasePrescription case={c} />
                <div className="vz-case-actions">
                    <span className="vz-case-actions__label">Sobre la causa</span>
                    {showCaseActions && (
                        <Button variant="secondary" size="sm" onClick={openInterruptive}>
                            Registrar acto interruptivo
                        </Button>
                    )}
                    {/* Lo genera cualquier perfil, en cualquier fuero (HU25): no va en ACTION_ACCESS. */}
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/causas/${c.id}/expediente`)}>
                        Generar expediente
                    </Button>
                    {/* La Secretaría no lo ve: no es suyo (CA-33.2). */}
                    {showCaseActions && canDeclarePrescription && (
                        <Button variant="danger" size="sm" onClick={openPrescription}>
                            Marcar prescripta
                        </Button>
                    )}
                </div>

            </CaseHeader>

            <div className="vz-case-detail">
                <CaseTimeline
                    entries={timeline.data}
                    loading={timeline.isPending}
                    error={
                        timeline.isError
                            ? isApiError(timeline.error) ? timeline.error.message : 'Ocurrió un error inesperado.'
                            : null
                    }
                    canRegisterAct={isResponsible}
                    onRegisterAct={goRegisterAct}
                    canModifyActs={canModifyActs}
                    onModifyAct={modifyAct}
                />
                <div className="vz-case-detail__aside">
                    <ClientCard client={c.client} />
                    <CaseFacts case={c} />
                    <CaseFolderCard
                        case={c}
                        creating={createFolder.isPending}
                        error={
                            createFolder.isError
                                ? isApiError(createFolder.error) ? createFolder.error.message : 'Ocurrió un error inesperado.'
                                : null
                        }
                        onCreate={() => createFolder.mutate()}
                    />
                    <CaseDocumentsCard
                        folderCreated={folderCreated}
                        documents={documents.data?.documents}
                        readAt={documents.data?.readAt}
                        loading={documents.isPending}
                        error={
                            documents.isError
                                ? isApiError(documents.error) ? documents.error.message : 'Ocurrió un error inesperado.'
                                : null
                        }
                    />
                </div>
            </div>

            {modal?.kind === 'interruptive' && (
                <InterruptiveActModal
                    caption={c.caption}
                    values={modal.values}
                    errors={modal.errors}
                    saving={registerInterruptive.isPending}
                    onChange={changeValue}
                    onConfirm={() => submitInterruptive(modal.values)}
                    onCancel={() => setModal(null)}
                />
            )}
            {modal?.kind === 'prescription' && (
                <PrescriptionDeclarationModal
                    caption={c.caption}
                    values={modal.values}
                    errors={modal.errors}
                    saving={declarePrescription.isPending}
                    onChange={changeValue}
                    onConfirm={() => submitPrescription(modal.values)}
                    onCancel={() => setModal(null)}
                />
            )}
            {edit.form && <CaseEditForm {...edit.form} />}
            {modal?.kind === 'delete' && (
                <DeleteCaseModal
                    caption={c.caption}
                    values={modal.values}
                    errors={modal.errors}
                    saving={deleteCase.isPending}
                    onChange={changeValue}
                    onConfirm={() => submitDelete(modal.values)}
                    onCancel={() => setModal(null)}
                />
            )}
        </>
    )
}

/**
 * La barra de prescripción al pie del encabezado, con la que rige la causa
 * (V4 D-51). Fuera del penal, o en una causa penal sin calificaciones,
 * `prescription` vale `null` y no se dibuja nada (D-74).
 */
function CasePrescription({ case: c }: { case: Case }) {
    if (!c.prescription) return null
    return <PrescriptionBar prescription={c.prescription} note={prescriptionNote(c)} />
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