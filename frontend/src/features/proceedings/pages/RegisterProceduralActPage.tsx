import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { useToast } from '@/app/providers/ToastContext'
import { isApiError } from '@/shared/api/ApiError'
import { Breadcrumbs, Button, Panel, type BreadcrumbItem } from '@/shared/components/ui'
import type { ComboboxOption } from '@/shared/components/forms'
import { formatDate, todayIsoDate } from '@/shared/lib/dates'
import {
    CaseHeader,
    nearestQualification,
    PrescriptionBar,
    useCase,
    type Case,
} from '@/features/cases'
import { useProceduralStates } from '@/features/legal-params'
import { useDeadlinePreview } from '@/features/proceedings/api/useDeadlinePreview'
import { useRegisterProceduralAct } from '@/features/proceedings/api/useRegisterProceduralAct'
import {
    DeadlinePreviewAside,
    type DeadlinePreviewState,
} from '@/features/proceedings/components/DeadlinePreviewAside'
import { ProceduralActForm } from '@/features/proceedings/components/ProceduralActForm'
import {
    isValid,
    validateProceduralAct,
    type ProceduralActErrors,
} from '@/features/proceedings/schemas/proceduralAct.schema'
import type { ProceduralActFormValues } from '@/features/proceedings/types/proceduralAct'
import { previewRequest } from '@/features/proceedings/utils/deadlinePreview'
import { isResponsibleLawyer } from '@/features/proceedings/utils/responsibleLawyer'
import { opensTerm, resolveSelectedState } from '@/features/proceedings/utils/resolveState'
import { filterStateOptions, stateOptions } from '@/features/proceedings/utils/stateOptions'
import { isInTerminalState } from '@/features/proceedings/utils/terminalState'
import { toCreateProceduralActBody } from '@/features/proceedings/utils/toCreateProceduralActBody'
import { toFormErrors } from '@/features/proceedings/utils/toFormErrors'

/** Todos los estados del fuero en una sola página, como pide el contrato (V3 §3.4). */
const STATES_LIMIT = 100

/** Las migas cuando la causa no tiene SAC, que es opcional (V3 D-33). */
const NO_SAC_LABEL = 'Sin SAC'

/**
 * Registrar acto procesal (HU26), en `/causas/:caseId/acto`.
 *
 * Primero carga la causa: sin ella no se sabe el fuero, y sin el fuero no hay
 * estados que ofrecer ni regla de la notificación (RN6). Recién con la causa
 * cargada se monta el formulario, así los estados se piden una sola vez y del
 * fuero correcto.
 *
 * Lo registra sólo el abogado responsable de la causa (V3 D-30). A
 * cualquier otro usuario la pantalla le muestra un aviso en lugar del
 * formulario; el `403` del backend queda como respaldo.
 */
export function RegisterProceduralActPage() {
    const { caseId: param } = useParams()
    const caseId = Number(param)
    const navigate = useNavigate()
    const caseQuery = useCase(caseId)
    const validId = Number.isInteger(caseId) && caseId > 0

    const c = caseQuery.data
    const crumbs: BreadcrumbItem[] = [
        { label: 'Causas', onClick: () => navigate('/causas') },
        ...(c ? [{ label: c.sacNumber ?? NO_SAC_LABEL, onClick: () => navigate(`/causas/${c.id}`) }] : []),
        { label: 'Registrar acto procesal' },
    ]

    let body: ReactNode
    if (!validId) {
        body = <Empty title="No se encontró la causa" text="La dirección no corresponde a ninguna causa." />
    } else if (caseQuery.isPending) {
        body = <Empty title="Cargando causa…" />
    } else if (caseQuery.isError) {
        body = (
            <Empty
                title="No se pudo cargar la causa"
                text={isApiError(caseQuery.error) ? caseQuery.error.message : 'Ocurrió un error inesperado.'}
            />
        )
    } else {
        body = <RegisterProceduralAct case={caseQuery.data} />
    }

    return (
        <>
            <Breadcrumbs items={crumbs} />
            {body}
        </>
    )
}

