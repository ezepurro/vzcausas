import type { FormEvent } from 'react'
import { Button, Panel } from '@/shared/components/ui'
import {
    Combobox,
    Field,
    FormSection,
    Textarea,
    TextInput,
    type ComboboxOption,
} from '@/shared/components/forms'
import { JURISDICTION_LABELS, type Jurisdiction } from '@/features/legal-params'
import type { ProceduralActFormValues } from '@/features/proceedings/types/proceduralAct'
import type { ProceduralActErrors } from '@/features/proceedings/schemas/proceduralAct.schema'

export interface ProceduralActFormProps {
    values: ProceduralActFormValues
    errors: ProceduralActErrors
    /** El fuero de la causa: habilita la fecha de notificación y nombra la tabla. */
    jurisdiction: Jurisdiction
    /** Las opciones del combobox, ya filtradas por lo escrito (`utils/stateOptions`). */
    stateOptions: ComboboxOption[]
    /** Cada tecla en el combobox: la pantalla guarda el texto y limpia el id elegido. */
    onStateTextChange: (text: string) => void
    /** Eligieron un estado de la lista. */
    onStateSelect: (option: ComboboxOption) => void
    onChange: <K extends keyof ProceduralActFormValues>(key: K, value: ProceduralActFormValues[K]) => void
    /**
     * `true` si lo escrito no es un estado de la tabla: se va a guardar como
     * estado escrito a mano. Lo decide la pantalla con `findStateByName`.
     */
    customState: boolean
    /** true mientras la mutación está en vuelo: bloquea el confirmar */
    saving: boolean
    /** "Registrar acto" o, al modificar (HU28), "Guardar cambios". */
    submitLabel: string
    /** Debajo del título del panel. Al modificar dice qué acto y que el cambio queda asentado. */
    sub?: string
    onConfirm: () => void
    onCancel: () => void
}

/**
 * El formulario de "Registrar acto procesal" (HU26), que es también el de
 * "Modificar acto procesal" (HU28, V5 §3.8): a qué estado pasa la
 * causa, las fechas y las observaciones. El cómputo del plazo va al costado,
 * en `DeadlinePreviewAside`.
 *
 * No valida ni guarda: recibe los errores ya calculados y avisa con
 * `onConfirm`.
 *
 * Lo registra sólo el abogado y se aplica a la causa en el momento (V3 D-13).
 * La nota de RN13 que el prototipo le muestra a la Secretaría ("el estado
 * queda pendiente de confirmación") no está: ese flujo no existe, y a quien no
 * tiene el rol la pantalla no le ofrece registrar actos.
 *
 * "Adjuntar cédula o comprobante" no está: el adjunto va a la carpeta de
 * Drive de la causa, que llega con HU39 en el Sprint 3 (V3 §8.3).
 */
export function ProceduralActForm({
    values, errors, jurisdiction, stateOptions, onStateTextChange, onStateSelect, onChange,
    customState, saving, submitLabel, sub, onConfirm, onCancel,
}: ProceduralActFormProps) {
    const administrative = jurisdiction === 'ADMINISTRATIVE'

    function handleSubmit(event: FormEvent) {
        event.preventDefault()
        onConfirm()
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            <Panel
                title="Datos del acto procesal"
                sub={sub}
                footer={
                    <div className="vz-form-actions">
                        <Button variant="secondary" size="md" onClick={onCancel}>Cancelar</Button>
                        <Button type="submit" size="md" disabled={saving}>{submitLabel}</Button>
                    </div>
                }
            >
                <div className="vz-panel__body vz-form-grid">
                    <Field
                        label="Estado procesal al que pasa la causa"
                        required
                        htmlFor="act-state"
                        error={errors.stateText}
                        note={
                            customState
                                ? 'Estado escrito a mano: queda guardado sólo en esta causa, no se agrega a la tabla de estados del fuero y no tiene plazo asociado. Si corresponde, cargá el vencimiento con el ajuste manual.'
                                : `El acto procesal es el que mueve la causa: elegí el estado al que la lleva y el plazo sale de la tabla del fuero ${JURISDICTION_LABELS[jurisdiction]}.`
                        }
                    >
                        <Combobox
                            id="act-state"
                            value={values.stateText}
                            onChange={onStateTextChange}
                            onSelect={onStateSelect}
                            options={stateOptions}
                            placeholder="Elegí de la lista o escribí el estado"
                            emptyText="Ningún estado de la tabla coincide: se va a guardar como escrito a mano."
                        />
                    </Field>

                    <FormSection label="Fechas" />

                    <Field label="Fecha del acto" required width="half" htmlFor="act-date" error={errors.actDate}>
                        <TextInput
                            id="act-date"
                            type="date"
                            mono
                            value={values.actDate}
                            onChange={(e) => onChange('actDate', e.target.value)}
                        />
                    </Field>

                    <Field
                        label="Fecha de notificación"
                        required={administrative}
                        width="half"
                        htmlFor="act-notification"
                        error={errors.notificationDate}
                        note={
                            administrative
                                ? 'En el fuero administrativo el plazo corre desde la notificación.'
                                : 'Sólo en el fuero administrativo.'
                        }
                    >
                        <TextInput
                            id="act-notification"
                            type="date"
                            mono
                            disabled={!administrative}
                            value={values.notificationDate}
                            onChange={(e) => onChange('notificationDate', e.target.value)}
                        />
                    </Field>

                    <Field label="Observaciones" htmlFor="act-notes" error={errors.notes}>
                        <Textarea
                            id="act-notes"
                            rows={3}
                            placeholder="Situaciones que el estado procesal no alcanza a expresar. Por ejemplo: con acusación, pero con oposición."
                            value={values.notes}
                            onChange={(e) => onChange('notes', e.target.value)}
                        />
                    </Field>
                </div>
            </Panel>
        </form>
    )
}
