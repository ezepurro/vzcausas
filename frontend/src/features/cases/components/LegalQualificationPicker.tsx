import { Button } from '@/shared/components/ui'
import { Select, type SelectOption } from '@/shared/components/forms'
import { formatPrescription, type LegalQualification } from '@/features/legal-params'

export interface LegalQualificationPickerProps {
    /** Para el `htmlFor` del `Field` que lo envuelve: es el id del select. */
    id: string
    /** Las ya elegidas, con su plazo, en el orden en que se agregaron. */
    selected: Pick<LegalQualification, 'id' | 'name' | 'prescriptionMonths'>[]
    /** Las que se pueden agregar: vigentes y todavía no elegidas. */
    options: SelectOption[]
    onAdd: (id: number) => void
    onRemove: (id: number) => void
    /** "Registrar calificación nueva". Sin handler, el botón no se muestra. */
    onCreate?: () => void
    /** Sólo `ADMINISTRATOR` registra calificaciones (V3 D-04): para el resto, deshabilitado. */
    canCreate?: boolean
}

/**
 * Las calificaciones legales de una causa penal: la lista de las elegidas, con
 * su plazo de prescripción, y un select para agregar otra.
 *
 * Si en la causa concurren varios delitos, lleva una por cada uno y cada una
 * prescribe por su lado (V3 §3.5). El select se vuelve a "Agregar
 * calificación…" después de cada elección: no guarda valor, sólo avisa.
 */
export function LegalQualificationPicker({
    id, selected, options, onAdd, onRemove, onCreate, canCreate = true,
}: LegalQualificationPickerProps) {
    return (
        <div className="vz-picker">
            {selected.length > 0 && (
                <div className="vz-picker__list">
                    {selected.map((q) => (
                        <div key={q.id} className="vz-picker__item">
                            <div>
                                <div className="vz-picker__name">{q.name}</div>
                                <div className="vz-picker__term">
                                    Prescripción: <span className="vz-mono">{formatPrescription(q.prescriptionMonths)}</span>
                                </div>
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
                    ))}
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
                        disabled={!canCreate}
                        title={canCreate ? undefined : 'Sólo el Administrador puede registrar calificaciones.'}
                        onClick={onCreate}
                    >
                        Registrar calificación nueva
                    </Button>
                )}
            </div>
        </div>
    )
}
