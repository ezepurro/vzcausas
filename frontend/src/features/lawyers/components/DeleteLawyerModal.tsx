import { useState, type ReactNode } from 'react'
import { FieldError, FormModal } from '@/shared/components/forms'
import { Button, IconButton, LoadError, LoadingState, Skeleton } from '@/shared/components/ui'
import { formatPersonName } from '@/shared/lib/personName'
import { useLawyers } from '@/features/lawyers/api/useLawyers'
import { useLawyerActiveCases } from '@/features/lawyers/api/useLawyerActiveCases'
import { useLinkedUser } from '@/features/lawyers/api/useLinkedUser'
import type { Lawyer } from '@/features/lawyers/types/lawyer'
import type { LawyerCase } from '@/features/lawyers/types/lawyerDeletion'
import { lawyerLabel } from '@/features/lawyers/utils/lawyerLabel'
import { linkedUserNotice } from '@/features/lawyers/utils/linkedUserNotice'
import {
    assign,
    caseIdsFor,
    pendingCaseIds,
    syncReassignment,
    unassign,
    type Reassignment,
} from '@/features/lawyers/utils/reassignment'

/** Los destinos entran en una página: el estudio tiene pocos abogados. */
const TARGETS_LIMIT = 100

export interface DeleteLawyerModalProps {
    lawyer: Lawyer
    saving: boolean
    /** El rechazo del servidor que no es de un campo (un `400` del reparto, por ejemplo). */
    error?: string
    /**
     * Confirma con el reparto armado. `Record` vacío si no tiene causas
     * activas. `names` sirve para el aviso de éxito.
     */
    onConfirm: (reassignment: Reassignment, names: ReadonlyMap<number, string>) => void
    onCancel: () => void
}

/**
 * "Eliminar abogado" (HU15, V6 §3.3). Lista las causas activas del abogado y
 * permite pasar cada una a otro abogado (CA-15.2): se marcan en "Sin asignar"
 * y se pasan a un abogado de "Pasan a". Las que quedan sin asignar quedan
 * huérfanas, sin responsable (D-143): no hace falta repartirlas todas, pero
 * antes de enviar se avisa y se listan, junto con lo que le pasa al usuario
 * vinculado (CA-15.5), y se pide confirmar (V6 §3.3). Las terminales no se
 * reparten: quedan como su historial.
 *
 * El reparto se recalcula contra las causas de ahora en cada render: si
 * llegan otras (tras un `409`, CA-15.10), lo ya asignado se conserva y lo
 * nuevo aparece sin asignar.
 */
