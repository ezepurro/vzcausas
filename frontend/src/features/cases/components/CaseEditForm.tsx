import { useRef } from 'react'
import { Button, Modal } from '@/shared/components/ui'
import {
    Checkbox,
    Field,
    FormSection,
    SegmentedControl,
    Select,
    Textarea,
    TextInput,
    type SelectOption,
} from '@/shared/components/forms'
import { useFocusFirstError } from '@/shared/hooks/useFocusFirstError'
import { todayIsoDate } from '@/shared/lib/dates'
import { JURISDICTION_LABELS } from '@/features/legal-params'
import {
    PROCEDURAL_ROLE_LABELS,
    PROCEDURAL_ROLES_BY_JURISDICTION,
    type CaseFormValues,
    type ProceduralRole,
} from '@/features/cases/types/case'
import { SUBJECT_MATTER_MAX, type CaseFormErrors } from '@/features/cases/schemas/case.schema'
import { HarmfulActFields } from '@/features/cases/components/CaseForm'
import { SUBJECT_MATTER_TEXT } from '@/features/cases/utils/subjectMatter'
import {
    LegalQualificationPicker,
    type SelectedQualification,
} from '@/features/cases/components/LegalQualificationPicker'

export interface CaseEditFormProps {
    /** Bajo el título: "SAC 13284571" o "Sin N° de SAC", el de la causa abierta. */
    sub: string
    values: CaseFormValues
    errors: CaseFormErrors
    /** Cada campo, salvo el SAC y el cliente. */
    onChange: <K extends keyof CaseFormValues>(key: K, value: CaseFormValues[K]) => void
    /** El SAC va aparte porque arrastra la fecha de inicio (`changeSacNumber`). */
    onSacNumberChange: (sacNumber: string) => void
    /** El cliente va aparte porque propone la carátula nueva (`captionWithClient`, D-105). */
    onClientChange: (clientId: string) => void
    /** Los clientes, ya armados: `value` el id, `label` "GÓMEZ, Ariel Fernando · DNI …". */
    clientOptions: SelectOption[]
    /** Los abogados vigentes, ya armados. */
    lawyerOptions: SelectOption[]
    /** Las calificaciones de la causa, con su nombre, su plazo y su fecha del hecho. */
    selectedQualifications: SelectedQualification[]
    /** Las que todavía se pueden agregar. */
    qualificationOptions: SelectOption[]
    onAddQualification: (id: number) => void
    onRemoveQualification: (id: number) => void
    onOffenseDateChange: (id: number, offenseDate: string) => void
    /** true mientras la mutación está en vuelo: bloquea el confirmar. */
    saving: boolean
    onConfirm: () => void
    onCancel: () => void
}

/**
 * El diálogo "Modificar causa" (HU19), en tres grupos como el prototipo:
 * identificación, cliente y rol procesal, y asignación.
 *
 * Los controles son los del alta (`CaseForm`): el rol procesal con botones y el
 * objeto con el rótulo de su fuero (decisión del 28/10/2026). El campo `court`
 * se llama "Órgano interviniente" (V5 §3.7, D-91).
 *
 * El fuero se muestra pero no se modifica (D-95). No están "Registrar cliente
 * nuevo" ni las casillas de la carpeta: la carpeta sigue a la causa sola
 * (D-104) y tiene su propio endpoint.
 *
 * No valida ni guarda: recibe los errores ya calculados y avisa con
 * `onConfirm`.
 */
