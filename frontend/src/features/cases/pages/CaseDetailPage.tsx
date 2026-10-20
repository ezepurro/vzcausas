import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCan } from '@/app/access/useCan'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { useToast } from '@/app/providers/ToastContext'
import { isApiError } from '@/shared/api/ApiError'
import { Breadcrumbs, Button, Icon, Panel, type BreadcrumbItem } from '@/shared/components/ui'
import { formatDate, todayIsoDate } from '@/shared/lib/dates'
import { formatPersonFullName } from '@/shared/lib/personName'
import { useCase } from '@/features/cases/api/useCase'
import { useCaseTimeline } from '@/features/cases/api/useCaseTimeline'
import { useCreateCaseFolder } from '@/features/cases/api/useCreateCaseFolder'
import { useDeclarePrescription } from '@/features/cases/api/useDeclarePrescription'
import { useRegisterInterruptiveAct } from '@/features/cases/api/useRegisterInterruptiveAct'
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
import { prescriptionNote } from '@/features/cases/utils/prescription'
import { isResponsibleLawyer } from '@/features/cases/utils/responsibleLawyer'
import { sacLabel } from '@/features/cases/utils/sac'
import { toCreateInterruptiveActBody } from '@/features/cases/utils/toCreateInterruptiveActBody'
import { toDeclarePrescriptionBody } from '@/features/cases/utils/toDeclarePrescriptionBody'
import { toInterruptiveActFormErrors } from '@/features/cases/utils/toInterruptiveActFormErrors'
import { toPrescriptionDeclarationFormErrors } from '@/features/cases/utils/toPrescriptionDeclarationFormErrors'

/**
 * Detalle de causa (HU22), en `/causas/:caseId`.
 *
 * Muestra el encabezado con el estado actual y su vencimiento, la prescripción
 * que rige la causa, la línea de vida (HU27), la tarjeta del cliente y los
 * datos propios del fuero (V4 D-67). Lo ve cualquier perfil: todo el estudio
 * accede a todas las causas (RN11).
 *
 * En las causas penales suma la fila "Sobre la causa", con "Registrar acto
 * interruptivo" (HU31) y "Marcar prescripta" (HU33). Lo demás que el
 * prototipo pone en esa fila (pago de tasa, carátula, expediente), "Modificar
 * causa" y "Dar de baja" son de otras historias (V4 §8.3) y no se dibujan.
 *
 * Al costado, la carpeta de la causa en Drive (HU39), con la que se crea o se
 * reintenta si falta.
 */
export function CaseDetailPage() {
    const { caseId: param } = useParams()
    const caseId = Number(param)
    const navigate = useNavigate()
    const validId = Number.isInteger(caseId) && caseId > 0
    const query = useCase(caseId)

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
            <Breadcrumbs items={crumbs} />
            {body}
        </>
    )
}

/** Qué modal está abierto, con sus valores y sus errores. */
type ModalState =
    | { kind: 'interruptive'; values: InterruptiveActFormValues; errors: InterruptiveActFormErrors }
    | { kind: 'prescription'; values: PrescriptionDeclarationFormValues; errors: PrescriptionDeclarationFormErrors }
    | null

/** La pantalla con la causa ya cargada. */
function CaseDetail({ case: c }: { case: Case }) {
    const navigate = useNavigate()
    const toast = useToast()
    const { lawyer } = useCurrentUser()
    const canDeclarePrescription = useCan('cases.declarePrescription')
    const timeline = useCaseTimeline(c.id)
    const registerInterruptive = useRegisterInterruptiveAct(c.id)
    const declarePrescription = useDeclarePrescription(c.id)
    const createFolder = useCreateCaseFolder(c.id)
    const [modal, setModal] = useState<ModalState>(null)

    /* Sólo el abogado responsable registra los actos de esta causa, procesales
       e interruptivos (D-30, D-50). No es un permiso por rol: depende de la causa. */
    const isResponsible = isResponsibleLawyer(c, lawyer?.id ?? null)
    const goRegisterAct = () => navigate(`/causas/${c.id}/acto`)

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

    function changeValue(k: string, v: string | boolean) {
        setModal((m) => (m === null ? m : ({ ...m, values: { ...m.values, [k]: v } } as ModalState)))
    }

    /* Un 400 con detalle se marca en sus campos; el resto (los 422 de estado
       terminal o de prescripción que no aplica) va al aviso, con el mensaje
       del servidor. */
    function handleApiError(error: unknown) {
        if (!isApiError(error)) throw error
        if (error.isValidation && modal !== null) {
            // Sólo los campos que el modal abierto muestra.
            const fieldErrors = modal.kind === 'interruptive'
                ? toInterruptiveActFormErrors(error.details)
                : toPrescriptionDeclarationFormErrors(error.details)
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
                    </>
                }
            >
                <CasePrescription case={c} />
                {showCaseActions && (
                    <div className="vz-case-actions">
                        <span className="vz-case-actions__label">Sobre la causa</span>
                        <Button variant="secondary" size="sm" onClick={openInterruptive}>
                            Registrar acto interruptivo
                        </Button>
                        {/* La Secretaría no lo ve: no es suyo (CA-33.2). */}
                        {canDeclarePrescription && (
                            <Button variant="danger" size="sm" onClick={openPrescription}>
                                Marcar prescripta
                            </Button>
                        )}
                    </div>
                )}
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
                />
                <div className="vz-case-detail__aside">
                    <ClientCard client={c.client} />
                    <CaseFacts case={c} />
                    <CaseFolderCard
                        folder={c.folder}
                        creating={createFolder.isPending}
                        error={
                            createFolder.isError
                                ? isApiError(createFolder.error) ? createFolder.error.message : 'Ocurrió un error inesperado.'
                                : null
                        }
                        onCreate={() => createFolder.mutate()}
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