/** La pantalla con la causa ya cargada. */
function RegisterProceduralAct({ case: c }: { case: Case }) {
    const navigate = useNavigate()
    const toast = useToast()
    const { lawyer } = useCurrentUser()
    const { jurisdiction } = c

    const [values, setValues] = useState<ProceduralActFormValues>(() => ({
        stateText: '',
        proceduralStateId: '',
        actDate: todayIsoDate(),
        notificationDate: '',
        notes: '',
        manualDue: false,
        manualDueDate: '',
    }))
    const [errors, setErrors] = useState<ProceduralActErrors>({})

    const statesQuery = useProceduralStates({ page: 1, limit: STATES_LIMIT, jurisdiction })
    const states = statesQuery.data?.data ?? []
    const selected = resolveSelectedState(values, states)
    const customState = values.stateText.trim() !== '' && selected === null

    // El vencimiento lo calcula el backend (V3 D-20): acá sólo se decide si
    // ya hay con qué pedirlo.
    const request = previewRequest(values, selected, jurisdiction)
    const preview = useDeadlinePreview(c.id, request.kind === 'request' ? request.params : null)
    const previewState: DeadlinePreviewState =
        request.kind !== 'request' ? request
            : preview.isPending ? { kind: 'loading' }
                : preview.isError
                    ? {
                        kind: 'error',
                        message: isApiError(preview.error) ? preview.error.message : 'Ocurrió un error inesperado.',
                    }
                    : { kind: 'ready', stateName: selected?.name ?? values.stateText.trim(), preview: preview.data }

    const register = useRegisterProceduralAct(c.id)
    const backToCase = () => navigate(`/causas/${c.id}`)

    /* ---------------- formulario ---------------- */

    function changeValue<K extends keyof ProceduralActFormValues>(key: K, value: ProceduralActFormValues[K]) {
        setValues((current) => ({ ...current, [key]: value }))
    }

    /** Cada tecla en el combobox: lo escrito deja de ser el estado elegido de la lista. */
    function changeStateText(text: string) {
        setValues((current) => ({ ...current, stateText: text, proceduralStateId: '' }))
    }

    function selectState(option: ComboboxOption) {
        setValues((current) => ({ ...current, stateText: option.label, proceduralStateId: option.value }))
    }

    /* ---------------- errores del servidor ---------------- */

    /**
     * Los errores llegan siempre como `ApiError`. Un 400 con campos se marca
     * en el formulario; el resto —el 403 de quien no es abogado, el 422 de una
     * causa en estado terminal— se muestra con `e.message`, que ya viene en
     * castellano.
     */
    function handleApiError(error: unknown) {
        if (!isApiError(error)) throw error

        if (error.isValidation) {
            const fieldErrors = toFormErrors(error.details)
            if (!isValid(fieldErrors)) {
                setErrors(fieldErrors)
                return
            }
            // Un 400 sin ningún campo que marcar no puede quedar mudo.
        }

        toast('error', error.message)
    }

    /* ---------------- registro ---------------- */

    function submit() {
        const found = validateProceduralAct(values, { jurisdiction, opensTerm: opensTerm(selected) })
        setErrors(found)
        if (!isValid(found)) return

        register.mutate(toCreateProceduralActBody(values, selected, jurisdiction), {
            onSuccess: (act) => {
                const due = act.deadline ? ` · vencimiento el ${formatDate(act.deadline.dueDate)}` : ''
                toast('success', `Acto registrado. La causa pasó a ${act.resultingState.name}${due}.`)
                backToCase()
            },
            onError: handleApiError,
        })
    }

    /* ---------------- pantalla ---------------- */

    let content: ReactNode
    if (!isResponsibleLawyer(c, lawyer?.id ?? null)) {
        content = (
            <Empty
                title="Sólo el abogado responsable registra actos procesales"
                text={`El responsable de esta causa es ${c.responsibleLawyer.fullName}.`}
                action={<Button variant="secondary" size="md" onClick={backToCase}>Volver a la causa</Button>}
            />
        )
    } else if (statesQuery.isPending) {
        content = <Empty title="Cargando estados procesales…" />
    } else if (statesQuery.isError) {
        content = (
            <Empty
                title="No se pudieron cargar los estados procesales"
                text={isApiError(statesQuery.error) ? statesQuery.error.message : 'Ocurrió un error inesperado.'}
            />
        )
    } else if (isInTerminalState(c, states)) {
        content = (
            <Empty
                title="La causa no admite actos procesales"
                text={`Está en un estado terminal (${c.currentState?.name}).`}
                action={<Button variant="secondary" size="md" onClick={backToCase}>Volver a la causa</Button>}
            />
        )
    } else {
        content = (
            <div className="vz-split">
                <ProceduralActForm
                    values={values}
                    errors={errors}
                    jurisdiction={jurisdiction}
                    stateOptions={filterStateOptions(stateOptions(states), values.stateText)}
                    onStateTextChange={changeStateText}
                    onStateSelect={selectState}
                    onChange={changeValue}
                    customState={customState}
                    saving={register.isPending}
                    onConfirm={submit}
                    onCancel={backToCase}
                />
                <aside className="vz-split__aside">
                    <DeadlinePreviewAside
                        state={previewState}
                        manualDue={values.manualDue}
                        manualDueDate={values.manualDueDate}
                        manualDueDateError={errors.manualDueDate}
                        onManualDueChange={(value) => changeValue('manualDue', value)}
                        onManualDueDateChange={(value) => changeValue('manualDueDate', value)}
                    />
                </aside>
            </div>
        )
    }

    return (
        <>
            <CaseHeader case={c}>
                <CasePrescription case={c} />
            </CaseHeader>
            {content}
        </>
    )
}

/**
 * La barra de prescripción al pie del encabezado: sólo en el fuero penal, y
 * de la calificación que prescribe primero (V3 D-19).
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

/** Cargando, error o un aviso que reemplaza al formulario, dentro de un panel. */
function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
    return (
        <Panel>
            <div className="vz-empty">
                <div className="vz-empty__title">{title}</div>
                {text && <div className="vz-empty__text">{text}</div>}
                {action}
            </div>
        </Panel>
    )
}