export function CaseEditForm({
    sub, values, errors, onChange, onSacNumberChange, onClientChange,
    clientOptions, lawyerOptions,
    selectedQualifications, qualificationOptions, onAddQualification, onRemoveQualification,
    onOffenseDateChange, saving, onConfirm, onCancel,
}: CaseEditFormProps) {
    const body = useRef<HTMLDivElement>(null)
    /* El cuerpo del diálogo tiene su propio scroll: si hay errores, sean de
       `validateCase` o del servidor, se lleva al primero. */
    const focusErrors = useFocusFirstError(body, errors)

    const hasSac = values.sacNumber.trim() !== ''
    const roleOptions: SelectOption[] = PROCEDURAL_ROLES_BY_JURISDICTION[values.jurisdiction].map(
        (role) => ({ value: role, label: PROCEDURAL_ROLE_LABELS[role] }),
    )

    function confirm() {
        focusErrors()
        onConfirm()
    }

    return (
        <Modal
            title="Modificar causa"
            sub={sub}
            width="lg"
            onClose={onCancel}
            footer={
                <>
                    <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
                    <Button disabled={saving} onClick={confirm}>Guardar cambios</Button>
                </>
            }
        >
            <p className="vz-modal__note">
                Cada cambio queda asentado en el historial de la causa con usuario y fecha.
            </p>

            <div className="vz-form-grid" ref={body}>
                <FormSection label="Identificación" />

                <Field label="N° de SAC" width="half" htmlFor="edit-case-sac" error={errors.sacNumber}
                    note="Opcional. Identifica la causa de forma única.">
                    <TextInput
                        id="edit-case-sac"
                        mono
                        inputMode="numeric"
                        maxLength={8}
                        placeholder="8 dígitos"
                        value={values.sacNumber}
                        onChange={(e) => onSacNumberChange(e.target.value)}
                    />
                </Field>

                {/* Se muestra, pero no es un select: no se modifica (D-95). */}
                <Field label="Fuero" width="half" htmlFor="edit-case-jurisdiction"
                    note="No se modifica. Si la causa se registró en otro fuero, dala de baja y registrala de nuevo.">
                    <TextInput
                        id="edit-case-jurisdiction"
                        readOnly
                        value={JURISDICTION_LABELS[values.jurisdiction]}
                    />
                </Field>

                <Field label="Carátula" required htmlFor="edit-case-caption" error={errors.caption}>
                    <TextInput
                        id="edit-case-caption"
                        value={values.caption}
                        onChange={(e) => onChange('caption', e.target.value)}
                    />
                </Field>

                <Field label="Órgano interviniente" htmlFor="edit-case-court" error={errors.court}>
                    <TextInput
                        id="edit-case-court"
                        placeholder="Juzgado de Control N° 3 · Córdoba"
                        value={values.court}
                        onChange={(e) => onChange('court', e.target.value)}
                    />
                </Field>

                <div className="vz-form-row3">
                    <Field label="Instructor de la causa" htmlFor="edit-case-instructor"
                        error={errors.instructorName}>
                        <TextInput
                            id="edit-case-instructor"
                            placeholder="Apellido y nombre del instructor"
                            value={values.instructorName}
                            onChange={(e) => onChange('instructorName', e.target.value)}
                        />
                    </Field>

                    <Field label="Teléfono" htmlFor="edit-case-tribunal-phone" error={errors.tribunalPhone}>
                        <TextInput
                            id="edit-case-tribunal-phone"
                            type="tel"
                            mono
                            placeholder="0351 448-1200"
                            value={values.tribunalPhone}
                            onChange={(e) => onChange('tribunalPhone', e.target.value)}
                        />
                    </Field>

                    <Field label="Interno" htmlFor="edit-case-instructor-extension" error={errors.instructorExtension}>
                        <TextInput
                            id="edit-case-instructor-extension"
                            mono
                            inputMode="numeric"
                            maxLength={20}
                            placeholder="214"
                            value={values.instructorExtension}
                            onChange={(e) => onChange('instructorExtension', e.target.value)}
                        />
                    </Field>
                </div>

                <FormSection label="Cliente y rol procesal" />

                <Field label="Cliente" required htmlFor="edit-case-client" error={errors.clientId}
                    note="Si lo cambiás, se propone la carátula con el cliente nuevo.">
                    <Select
                        id="edit-case-client"
                        options={clientOptions}
                        value={values.clientId}
                        onChange={(e) => onClientChange(e.target.value)}
                    />
                </Field>

                <Field label="Rol procesal del cliente" required error={errors.proceduralRole}>
                    <SegmentedControl
                        aria-label="Rol procesal del cliente"
                        options={roleOptions}
                        value={values.proceduralRole}
                        onChange={(value) => onChange('proceduralRole', value as ProceduralRole)}
                    />
                </Field>

                {values.jurisdiction === 'CRIMINAL' && (
                    <>
                        <Field
                            label="Calificaciones legales"
                            htmlFor="edit-case-qualifications"
                            error={errors.legalQualifications}
                            note="Si concurren varios delitos, una calificación por cada uno. Cada una recalcula su prescripción desde la fecha del hecho."
                        >
                            <LegalQualificationPicker
                                id="edit-case-qualifications"
                                selected={selectedQualifications}
                                options={qualificationOptions}
                                onAdd={onAddQualification}
                                onRemove={onRemoveQualification}
                                onOffenseDateChange={onOffenseDateChange}
                                dateErrors={errors.offenseDates}
                                maxDate={todayIsoDate()}
                            />
                        </Field>

                        <div className="vz-field vz-col-full">
                            <Checkbox
                                label="Preso: el cliente está detenido."
                                checked={values.clientDetained}
                                onChange={(e) => onChange('clientDetained', e.target.checked)}
                            />
                        </div>
                    </>
                )}

                {values.jurisdiction !== 'CRIMINAL' && (
                    <>
                        <Field label="Contraparte u organismo" htmlFor="edit-case-counterparty" error={errors.counterparty}>
                            <TextInput
                                id="edit-case-counterparty"
                                placeholder="APROSS, Provincia de Córdoba, Tribunal de Conducta…"
                                value={values.counterparty}
                                onChange={(e) => onChange('counterparty', e.target.value)}
                            />
                        </Field>

                        <Field
                            label={SUBJECT_MATTER_TEXT[values.jurisdiction].label}
                            required
                            htmlFor="edit-case-subject"
                            hint={`${values.subjectMatter.length} / ${SUBJECT_MATTER_MAX}`}
                            error={errors.subjectMatter}
                            note="Qué se reclama y por qué: el acto o la omisión que origina la causa y lo que se pide."
                        >
                            <Textarea
                                id="edit-case-subject"
                                rows={4}
                                maxLength={SUBJECT_MATTER_MAX}
                                placeholder={SUBJECT_MATTER_TEXT[values.jurisdiction].placeholder}
                                value={values.subjectMatter}
                                onChange={(e) => onChange('subjectMatter', e.target.value)}
                            />
                        </Field>
                    </>
                )}

                {values.jurisdiction === 'ADMINISTRATIVE' && (
                    <Field label="Agotamiento de la vía administrativa" width="half"
                        htmlFor="edit-case-remedy-exhausted" error={errors.administrativeRemedyExhaustedOn}
                        note="Opcional. Dejalo vacío mientras la vía no se agotó.">
                        <TextInput
                            id="edit-case-remedy-exhausted"
                            type="date"
                            mono
                            max={todayIsoDate()}
                            value={values.administrativeRemedyExhaustedOn}
                            onChange={(e) => onChange('administrativeRemedyExhaustedOn', e.target.value)}
                        />
                    </Field>
                )}

                {/* Los mismos datos del amparo que en el alta (decisión del 28/10/2026). */}
                {values.jurisdiction === 'AMPARO' && (
                    <HarmfulActFields values={values} errors={errors} onChange={onChange} />
                )}

                <FormSection label="Asignación" />

                <Field label="Abogado responsable" required width="half" htmlFor="edit-case-lawyer"
                    error={errors.responsibleLawyerId}>
                    <Select
                        id="edit-case-lawyer"
                        options={lawyerOptions}
                        value={values.responsibleLawyerId}
                        onChange={(e) => onChange('responsibleLawyerId', e.target.value)}
                    />
                </Field>

                {/* Va con el SAC (CA-19.6), igual que en el alta. */}
                <Field label="Fecha de inicio" required={hasSac} width="half" htmlFor="edit-case-start"
                    error={errors.startDate}
                    note={hasSac ? undefined : 'Se carga junto con el N° de SAC.'}>
                    <TextInput
                        id="edit-case-start"
                        type="date"
                        mono
                        disabled={!hasSac}
                        value={values.startDate}
                        onChange={(e) => onChange('startDate', e.target.value)}
                    />
                </Field>

                <div className="vz-field vz-col-full">
                    <Checkbox
                        label="Tasa de justicia pagada"
                        checked={values.courtFeePaid}
                        onChange={(e) => onChange('courtFeePaid', e.target.checked)}
                    />
                </div>
            </div>
        </Modal>
    )
}