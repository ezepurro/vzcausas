import { useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { useToast } from '@/app/providers/ToastContext'
import { useGoBack } from '@/app/router/useGoBack'
import { isApiError } from '@/shared/api/ApiError'
import { Breadcrumbs, Button, LoadError, LoadingState, Panel, type BreadcrumbItem } from '@/shared/components/ui'
import type { ComboboxOption } from '@/shared/components/forms'
import { useFocusFirstError } from '@/shared/hooks/useFocusFirstError'
import { usePageTitle } from '@/shared/hooks/usePageTitle'
import { formatDate, todayIsoDate } from '@/shared/lib/dates'
import { formatPersonFullName } from '@/shared/lib/personName'
import {
    CaseHeader,
    CaseHeaderSkeleton,
    CasePrescriptionBar,
    isResponsibleLawyer,
    NO_SAC_LABEL,
    useCase,
    type Case,
} from '@/features/cases'
import { useProceduralStates } from '@/features/legal-params'
import { useDeadlinePreview } from '@/features/proceedings/api/useDeadlinePreview'
import { useProceduralAct } from '@/features/proceedings/api/useProceduralAct'
import { useRegisterProceduralAct } from '@/features/proceedings/api/useRegisterProceduralAct'
import { useUpdateProceduralAct } from '@/features/proceedings/api/useUpdateProceduralAct'
import {
    DeadlinePreviewAside,
    type DeadlinePreviewState,
} from '@/features/proceedings/components/DeadlinePreviewAside'
import { ProceduralActForm } from '@/features/proceedings/components/ProceduralActForm'
import { ProceduralActFormSkeleton } from '@/features/proceedings/components/ProceduralActFormSkeleton'
import {
    isValid,
    validateProceduralAct,
    type ProceduralActErrors,
} from '@/features/proceedings/schemas/proceduralAct.schema'
import type {
    ProceduralAct,
    ProceduralActFormValues,
    UpdateProceduralActBody,
} from '@/features/proceedings/types/proceduralAct'
import { buildProceduralActPatch, hasChanges, keepsSavedTerm } from '@/features/proceedings/utils/buildProceduralActPatch'
import { previewRequest } from '@/features/proceedings/utils/deadlinePreview'
import { opensTerm, resolveSelectedState } from '@/features/proceedings/utils/resolveState'
import { filterStateOptions, stateOptions } from '@/features/proceedings/utils/stateOptions'
import { isInTerminalState } from '@/features/proceedings/utils/terminalState'
import { toActFormValues } from '@/features/proceedings/utils/toActFormValues'
import { toCreateProceduralActBody } from '@/features/proceedings/utils/toCreateProceduralActBody'
import { toFormErrors } from '@/features/proceedings/utils/toFormErrors'

/** Todos los estados del fuero en una sola página, como pide el contrato (V3 §3.4). */
const STATES_LIMIT = 100

/**
 * Registrar acto procesal (HU26), en `/causas/:caseId/acto`, y modificarlo
 * (HU28), en `/causas/:caseId/acto/:actId`: es el mismo formulario, con el
 * título "Modificar acto procesal" y "Guardar cambios" (V5 §3.8).
 *
 * Primero carga la causa: sin ella no se sabe el fuero, y sin el fuero no hay
 * estados que ofrecer ni regla de la notificación (RN6). Recién con la causa
 * cargada se monta el formulario, así los estados se piden una sola vez y del
 * fuero correcto.
 *
 * Lo registra y lo modifica sólo el abogado responsable **actual** de la
 * causa (V3 D-30, CA-28.2). A cualquier otro usuario la pantalla le muestra
 * un aviso en lugar del formulario; el `403` del backend queda como respaldo.
 *
 * Al modificar, además de la causa se carga el acto
 * (`GET …/procedural-acts/{actId}`, D-85), que da los valores iniciales.
 */
export function RegisterProceduralActPage() {
    const { caseId: caseParam, actId: actParam } = useParams()
    const caseId = Number(caseParam)
    const editing = actParam !== undefined
    const actId = Number(actParam)
    const navigate = useNavigate()
    const caseQuery = useCase(caseId)
    const goBack = useGoBack(`/causas/${caseId}`)
    // Sin `actId` en la ruta la consulta no sale (`enabled`).
    const actQuery = useProceduralAct(caseId, editing ? actId : Number.NaN)
    const validCaseId = Number.isInteger(caseId) && caseId > 0
    const validActId = !editing || (Number.isInteger(actId) && actId > 0)
    const title = editing ? 'Modificar acto procesal' : 'Registrar acto procesal'

    const c = caseQuery.data
    usePageTitle(c ? `${title} · ${c.caption}` : title)
    const crumbs: BreadcrumbItem[] = [
        { label: 'Causas', onClick: () => navigate('/causas') },
        ...(c ? [{ label: c.sacNumber ?? NO_SAC_LABEL, onClick: () => navigate(`/causas/${c.id}`) }] : []),
        { label: title },
    ]

    let body: ReactNode
    if (!validCaseId) {
        body = <Empty title="No se encontró la causa" text="La dirección no corresponde a ninguna causa." />
    } else if (!validActId) {
        body = <Empty title="No se encontró el acto procesal" text="La dirección no corresponde a ningún acto de la causa." />
    } else if (caseQuery.isPending || (editing && actQuery.isPending)) {
        body = (
            <LoadingState label="Cargando causa…">
                <CaseHeaderSkeleton />
                <ProceduralActFormSkeleton />
            </LoadingState>
        )
    } else if (caseQuery.isError) {
        body = (
            <Panel>
                <LoadError title="No se pudo cargar la causa" error={caseQuery.error} onRetry={() => void caseQuery.refetch()} retrying={caseQuery.isFetching} />
            </Panel>
        )
    } else if (editing && actQuery.isError) {
        body = (
            <Panel>
                <LoadError title="No se pudo cargar el acto procesal" error={actQuery.error} onRetry={() => void actQuery.refetch()} retrying={actQuery.isFetching} />
            </Panel>
        )
    } else {
        // La clave rearma el formulario si se pasa de un acto a otro sin desmontar la ruta.
        body = (
            <RegisterProceduralAct
                key={editing ? actId : 'new'}
                case={caseQuery.data}
                act={editing ? actQuery.data : undefined}
            />
        )
    }

    return (
        <>
            <Breadcrumbs items={crumbs} onBack={goBack} />
            {body}
        </>
    )
}

/**
 * La pantalla con la causa ya cargada y, al modificar, el acto. Sin `act` es
 * el registro; con `act`, la modificación, que arranca con sus valores.
 */
function RegisterProceduralAct({ case: c, act }: { case: Case; act?: ProceduralAct }) {
    const toast = useToast()
    const { lawyer } = useCurrentUser()
    const { jurisdiction } = c

    const [values, setValues] = useState<ProceduralActFormValues>(() => act ? toActFormValues(act) : {
        stateText: '',
        proceduralStateId: '',
        actDate: todayIsoDate(),
        notificationDate: '',
        notes: '',
        manualDue: false,
        manualDueDate: '',
    })
    const [errors, setErrors] = useState<ProceduralActErrors>({})
    const formRef = useRef<HTMLDivElement>(null)
    // El vencimiento manual está en el panel lateral: el contenedor lo incluye.
    const focusErrors = useFocusFirstError(formRef, errors)

    const statesQuery = useProceduralStates({ page: 1, limit: STATES_LIMIT, jurisdiction })
    const states = statesQuery.data?.data ?? []
    const selected = resolveSelectedState(values, states)
    const customState = values.stateText.trim() !== '' && selected === null

    // Hacia un estado terminal no hay ajuste manual (V4 §3.8): si quedó
    // tildado de un estado anterior, no se valida ni se manda.
    const effective = selected?.terminal ? { ...values, manualDue: false } : values
    // Al modificar, lo que cambió respecto del acto guardado.
    const patch = act ? buildProceduralActPatch(act, effective, selected, jurisdiction) : null
    // Sin tocar el estado ni las fechas rige el plazo que el acto copió al
    // registrarse (D-98): se muestra ése, no el de la tabla de hoy.
    const savedTerm = act !== undefined && patch !== null && keepsSavedTerm(patch)

    // El vencimiento lo calcula el backend (V3 D-20): acá sólo se decide si
    // ya hay con qué pedirlo.
    const request = previewRequest(values, selected, jurisdiction)
    const preview = useDeadlinePreview(c.id, request.kind === 'request' && !savedTerm ? request.params : null)
    const previewState: DeadlinePreviewState =
        act && savedTerm ? { kind: 'saved', stateName: act.resultingState.name, deadline: act.deadline }
        : request.kind !== 'request' ? request
            : preview.isPending ? { kind: 'loading' }
                : preview.isError
                    ? {
                        kind: 'error',
                        message: isApiError(preview.error) ? preview.error.message : 'Ocurrió un error inesperado.',
                    }
                    : { kind: 'ready', stateName: selected?.name ?? values.stateText.trim(), preview: preview.data }

    const register = useRegisterProceduralAct(c.id)
    const update = useUpdateProceduralAct(c.id, act?.id ?? 0)
    // Se llega desde el detalle: volver, cancelar o guardar sacan esta pantalla
    // del historial, así la flecha del detalle no trae de nuevo el formulario.
    const backToCase = useGoBack(`/causas/${c.id}`)

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
     * en el formulario; el resto —el 403 de quien no es el responsable, el 422
     * de una causa en estado terminal o prescripta, el 404 de un acto que ya
     * no existe— se muestra con `e.message`, que ya viene en castellano.
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

    /* ---------------- registro y modificación ---------------- */

    function submit() {
        focusErrors()
        const found = validateProceduralAct(effective, { jurisdiction, opensTerm: opensTerm(selected) })
        setErrors(found)
        if (!isValid(found)) return

        if (patch !== null) {
            submitUpdate(patch)
            return
        }

        register.mutate(toCreateProceduralActBody(effective, selected, jurisdiction), {
            onSuccess: (act) => {
                const due = act.deadline ? ` · vencimiento el ${formatDate(act.deadline.dueDate)}` : ''
                // Un estado terminal cierra la causa (V4 D-69): el aviso lo dice.
                const closed = selected?.terminal ? ' La causa quedó cerrada.' : ''
                toast('success', `Acto registrado. La causa pasó a ${act.resultingState.name}${due}.${closed}`)
                backToCase()
            },
            onError: handleApiError,
        })
    }

    function submitUpdate(body: UpdateProceduralActBody) {
        // El contrato responde 400 a un PATCH vacío (CA-28.3): si no cambió
        // nada, se vuelve a la causa sin llamar.
        if (!hasChanges(body)) {
            backToCase()
            return
        }

        update.mutate(body, {
            onSuccess: (updated) => {
                const due = updated.deadline ? ` · vencimiento el ${formatDate(updated.deadline.dueDate)}` : ''
                toast('success', `Acto modificado${due}. El cambio queda asentado con usuario y fecha.`)
                // El estado de la causa pudo cambiar (D-99): el detalle lo vuelve a pedir.
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
                title={act ? 'Solo el abogado responsable modifica actos procesales' : 'Solo el abogado responsable registra actos procesales'}
                text={`El responsable de esta causa es ${formatPersonFullName(c.responsibleLawyer)}.`}
                action={<Button variant="secondary" size="md" onClick={backToCase}>Volver a la causa</Button>}
            />
        )
    } else if (statesQuery.isPending) {
        content = (
            <LoadingState label="Cargando estados procesales…">
                <ProceduralActFormSkeleton />
            </LoadingState>
        )
    } else if (statesQuery.isError) {
        content = (
            <Panel>
                <LoadError title="No se pudieron cargar los estados procesales" error={statesQuery.error} onRetry={() => void statesQuery.refetch()} retrying={statesQuery.isFetching} />
            </Panel>
        )
    } else if (!act && isInTerminalState(c, states)) {
        // Una causa terminal no admite actos nuevos, pero sí corregir el que
        // la cerró (CA-28.8): al modificar no se bloquea.
        content = (
            <Empty
                title="La causa no admite actos procesales"
                text={`Está en un estado terminal (${c.currentState.name}).`}
                action={<Button variant="secondary" size="md" onClick={backToCase}>Volver a la causa</Button>}
            />
        )
    } else {
        content = (
            <>
                {/* El prototipo nombra la pantalla sólo en las migas; el título queda para los lectores de pantalla. */}
                <h2 className="vz-sr-only">{act ? 'Modificar acto procesal' : 'Registrar acto procesal'}</h2>
                <div className="vz-split" ref={formRef}>
                    <ProceduralActForm
                        values={values}
                        errors={errors}
                        jurisdiction={jurisdiction}
                        stateOptions={filterStateOptions(stateOptions(states), values.stateText)}
                        onStateTextChange={changeStateText}
                        onStateSelect={selectState}
                        onChange={changeValue}
                        customState={customState}
                        saving={act ? update.isPending : register.isPending}
                        submitLabel={act ? 'Guardar cambios' : 'Registrar acto'}
                        sub={act ? `Modificás el acto del ${formatDate(act.actDate)}. El cambio queda asentado con usuario y fecha.` : undefined}
                        onConfirm={submit}
                        onCancel={backToCase}
                    />
                    <aside className="vz-split__aside">
                        <DeadlinePreviewAside
                            state={previewState}
                            manualDue={values.manualDue}
                            manualDueDate={values.manualDueDate}
                            manualDueDateError={errors.manualDueDate}
                            allowManualDue={!selected?.terminal}
                            onManualDueChange={(value) => changeValue('manualDue', value)}
                            onManualDueDateChange={(value) => changeValue('manualDueDate', value)}
                        />
                    </aside>
                </div>
            </>
        )
    }

    return (
        <>
            <CaseHeader case={c}>
                <CasePrescriptionBar case={c} />
            </CaseHeader>
            {content}
        </>
    )
}

/** Error o un aviso que reemplaza al formulario, dentro de un panel. */
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