export function DeleteLawyerModal({ lawyer, saving, error, onConfirm, onCancel }: DeleteLawyerModalProps) {
    const activeCases = useLawyerActiveCases(lawyer.id)
    const linkedUser = useLinkedUser(lawyer.id)
    const targetsQuery = useLawyers({ page: 1, limit: TARGETS_LIMIT })

    const [draft, setDraft] = useState<Reassignment>({})
    const [selected, setSelected] = useState<ReadonlySet<number>>(new Set())
    /* Segundo paso: el aviso del usuario vinculado (CA-15.5) y las causas que
       quedan sin asignar (D-143), a confirmar. Un
       rechazo del servidor vuelve al reparto, que es donde se corrige. */
    const [confirming, setConfirming] = useState(false)
    const [lastError, setLastError] = useState(error)
    if (error !== lastError) {
        setLastError(error)
        if (error) setConfirming(false)
    }

    const cases = activeCases.cases
    const reassignment = syncReassignment(draft, cases.map((c) => c.id))
    const pending = pendingCaseIds(reassignment)
    const pendingSet = new Set(pending)
    // Lo marcado que sigue sin asignar: lo asignado o lo que ya no está se descarta.
    const marked = [...selected].filter((id) => pendingSet.has(id))

    // Un abogado dado de baja no figura en `GET /lawyers`; el que se da de baja, tampoco (CA-15.3).
    const targets = (targetsQuery.data?.data ?? []).filter((l) => l.id !== lawyer.id)
    const caseById = new Map(cases.map((c) => [c.id, c]))

    const loading = activeCases.isPending || linkedUser.isPending || targetsQuery.isPending
    const failedQuery = activeCases.isError
        ? activeCases
        : linkedUser.isError
            ? linkedUser
            : targetsQuery.isError
                ? targetsQuery
                : null

    const notice = linkedUser.data !== undefined ? linkedUserNotice(linkedUser.data) : null
    const count = cases.length
    const ready = !loading && failedQuery === null

    /* Las que se confirman sin asignar quedan sin responsable (D-143): la
       confirmación las lista antes de enviar (V6 §3.3). */
    const orphaned = pending
    const needsConfirmation = notice !== null || orphaned.length > 0

    function toggle(id: number) {
        setSelected((s) => {
            const next = new Set(s)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    function toggleAll() {
        setSelected(marked.length === pending.length ? new Set() : new Set(pending))
    }

    function assignTo(lawyerId: number) {
        setDraft(assign(reassignment, marked, lawyerId))
        setSelected(new Set())
    }

    function confirm() {
        if (!ready) return
        /* Con usuario vinculado (CA-15.5) o con causas que quedan sin asignar
           (D-143), primero se avisa y se confirma. */
        if (needsConfirmation && !confirming) {
            setConfirming(true)
            return
        }
        onConfirm(reassignment, new Map(targets.map((t) => [t.id, t.lastName])))
    }

    if (confirming && needsConfirmation) {
        return (
            <FormModal
                title="Eliminar abogado"
                sub={lawyerLabel(lawyer)}
                tone="danger"
                width="sm"
                note={notice ?? undefined}
                values={{}}
                onChange={() => {}}
                okLabel="Confirmar y eliminar"
                cancelLabel="Volver"
                okDisabled={saving}
                onConfirm={confirm}
                onCancel={() => setConfirming(false)}
            >
                <div className="vz-reassign__summary">
                    <p className="vz-reassign__confirm">{confirmText(formatPersonName(lawyer), count - orphaned.length)}</p>
                    {/* D-143: las que se confirman sin asignar quedan huérfanas. */}
                    {orphaned.length > 0 && (
                        <section className="vz-reassign__orphans" aria-labelledby="reassign-orphans">
                            <span className="vz-reassign__label" id="reassign-orphans">
                                {orphaned.length === 1 ? 'Queda sin asignar' : 'Quedan sin asignar'} · {orphaned.length}
                            </span>
                            <p className="vz-reassign__hint">
                                Sin responsable hasta que se {orphaned.length === 1 ? 'la reasigne' : 'las reasigne'}.
                            </p>
                            <ul className="vz-reassign__orphan-list" aria-label="Causas que quedan sin asignar">
                                {orphaned.map((id) => {
                                    const c = caseById.get(id) as LawyerCase
                                    return (
                                        <li key={id}>
                                            <span className="vz-reassign__assigned-caption" title={c.caption}>{c.caption}</span>
                                            <span className="vz-reassign__sac">{c.sacNumber ?? 'Sin SAC'}</span>
                                        </li>
                                    )
                                })}
                            </ul>
                        </section>
                    )}
                </div>
            </FormModal>
        )
    }

    const note = !ready
        ? undefined
        : count === 0
            ? 'No tiene causas activas: se da de baja sin reparto. Su historial se conserva.'
            : `Tiene ${count} ${count === 1 ? 'causa activa' : 'causas activas'}. Las que no asignes quedan sin responsable.`

    return (
        <FormModal
            title="Eliminar abogado"
            sub={lawyerLabel(lawyer)}
            tone="danger"
            width={count > 0 ? 'lg' : 'sm'}
            note={note}
            values={{}}
            onChange={() => {}}
            okLabel={count > 0 ? 'Eliminar y reasignar' : 'Eliminar'}
            okDisabled={saving || !ready}
            onConfirm={confirm}
            onCancel={onCancel}
        >
            {loading && (
                <LoadingState label="Cargando las causas del abogado…">
                    <Skeleton shape="block" />
                </LoadingState>
            )}

            {!loading && failedQuery !== null && (
                <LoadError
                    title="No se pudieron cargar los datos para la baja"
                    error={failedQuery.error}
                    onRetry={() => void failedQuery.refetch()}
                    retrying={failedQuery.isFetching}
                />
            )}

            {ready && count > 0 && (
                <div className="vz-reassign" role="group" aria-label="Reasignar sus causas">
                    <section className="vz-reassign__col" aria-labelledby="reassign-pending">
                        <div className="vz-reassign__head">
                            <span className="vz-reassign__label" id="reassign-pending">
                                Sin asignar · {pending.length} de {count}
                            </span>
                            {pending.length > 0 && (
                                <button type="button" className="vz-link-button" onClick={toggleAll}>
                                    {marked.length === pending.length ? 'Desmarcar todas' : 'Marcar todas'}
                                </button>
                            )}
                        </div>
                        {pending.length > 0 ? (
                            <ul className="vz-reassign__list">
                                {pending.map((id) => {
                                    const c = caseById.get(id) as LawyerCase
                                    return (
                                        <li key={id}>
                                            <label className="vz-reassign__case">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(id)}
                                                    onChange={() => toggle(id)}
                                                />
                                                <span>
                                                    <span className="vz-reassign__caption">{c.caption}</span>
                                                    <span className="vz-reassign__sac">{sacText(c)}</span>
                                                </span>
                                            </label>
                                        </li>
                                    )
                                })}
                            </ul>
                        ) : (
                            <p className="vz-reassign__done">Todas las causas tienen abogado asignado.</p>
                        )}
                    </section>

                    <section className="vz-reassign__col" aria-labelledby="reassign-targets">
                        <div className="vz-reassign__head">
                            <span className="vz-reassign__label" id="reassign-targets">Pasan a</span>
                        </div>
                        <div className="vz-reassign__targets">
                        {targets.length === 0 && (
                            <p className="vz-reassign__done">No hay otro abogado vigente al que reasignarle las causas.</p>
                        )}
                        {targets.map((target) => {
                            const assigned = caseIdsFor(reassignment, target.id)
                            return (
                                <TargetBlock
                                    key={target.id}
                                    name={formatPersonName(target)}
                                    detail={<>
                                        Causas activas:{' '}
                                        {assigned.length > 0
                                            ? `${target.activeCases} → ${target.activeCases + assigned.length}`
                                            : target.activeCases}
                                    </>}
                                    assigned={assigned}
                                    marked={marked.length}
                                    caseById={caseById}
                                    onAssign={() => assignTo(target.id)}
                                    onRelease={(ids) => setDraft(unassign(reassignment, ids))}
                                />
                            )
                        })}
                        </div>
                    </section>
                </div>
            )}

            {error && (
                <div role="alert">
                    <FieldError message={error} />
                </div>
            )}
        </FormModal>
    )
}

interface TargetBlockProps {
    name: string
    detail: ReactNode
    /** Las causas que ya van a este destino. */
    assigned: number[]
    /** Cuántas hay marcadas en "Sin asignar". */
    marked: number
    caseById: ReadonlyMap<number, LawyerCase>
    onAssign: () => void
    /** Las vuelve a "Sin asignar". */
    onRelease: (caseIds: number[]) => void
}

/** Un abogado de "Pasan a", con las causas que ya van a él. */
function TargetBlock({ name, detail, assigned, marked, caseById, onAssign, onRelease }: TargetBlockProps) {
    return (
        <div className="vz-reassign__target">
            <div className="vz-reassign__target-head">
                <div className="vz-reassign__target-name">
                    <div>{name}</div>
                    <div className="vz-reassign__load">{detail}</div>
                </div>
                {marked > 0 && (
                    <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Asignar ${marked} a ${name}`}
                        onClick={onAssign}
                    >
                        Asignar {marked}
                    </Button>
                )}
                {assigned.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Quitar todas las de ${name}`}
                        onClick={() => onRelease(assigned)}
                    >
                        Quitar todas
                    </Button>
                )}
            </div>
            {assigned.length > 0 && (
                <ul className="vz-reassign__assigned">
                    {assigned.map((id) => {
                        const c = caseById.get(id) as LawyerCase
                        return (
                            <li key={id}>
                                <span className="vz-reassign__sac">{c.sacNumber ?? 'Sin SAC'}</span>
                                <span className="vz-reassign__assigned-caption" title={c.caption}>{c.caption}</span>
                                <IconButton
                                    name="close"
                                    label={`Quitar ${c.caption}`}
                                    className="vz-reassign__remove"
                                    onClick={() => onRelease([id])}
                                />
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

/**
 * La línea de la confirmación: cuántas se reasignan y la baja. Las que quedan
 * sin asignar van aparte, en su lista.
 */
function confirmText(name: string, reassigned: number): string {
    const end = `se da de baja a ${name}. Su historial se conserva.`
    if (reassigned === 0) return `Se da de baja a ${name}. Su historial se conserva.`
    return `Se ${reassigned === 1 ? 'reasigna 1 causa' : `reasignan ${reassigned} causas`} y ${end}`
}

function sacText(c: LawyerCase): string {
    return c.sacNumber ? `SAC ${c.sacNumber}` : 'Sin SAC'
}
