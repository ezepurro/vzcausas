import { DetailList, Panel } from '@/shared/components/ui'
import { Checkbox, Field, TextInput } from '@/shared/components/forms'
import { formatDate, parseDateOnly } from '@/shared/lib/dates'
import type { DeadlinePreview } from '@/features/proceedings/types/proceduralAct'
import { dueDateDetail, dueDateTone } from '@/features/proceedings/utils/dueDateText'
import { termText } from '@/features/proceedings/utils/stateOptions'

/**
 * En qué punto está el cómputo. Un solo estado y no varios booleanos: no
 * puede estar "cargando" y "sin estado" a la vez.
 */
export type DeadlinePreviewState =
    /** Todavía no se eligió el estado al que pasa la causa. */
    | { kind: 'empty' }
    /** Estado escrito a mano: no tiene plazo de tabla. */
    | { kind: 'custom'; stateName: string }
    /** Falta la fecha desde la que corre el plazo (la notificación, en el administrativo). */
    | { kind: 'missing-base'; message: string }
    | { kind: 'loading' }
    | { kind: 'error'; message: string }
    | { kind: 'ready'; stateName: string; preview: DeadlinePreview }

export interface DeadlinePreviewAsideProps {
    state: DeadlinePreviewState
    /** "Ajustar el vencimiento manualmente". */
    manualDue: boolean
    manualDueDate: string
    manualDueDateError?: string
    onManualDueChange: (value: boolean) => void
    onManualDueDateChange: (value: string) => void
}

/**
 * El panel "Cómputo del plazo" de Registrar acto procesal.
 *
 * No calcula nada: muestra lo que devuelve `deadline-preview`, que existe
 * para que la fecha que se ve antes de guardar sea la misma que se guarda
 * (V3 D-20). La pantalla es la que pide el cómputo cada vez que cambian el
 * estado o las fechas, y le pasa el resultado en `state`.
 *
 * El ajuste manual está siempre disponible una vez elegido el estado: en un
 * estado escrito a mano es la única forma de que el acto tenga vencimiento.
 * Con el ajuste cargado, el recuadro "Vence el" muestra la fecha manual, que
 * es la que va a quedar vigente, y abajo la de la tabla, que el sistema
 * conserva (CA-26.5).
 *
 * De la fecha manual no se muestran los días hábiles que faltan: los cuenta
 * sólo el backend (V3 D-20) y `deadline-preview` no recibe una fecha manual.
 * Contarlos acá daría otro número el día que el backend descuente feriados
 * (P-02). Si el backend agrega ese dato, se muestra igual que el de la tabla.
 */
export function DeadlinePreviewAside({
    state, manualDue, manualDueDate, manualDueDateError, onManualDueChange, onManualDueDateChange,
}: DeadlinePreviewAsideProps) {
    // Sólo una fecha completa y válida reemplaza a la de la tabla en el recuadro.
    const manualDate = manualDue && parseDateOnly(manualDueDate) ? manualDueDate : null

    return (
        <Panel
            title="Cómputo del plazo"
            footer="El cómputo excluye sábados y domingos. La feria judicial y los feriados provinciales todavía no se descuentan."
        >
            <div className="vz-panel__body">
                <PreviewBody state={state} manualDate={manualDate} />

                {state.kind !== 'empty' && (
                    <div className="vz-summary__block">
                        <Checkbox
                            label="Ajustar el vencimiento manualmente. Queda registrado quién lo modificó."
                            checked={manualDue}
                            onChange={(e) => onManualDueChange(e.target.checked)}
                        />
                        {manualDue && (
                            <div className="vz-summary__block">
                                <Field
                                    label="Vencimiento manual"
                                    required
                                    htmlFor="act-manual-due"
                                    error={manualDueDateError}
                                >
                                    <TextInput
                                        id="act-manual-due"
                                        type="date"
                                        mono
                                        value={manualDueDate}
                                        onChange={(e) => onManualDueDateChange(e.target.value)}
                                    />
                                </Field>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Panel>
    )
}

function PreviewBody({ state, manualDate }: { state: DeadlinePreviewState; manualDate: string | null }) {
    switch (state.kind) {
        case 'empty':
            return (
                <p className="vz-muted">
                    Elegí el estado procesal al que pasa la causa y el sistema deriva el plazo
                    de la tabla parametrizada.
                </p>
            )
        case 'custom':
            return (
                <>
                    <DetailList
                        items={[
                            { label: 'Plazo de la tabla', value: 'No tiene: estado escrito a mano' },
                            { label: 'Nuevo estado procesal', value: state.stateName },
                        ]}
                    />
                    {manualDate ? (
                        <ManualDueBox date={manualDate} tableNote="El estado escrito a mano no tiene plazo de tabla." />
                    ) : (
                        <div className="vz-due vz-due--neutral">
                            <div className="vz-due__label">Vence el</div>
                            <div className="vz-due__date">—</div>
                            <div className="vz-due__detail">Sin vencimiento, salvo que lo ajustes a mano.</div>
                        </div>
                    )}
                </>
            )
        case 'missing-base':
            return (
                <div className="vz-due vz-due--warn">
                    <div className="vz-due__label">Vence el</div>
                    <div className="vz-due__date">—</div>
                    <div className="vz-due__detail">{state.message}</div>
                </div>
            )
        case 'loading':
            return <p className="vz-muted">Calculando el vencimiento…</p>
        case 'error':
            return <p className="vz-error">{state.message}</p>
        case 'ready': {
            const { preview } = state
            const opensTerm = preview.dueDate !== null
            return (
                <>
                    <DetailList
                        items={[
                            { label: 'Plazo de la tabla', value: termText(preview) },
                            { label: 'Cuenta desde', value: formatDate(preview.countsFrom), mono: true },
                            { label: 'Nuevo estado procesal', value: state.stateName },
                        ]}
                    />
                    {manualDate ? (
                        <ManualDueBox
                            date={manualDate}
                            tableNote={
                                opensTerm
                                    ? `Según la tabla vencía el ${formatDate(preview.dueDate)}.`
                                    : 'Según la tabla, este estado no abre plazo.'
                            }
                        />
                    ) : (
                        <div className={`vz-due vz-due--${dueDateTone(preview.businessDaysRemaining)}`}>
                            <div className="vz-due__label">Vence el</div>
                            <div className="vz-due__date">{opensTerm ? formatDate(preview.dueDate) : '—'}</div>
                            <div className="vz-due__detail">
                                {opensTerm && preview.dueDate
                                    ? dueDateDetail(preview.dueDate, preview.businessDaysRemaining)
                                    : 'Este acto no dispara un plazo de presentación.'}
                            </div>
                        </div>
                    )}
                </>
            )
        }
    }
}

/**
 * El vencimiento ajustado a mano: la fecha y su día de la semana, sin los
 * días hábiles que faltan (ver `DeadlinePreviewAside`). Va en tono neutro
 * porque, sin esos días, no se sabe si está cerca o lejos.
 */
function ManualDueBox({ date, tableNote }: { date: string; tableNote: string }) {
    return (
        <div className="vz-due vz-due--neutral">
            <div className="vz-due__label">Vence el · ajustado a mano</div>
            <div className="vz-due__date">{formatDate(date)}</div>
            <div className="vz-due__detail">{dueDateDetail(date, null)}</div>
            <div className="vz-due__detail">{tableNote}</div>
            <div className="vz-due__detail">Los días hábiles que faltan se ven en la causa, al registrar.</div>
        </div>
    )
}
