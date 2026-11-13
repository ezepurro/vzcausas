import { Button } from '@/shared/components/ui'
import { FieldError, SearchSelect, TextInput, type SearchSelectOption } from '@/shared/components/forms'
import { SEARCH_MAX_LENGTH } from '@/shared/components/ui/SearchInput'
import { formatDate } from '@/shared/lib/dates'
import { formatPrescription, type LegalQualification } from '@/features/legal-params'

/** Una calificación ya elegida, con la fecha del hecho que se va cargando. */
export type SelectedQualification = AvailableQualification | UnavailableQualification

export type AvailableQualification = Pick<LegalQualification, 'id' | 'name' | 'prescriptionMonths'> & {
    unavailable?: false
    /** `YYYY-MM-DD`, o `''` mientras no se cargó. */
    offenseDate: string
    /**
     * D-113: la fecha de su prescripción declarada, en "Modificar causa". Una
     * declarada no se quita ni cambia la fecha del hecho (CA-33.18): la fila se
     * muestra fija.
     */
    prescribedOn?: string
}

/**
 * Una elegida que ya no está entre las vigentes: se dio de baja mientras se
 * cargaba la causa, o venía en un borrador. No hay nombre ni plazo que
 * mostrar, pero la fila se dibuja igual: es la única forma de poder quitarla.
 * Si se registra con ella, el backend la rechaza sobre el campo (CA-18.10).
 */
export type UnavailableQualification = {
    id: number
    unavailable: true
    offenseDate: string
}

export interface LegalQualificationPickerProps {
    /** Para el `htmlFor` del `Field` que lo envuelve: es el id del select. */
    id: string
    /** Las ya elegidas, con su plazo y su fecha del hecho, en el orden en que se agregaron. */
    selected: SelectedQualification[]
    /** Las que se pueden agregar: vigentes y todavía no elegidas. */
    options: SearchSelectOption[]
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
    /** Lo que se escribe en el selector, para buscar en el servidor. */
    onSearch?: (text: string) => void
    loading?: boolean
    /** "Se muestran 100 de 240 calificaciones…", o `null` si están todas. */
    note?: string | null
    /** El error y la nota del campo (`controlA11y`): van al selector de "Agregar calificación…". */
    'aria-invalid'?: boolean
    'aria-describedby'?: string
    'aria-required'?: boolean
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
    onCreate, onSearch, loading, note,
    'aria-invalid': ariaInvalid, 'aria-describedby': ariaDescribedBy, 'aria-required': ariaRequired,
}: LegalQualificationPickerProps) {
    return (
        <div className="vz-picker">
            {selected.length > 0 && (
                <div className="vz-picker__list">
                    {selected.map((q) => {
                        if (q.unavailable) {
                            return (
                                <div key={q.id} className="vz-picker__item">
                                    <div className="vz-picker__main">
                                        <div className="vz-picker__name">Calificación dada de baja</div>
                                        <div className="vz-picker__term">
                                            Ya no está vigente: quitala para poder registrar la causa.
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost-danger"
                                        size="sm"
                                        aria-label="Quitar calificación dada de baja"
                                        onClick={() => onRemove(q.id)}
                                    >
                                        Quitar
                                    </Button>
                                </div>
                            )
                        }

                        const dateId = `${id}-offense-${q.id}`
                        const dateError = dateErrors[q.id]
                        const locked = q.prescribedOn !== undefined

                        return (
                            <div key={q.id} className="vz-picker__item">
                                <div className="vz-picker__main">
                                    <div className="vz-picker__name">{q.name}</div>
                                    <div className="vz-picker__term">
                                        Prescripción: <span className="vz-mono">{formatPrescription(q.prescriptionMonths)}</span>
                                    </div>
                                    {locked && (
                                        <div className="vz-picker__term">
                                            Prescripta el {formatDate(q.prescribedOn ?? null)}: no se quita ni se cambia la fecha del hecho.
                                        </div>
                                    )}
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
                                        disabled={locked}
                                        aria-label={`Fecha del hecho de ${q.name}`}
                                        aria-invalid={dateError ? true : undefined}
                                        aria-describedby={dateError ? `${dateId}-error` : undefined}
                                        onChange={(e) => onOffenseDateChange(q.id, e.target.value)}
                                    />
                                    {dateError && (
                                        <FieldError id={`${dateId}-error`} message={dateError} />
                                    )}
                                </div>

                                {!locked && (
                                    <Button
                                        variant="ghost-danger"
                                        size="sm"
                                        aria-label={`Quitar ${q.name}`}
                                        onClick={() => onRemove(q.id)}
                                    >
                                        Quitar
                                    </Button>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <div className="vz-field-row">
                {/* `value` fijo en '': cada elección se agrega a la lista de
                    arriba y el campo vuelve a quedar libre para la siguiente. */}
                <SearchSelect
                    id={id}
                    placeholder="Agregar calificación…"
                    emptyText="Ninguna calificación coincide."
                    maxLength={SEARCH_MAX_LENGTH}
                    options={options}
                    value=""
                    onSelect={(value) => {
                        if (value) onAdd(Number(value))
                    }}
                    onSearch={onSearch}
                    loading={loading}
                    note={note}
                    aria-invalid={ariaInvalid}
                    aria-describedby={ariaDescribedBy}
                    aria-required={ariaRequired}
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
