import { Button } from '@/shared/components/ui'
import { Select, TextInput, type SelectOption } from '@/shared/components/forms'
import { formatPrescription, type LegalQualification } from '@/features/legal-params'

/** Una calificación ya elegida, con la fecha del hecho que se va cargando. */
export type SelectedQualification = Pick<LegalQualification, 'id' | 'name' | 'prescriptionMonths'> & {
    /** `YYYY-MM-DD`, o `''` mientras no se cargó. */
    offenseDate: string
}

export interface LegalQualificationPickerProps {
    /** Para el `htmlFor` del `Field` que lo envuelve: es el id del select. */
    id: string
    /** Las ya elegidas, con su plazo y su fecha del hecho, en el orden en que se agregaron. */
    selected: SelectedQualification[]
    /** Las que se pueden agregar: vigentes y todavía no elegidas. */
    options: SelectOption[]
    onAdd: (id: number) => void
    onRemove: (id: number) => void
    /** Cambió la fecha del hecho de una calificación. */
    onOffenseDateChange: (id: number, offenseDate: string) => void
    /** El error de cada fecha del hecho, por id de calificación (`errors.offenseDates`). */
    dateErrors?: Record<number, string>
    /** Tope del selector de fecha: hoy, porque el hecho no puede ser futuro. */
    maxDate?: string
    /** "Registrar calificación nueva". Sin handler, el botón no se muestra. */
    onCreate?: () => void
}

/**
 * Las calificaciones legales de una causa penal: la lista de las elegidas,
 * cada una con su plazo de prescripción y su **fecha del hecho**, y un select
 * para agregar otra.
 *
 * Si en la causa concurren varios delitos, lleva una calificación por cada uno
 * y cada una prescribe por su lado, desde la fecha de su hecho (V3 D-19). Por
 * eso la fecha se pide en la fila y no una sola vez para toda la causa. Es
 * obligatoria (D-28): la validación la marca fila por fila.
 *
 * El select se vuelve a "Agregar calificación…" después de cada elección: no
 * guarda valor, sólo avisa.
 */
export function LegalQualificationPicker({
    id, selected, options, onAdd, onRemove, onOffenseDateChange, dateErrors = {}, maxDate,
    onCreate,
}: LegalQualificationPickerProps) {
    return (
        <div className="vz-picker">
            {selected.length > 0 && (
                <div className="vz-picker__list">
                    {selected.map((q) => {
                        const dateId = `${id}-offense-${q.id}`
                        const dateError = dateErrors[q.id]

                        return (
                            <div key={q.id} className="vz-picker__item">
                                <div className="vz-picker__main">
                                    <div className="vz-picker__name">{q.name}</div>
                                    <div className="vz-picker__term">
                                        Prescripción: <span className="vz-mono">{formatPrescription(q.prescriptionMonths)}</span>
                                    </div>
                                </div>

                                <div className={`vz-picker__date ${dateError ? 'vz-field--error' : ''}`}>
                                    <label className="vz-picker__date-label" htmlFor={dateId}>
                                        Fecha del hecho
                                        <span className="vz-label__req">*</span>
                                    </label>
                                    <TextInput
                                        id={dateId}
                                        type="date"
                                        mono
                                        max={maxDate}
                                        value={q.offenseDate}
                                        aria-label={`Fecha del hecho de ${q.name}`}
                                        aria-invalid={dateError ? true : undefined}
                                        aria-describedby={dateError ? `${dateId}-error` : undefined}
                                        onChange={(e) => onOffenseDateChange(q.id, e.target.value)}
                                    />
                                    {dateError && (
                                        <div id={`${dateId}-error`} className="vz-error">{dateError}</div>
                                    )}
                                </div>

                                <Button
                                    variant="ghost-danger"
                                    size="sm"
                                    aria-label={`Quitar ${q.name}`}
                                    onClick={() => onRemove(q.id)}
                                >
                                    Quitar
                                </Button>
                            </div>
                        )
                    })}
                </div>
            )}

            <div className="vz-field-row">
                <Select
                    id={id}
                    options={[{ value: '', label: 'Agregar calificación…' }, ...options]}
                    value=""
                    disabled={options.length === 0}
                    onChange={(e) => {
                        if (e.target.value) onAdd(Number(e.target.value))
                    }}
                />
                {onCreate && (
                    <Button
                        variant="secondary"
                        size="md"
                        onClick={onCreate}
                    >
                        Registrar calificación nueva
                    </Button>
                )}
            </div>
        </div>
    )
}
