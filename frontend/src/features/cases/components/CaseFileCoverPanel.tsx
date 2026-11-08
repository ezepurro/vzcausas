import { Field, Textarea } from '@/shared/components/forms'
import { Button, Panel } from '@/shared/components/ui'
import { COVER_TEXT_MAX, type CaseFileFormErrors } from '@/features/cases/schemas/caseFile.schema'
import type { CaseFileFormValues } from '@/features/cases/types/caseFile'
import type { OpposingPartyField } from '@/features/cases/utils/caseFile'

export interface CaseFileCoverPanelProps {
    /** "Penal" o "Administrativo" (D-93). */
    templateLabel: string
    /** La parte que la causa penal no registra; `null` fuera del penal (D-92). */
    partyField: OpposingPartyField | null
    values: CaseFileFormValues
    errors: CaseFileFormErrors
    onChange: (key: keyof CaseFileFormValues, value: string) => void
    onPreview: () => void
    /**
     * "Modificá los datos de la causa", o `null` si el usuario no puede
     * modificarla (un abogado que no es el responsable, D-110): ahí el atajo
     * no se ofrece, aunque el expediente sí lo genere.
     */
    onEditCase: (() => void) | null
}

/**
 * La sección "Carátula" de "Generar expediente" (HU25): la hoja 1, que no se
 * elige ni se quita, con su "Vista previa" (HU24) y los dos datos que la causa
 * no tiene. Nada de esto se guarda en la causa (D-92).
 */
export function CaseFileCoverPanel({
    templateLabel,
    partyField,
    values,
    errors,
    onChange,
    onPreview,
    onEditCase,
}: CaseFileCoverPanelProps) {
    return (
        <Panel title="Carátula">
            <div className="vz-panel__body vz-casefile__body">
                <div className="vz-casefile__item">
                    <span className="vz-casefile__order">1</span>
                    <span className="vz-casefile__type vz-casefile__type--pdf" aria-hidden="true">PDF</span>
                    <div className="vz-casefile__main">
                        <div className="vz-casefile__name">Carátula</div>
                        <div className="vz-casefile__meta">
                            Plantilla {templateLabel} · se genera con los datos de la causa
                        </div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={onPreview}>
                        Vista previa
                    </Button>
                </div>

                {partyField && (
                    <Field
                        label={partyField.label}
                        htmlFor="casefile-party"
                        hint={counter(values.opposingParty)}
                        note={partyField.note}
                        error={errors.opposingParty}
                    >
                        <Textarea
                            id="casefile-party"
                            className="vz-casefile__upper"
                            rows={2}
                            maxLength={COVER_TEXT_MAX}
                            placeholder={partyField.placeholder}
                            value={values.opposingParty}
                            onChange={(e) => onChange('opposingParty', e.target.value)}
                        />
                    </Field>
                )}

                <Field
                    label="Observaciones"
                    htmlFor="casefile-notes"
                    hint={counter(values.notes)}
                    note="Opcional. Va en el recuadro Observaciones de la carátula y no se guarda en la causa."
                    error={errors.notes}
                >
                    <Textarea
                        id="casefile-notes"
                        rows={2}
                        maxLength={COVER_TEXT_MAX}
                        placeholder="Ej. Causa conexa en DI T6"
                        value={values.notes}
                        onChange={(e) => onChange('notes', e.target.value)}
                    />
                </Field>

                {onEditCase && (
                    <p className="vz-casefile__hint">
                        ¿Hay que corregir algo en la carátula?{' '}
                        <button type="button" className="vz-casefile__link" onClick={onEditCase}>
                            Modificá los datos de la causa
                        </button>{' '}
                        y la carátula se actualiza sola.
                    </p>
                )}
            </div>
        </Panel>
    )
}

/** "120 / 500", como el prototipo. */
function counter(text: string): string {
    return `${text.length} / ${COVER_TEXT_MAX}`
}
