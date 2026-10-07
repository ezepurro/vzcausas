import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { isApiError } from '@/shared/api/ApiError'
import { Breadcrumbs, Button, Icon, Panel, type BreadcrumbItem } from '@/shared/components/ui'
import { useCase } from '@/features/cases/api/useCase'
import { CaseHeader } from '@/features/cases/components/CaseHeader'
import { ClientCard } from '@/features/cases/components/ClientCard'
import { PrescriptionBar } from '@/features/cases/components/PrescriptionBar'
import type { Case } from '@/features/cases/types/case'
import { nearestQualification } from '@/features/cases/utils/prescription'
import { isResponsibleLawyer } from '@/features/cases/utils/responsibleLawyer'
import { sacLabel } from '@/features/cases/utils/sac'

/**
 * Detalle de causa (HU22), en `/causas/:caseId`.
 *
 * Muestra el encabezado con el estado actual y su vencimiento, la prescripción
 * de la calificación que prescribe primero y la tarjeta del cliente. Lo ve
 * cualquier perfil: todo el estudio accede a todas las causas (RN11).
 *
 * El panel "Ciclo de vida de la causa" del prototipo no se dibuja: es HU27 del
 * Sprint 3 y no hay endpoint para listar los actos (V3 §8.3). Tampoco
 * "Modificar causa" ni "Dar de baja" (HU19 y HU21), ni la fila "Sobre la causa".
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
        body = <Empty title="Cargando causa…" />
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

/** La pantalla con la causa ya cargada. */
function CaseDetail({ case: c }: { case: Case }) {
    const navigate = useNavigate()
    const { lawyer } = useCurrentUser()

    /* Sólo el abogado responsable registra los actos de esta causa (D-30). No es
       un permiso por rol: a los demás el botón va deshabilitado, con la nota. */
    const canRegisterAct = isResponsibleLawyer(c, lawyer?.id ?? null)

    return (
        <>
            <CaseHeader
                case={c}
                showInstructor
                actions={
                    <>
                        <Button
                            icon={<Icon name="plus" />}
                            disabled={!canRegisterAct}
                            onClick={() => navigate(`/causas/${c.id}/acto`)}
                        >
                            Registrar acto procesal
                        </Button>
                        {!canRegisterAct && (
                            <p className="vz-case-head__note">
                                Solo el abogado responsable ({c.responsibleLawyer.fullName}) registra actos.
                            </p>
                        )}
                    </>
                }
            >
                <CasePrescription case={c} />
            </CaseHeader>

            <div className="vz-case-detail__panels">
                <ClientCard client={c.client} />
            </div>
        </>
    )
}

/**
 * La barra de prescripción al pie del encabezado: sólo en el fuero penal, y de
 * la calificación que prescribe primero (D-19). Una causa penal sin
 * calificaciones no computa prescripción (D-33), así que no dibuja nada.
 */
function CasePrescription({ case: c }: { case: Case }) {
    if (c.jurisdiction !== 'CRIMINAL') return null
    const nearest = nearestQualification(c)
    if (!nearest) return null

    const note = c.legalQualifications.length > 1
        ? `El cómputo corre desde la fecha del hecho. Calificación que prescribe primero: ${nearest.name}.`
        : 'El cómputo corre desde la fecha del hecho.'

    return (
        <PrescriptionBar
            qualificationName={nearest.name}
            startsOn={nearest.prescriptionStartsOn}
            expiresOn={nearest.prescriptionExpiresOn}
            note={note}
        />
    )
}

/** Cargando, error o causa inexistente, dentro de un panel. */
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
