import type { FormEvent } from 'react'
import { SUBJECT_MATTER_TEXT } from '@/features/cases/utils/subjectMatter'
import { Button, Panel } from '@/shared/components/ui'
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
import { todayIsoDate } from '@/shared/lib/dates'
import {
    DAY_TYPE_LABELS,
    JURISDICTION_LABELS,
    JURISDICTIONS,
    type Jurisdiction,
} from '@/features/legal-params'
import {
    PROCEDURAL_ROLE_LABELS,
    PROCEDURAL_ROLES_BY_JURISDICTION,
    type CaseFormValues,
    type ProceduralRole,
} from '@/features/cases/types/case'
import { SUBJECT_MATTER_MAX, type CaseFormErrors } from '@/features/cases/schemas/case.schema'
import {
    LegalQualificationPicker,
    type SelectedQualification,
} from '@/features/cases/components/LegalQualificationPicker'

export interface CaseFormProps {
    values: CaseFormValues
    errors: CaseFormErrors
    /** Cada campo, salvo el SAC, el fuero y las calificaciones. */
    onChange: <K extends keyof CaseFormValues>(key: K, value: CaseFormValues[K]) => void
    /**
     * El SAC va aparte porque arrastra la fecha de inicio: la pantalla aplica
     * `changeSacNumber` de `utils/caseForm`.
     */
    onSacNumberChange: (sacNumber: string) => void
    /**
     * El fuero va aparte porque arrastra otros campos: la pantalla aplica
     * `changeJurisdiction` de `utils/caseForm`.
     */
    onJurisdictionChange: (jurisdiction: Jurisdiction) => void
    /**
     * "Crear la carpeta" va aparte porque arrastra "Copiar los modelos": la
     * pantalla aplica `changeCreateFolder` de `utils/caseForm`.
     */
    onCreateFolderChange: (createFolder: boolean) => void
    /**
     * "6 modelos parametrizados para el fuero Penal.", bajo "Copiar los
     * modelos". `null` para no mostrar el número: la Secretaría no consulta
     * modelos (CA-40.10), o todavía no llegó.
     */
    templatesNote: string | null
    /** Los clientes, ya armados: `value` el id, `label` "GÓMEZ, Ariel Fernando · DNI …". */
    clientOptions: SelectOption[]
    /** Los abogados vigentes, ya armados. */
    lawyerOptions: SelectOption[]
    /**
     * Las calificaciones elegidas, resueltas a partir de
     * `values.legalQualifications`: cada una con su nombre, su plazo y la fecha
     * del hecho cargada hasta ahora.
     */
    selectedQualifications: SelectedQualification[]
    /** Las que todavía se pueden agregar. */
    qualificationOptions: SelectOption[]
    onAddQualification: (id: number) => void
    onRemoveQualification: (id: number) => void
    onOffenseDateChange: (id: number, offenseDate: string) => void
    /** "Registrar cliente nuevo". */
    onNewClient: () => void
    /** "Registrar calificación nueva". */
    onNewQualification: () => void
    /** true mientras la mutación está en vuelo: bloquea el confirmar */
    saving: boolean
    onConfirm: () => void
    onCancel: () => void
}

const JURISDICTION_OPTIONS: SelectOption[] = JURISDICTIONS.map((j) => ({
    value: j,
    label: JURISDICTION_LABELS[j],
}))

/** Cómo se cuentan los días del plazo del acto lesivo: hábiles o corridos (V4 D-67). */
const TERM_DAY_TYPE_OPTIONS: SelectOption[] = (['BUSINESS', 'CONSECUTIVE'] as const).map((d) => ({
    value: d,
    label: DAY_TYPE_LABELS[d],
}))

/**
 * El formulario de "Registrar causa" (HU18), en tres secciones como el
 * prototipo: identificación, cliente y rol procesal, y asignación.
 *
 * No valida ni guarda: recibe los errores ya calculados y avisa con
 * `onConfirm`. Lo que depende del fuero lo decide con `values.jurisdiction`:
 * en el penal pide calificaciones legales, cada una con la fecha de su hecho;
 * en los otros dos, la contraparte y el objeto del reclamo o del amparo.
 *
 * Desde V4 pide además los datos propios de cada fuero y la tasa de justicia
 * (D-67), que el prototipo no tiene: "Preso" en el penal; la medida cautelar y
 * el acto lesivo en el amparo; el agotamiento de la vía en el administrativo.
 *
 * Al final, las casillas de la carpeta en Drive (HU39) y de la copia de los
 * modelos del fuero (HU40). La segunda no se puede tildar sin la primera
 * (CA-40.3).
 */
export function CaseForm({
    values, errors, onChange, onSacNumberChange, onJurisdictionChange, onCreateFolderChange,
    templatesNote, clientOptions, lawyerOptions,
    selectedQualifications, qualificationOptions, onAddQualification, onRemoveQualification,
    onOffenseDateChange, onNewClient, onNewQualification,
    saving, onConfirm, onCancel,
}: CaseFormProps) {
    const hasSac = values.sacNumber.trim() !== ''
    const roleOptions: SelectOption[] = PROCEDURAL_ROLES_BY_JURISDICTION[values.jurisdiction].map(
        (role) => ({ value: role, label: PROCEDURAL_ROLE_LABELS[role] }),
    )

    function handleSubmit(event: FormEvent) {
        // Enter en un campo envía el formulario: que confirme igual que el
        // botón, y no que recargue la página.
        event.preventDefault()
        onConfirm()
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            <Panel
                footer={
                    <div className="vz-form-actions">
                        <Button variant="secondary" size="md" onClick={onCancel}>Cancelar</Button>
                        <Button type="submit" size="md" disabled={saving}>Registrar causa</Button>
                    </div>
                }
            >
                <div className="vz-panel__body vz-form-grid">
                    <FormSection label="Identificación" />

                    {/* El SAC es opcional (V3 D-33): la causa puede iniciarse antes de
                        que el Poder Judicial se lo asigne. */}
                    <Field label="N° de SAC" width="half" htmlFor="case-sac" error={errors.sacNumber}
                        note="Opcional. Si se conoce, identifica la causa de forma única.">
                        <TextInput
                            id="case-sac"
                            mono
                            inputMode="numeric"
                            maxLength={8}
                            placeholder="8 dígitos"
                            value={values.sacNumber}
                            onChange={(e) => onSacNumberChange(e.target.value)}
                        />
                    </Field>

                    <Field label="Fuero" required width="half" htmlFor="case-jurisdiction"
                        note="Define el ciclo de vida y la tabla de plazos aplicable.">
                        <Select
                            id="case-jurisdiction"
                            options={JURISDICTION_OPTIONS}
                            value={values.jurisdiction}
                            onChange={(e) => onJurisdictionChange(e.target.value as Jurisdiction)}
                        />
                    </Field>

                    <Field label="Carátula" required htmlFor="case-caption" error={errors.caption}
                        note="Podés usar la que sugiere el resumen, a partir del cliente y la calificación.">
                        <TextInput
                            id="case-caption"
                            value={values.caption}
                            onChange={(e) => onChange('caption', e.target.value)}
                        />
                    </Field>

                    <Field label="Tribunal o dependencia" htmlFor="case-court" error={errors.court}>
                        <TextInput
                            id="case-court"
                            placeholder="Juzgado de Control N° 3 · Córdoba"
                            value={values.court}
                            onChange={(e) => onChange('court', e.target.value)}
                        />
                    </Field>

                    {/* El instructor, su teléfono y su interno van en una fila,
                        como en el prototipo. El teléfono y el interno son dos
                        campos distintos (V3 D-33). */}
                    <div className="vz-form-row3">
                        <Field label="Instructor de la causa" htmlFor="case-instructor"
                            error={errors.instructorName}
                            note="Quien lleva la instrucción en el tribunal o la dependencia.">
                            <TextInput
                                id="case-instructor"
                                placeholder="Apellido y nombre del instructor"
                                value={values.instructorName}
                                onChange={(e) => onChange('instructorName', e.target.value)}
                            />
                        </Field>

                        <Field label="Teléfono" htmlFor="case-tribunal-phone"
                            error={errors.tribunalPhone}>
                            <TextInput
                                id="case-tribunal-phone"
                                type="tel"
                                mono
                                placeholder="0351 448-1200"
                                value={values.tribunalPhone}
                                onChange={(e) => onChange('tribunalPhone', e.target.value)}
                            />
                        </Field>

                        <Field label="Interno" htmlFor="case-instructor-extension"
                            error={errors.instructorExtension}>
                            <TextInput
                                id="case-instructor-extension"
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

                    <Field label="Cliente" required htmlFor="case-client" error={errors.clientId}>
                        <div className="vz-field-row">
                            <Select
                                id="case-client"
                                options={[{ value: '', label: 'Seleccionar cliente…' }, ...clientOptions]}
                                value={values.clientId}
                                onChange={(e) => onChange('clientId', e.target.value)}
                            />
                            <Button
                                variant="secondary"
                                size="md"
                                onClick={onNewClient}
                            >
                                Registrar cliente nuevo
                            </Button>
                        </div>
                    </Field>

                    {/* Sin htmlFor: un grupo de botones no se enlaza con un
                        <label>, así que el nombre va en el aria-label. */}
                    <Field label="Rol procesal del cliente" required error={errors.proceduralRole}>
                        <SegmentedControl
                            aria-label="Rol procesal del cliente"
                            options={roleOptions}
                            value={values.proceduralRole}
                            onChange={(value) => onChange('proceduralRole', value as ProceduralRole)}
                        />
                    </Field>

                    {values.jurisdiction === 'CRIMINAL' && (
                        /* Son opcionales (V3 D-33): una causa penal puede registrarse
                           sin ninguna, y entonces no computa prescripción. */
                        <Field
                            label="Calificaciones legales"
                            htmlFor="case-qualifications"
                            error={errors.legalQualifications}
                            note="Si en la causa concurren varios delitos, agregá una calificación por cada uno: cada una tiene su propio plazo de prescripción, que corre desde la fecha del hecho."
                        >
                            <LegalQualificationPicker
                                id="case-qualifications"
                                selected={selectedQualifications}
                                options={qualificationOptions}
                                onAdd={onAddQualification}
                                onRemove={onRemoveQualification}
                                onOffenseDateChange={onOffenseDateChange}
                                dateErrors={errors.offenseDates}
                                maxDate={todayIsoDate()}
                                onCreate={onNewQualification}
                            />
                        </Field>
                    )}

                    {values.jurisdiction === 'CRIMINAL' && (
                        /* Aplica sea el cliente defensa o querellante (V4 D-80). */
                        <div className="vz-field vz-col-full">
                            <Checkbox
                                label="Preso: el cliente está detenido."
                                checked={values.clientDetained}
                                onChange={(e) => onChange('clientDetained', e.target.checked)}
                            />
                        </div>
                    )}

                    {values.jurisdiction !== 'CRIMINAL' && (
                        <>
                            <Field label="Contraparte u organismo" htmlFor="case-counterparty" error={errors.counterparty}>
                                <TextInput
                                    id="case-counterparty"
                                    placeholder="APROSS, Provincia de Córdoba, Tribunal de Conducta…"
                                    value={values.counterparty}
                                    onChange={(e) => onChange('counterparty', e.target.value)}
                                />
                            </Field>

                            <Field
                                label={SUBJECT_MATTER_TEXT[values.jurisdiction].label}
                                required
                                htmlFor="case-subject"
                                hint={`${values.subjectMatter.length} / ${SUBJECT_MATTER_MAX}`}
                                error={errors.subjectMatter}
                                note="Qué se reclama y por qué: el acto o la omisión que origina la causa y lo que se pide."
                            >
                                <Textarea
                                    id="case-subject"
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
                            htmlFor="case-remedy-exhausted" error={errors.administrativeRemedyExhaustedOn}
                            note="Opcional. Dejalo vacío mientras la vía no se agotó.">
                            <TextInput
                                id="case-remedy-exhausted"
                                type="date"
                                mono
                                max={todayIsoDate()}
                                value={values.administrativeRemedyExhaustedOn}
                                onChange={(e) => onChange('administrativeRemedyExhaustedOn', e.target.value)}
                            />
                        </Field>
                    )}

                    {values.jurisdiction === 'AMPARO' && (
                        <HarmfulActFields values={values} errors={errors} onChange={onChange} />
                    )}

                    <FormSection label="Asignación" />

                    <Field label="Abogado responsable" required width="half" htmlFor="case-lawyer"
                        error={errors.responsibleLawyerId}>
                        <Select
                            id="case-lawyer"
                            options={[{ value: '', label: 'Seleccionar responsable…' }, ...lawyerOptions]}
                            value={values.responsibleLawyerId}
                            onChange={(e) => onChange('responsibleLawyerId', e.target.value)}
                        />
                    </Field>

                    {/* Va con el SAC (CA-18.2): obligatoria si lo hay, y sin él no se carga. */}
                    <Field label="Fecha de inicio" required={hasSac} width="half" htmlFor="case-start"
                        error={errors.startDate}
                        note={hasSac ? undefined : 'Se carga junto con el N° de SAC.'}>
                        <TextInput
                            id="case-start"
                            type="date"
                            mono
                            disabled={!hasSac}
                            value={values.startDate}
                            onChange={(e) => onChange('startDate', e.target.value)}
                        />
                    </Field>

                    {/* RN10: en los tres fueros (V4 D-67). */}
                    <div className="vz-field vz-col-full">
                        <Checkbox
                            label="Tasa de justicia pagada"
                            checked={values.courtFeePaid}
                            onChange={(e) => onChange('courtFeePaid', e.target.checked)}
                        />
                    </div>

                    {/* HU39 y HU40: vienen tildadas (D-59). Si Drive falla, la
                        causa se registra igual y la carpeta se crea después (D-60). */}
                    <div className="vz-field vz-col-full">
                        <Checkbox
                            label={
                                <>
                                    Crear la carpeta de la causa en Drive
                                    <span className="vz-check__note">
                                        Va en la carpeta del abogado responsable y se nombra con la carátula.
                                    </span>
                                </>
                            }
                            checked={values.createFolder}
                            onChange={(e) => onCreateFolderChange(e.target.checked)}
                        />
                    </div>

                    <div className="vz-field vz-col-full">
                        <Checkbox
                            label={
                                <>
                                    Copiar los modelos de escritos del fuero a esa carpeta
                                    {!values.createFolder ? (
                                        <span className="vz-check__note">
                                            Primero hay que crear la carpeta en Drive para poder copiar los modelos.
                                        </span>
                                    ) : templatesNote && (
                                        <span className="vz-check__note">{templatesNote}</span>
                                    )}
                                </>
                            }
                            checked={values.copyTemplates}
                            disabled={!values.createFolder}
                            onChange={(e) => onChange('copyTemplates', e.target.checked)}
                        />
                    </div>
                </div>
            </Panel>
        </form>
    )
}

/**
 * Los datos del amparo (V4 D-67): la medida cautelar y el acto lesivo. Con la
 * fecha del acto lesivo el backend calcula hasta cuándo se puede presentar el
 * amparo (D-78), por eso el plazo y su tipo de día sólo se piden con ella; y la
 * renovación, sólo si el acto se renueva.
 */
export function HarmfulActFields({
    values, errors, onChange,
}: Pick<CaseFormProps, 'values' | 'errors' | 'onChange'>) {
    const hasDate = values.harmfulActDate.trim() !== ''

    return (
        <>
            <div className="vz-field vz-col-full">
                <Checkbox
                    label="El juez hizo lugar a la medida cautelar."
                    checked={values.injunctionGranted}
                    onChange={(e) => onChange('injunctionGranted', e.target.checked)}
                />
            </div>

            <Field label="Fecha del acto lesivo" width="half" htmlFor="case-harmful-act-date"
                error={errors.harmfulActDate}
                note="Opcional. Desde ella corre el plazo para presentar el amparo.">
                <TextInput
                    id="case-harmful-act-date"
                    type="date"
                    mono
                    max={todayIsoDate()}
                    value={values.harmfulActDate}
                    onChange={(e) => onChange('harmfulActDate', e.target.value)}
                />
            </Field>

            {hasDate && (
                <>
                    <Field label="Plazo para presentar el amparo" required width="half"
                        htmlFor="case-harmful-act-term" error={errors.harmfulActTermDays}>
                        <div className="vz-field-row">
                            <TextInput
                                id="case-harmful-act-term"
                                mono
                                inputMode="numeric"
                                placeholder="Días"
                                value={values.harmfulActTermDays}
                                onChange={(e) => onChange('harmfulActTermDays', e.target.value)}
                            />
                            <Select
                                aria-label="Tipo de día del plazo"
                                options={TERM_DAY_TYPE_OPTIONS}
                                value={values.harmfulActTermDayType}
                                onChange={(e) =>
                                    onChange('harmfulActTermDayType', e.target.value as CaseFormValues['harmfulActTermDayType'])
                                }
                            />
                        </div>
                    </Field>

                    <div className="vz-field vz-col-full">
                        <Checkbox
                            label="El acto lesivo se renueva."
                            checked={values.harmfulActRenews}
                            onChange={(e) => onChange('harmfulActRenews', e.target.checked)}
                        />
                    </div>

                    {values.harmfulActRenews && (
                        <Field label="Se renueva cada" required width="half"
                            htmlFor="case-harmful-act-renewal" error={errors.harmfulActRenewalDays}
                            note="En días corridos, contados desde la fecha del acto lesivo.">
                            <TextInput
                                id="case-harmful-act-renewal"
                                mono
                                inputMode="numeric"
                                placeholder="Días"
                                value={values.harmfulActRenewalDays}
                                onChange={(e) => onChange('harmfulActRenewalDays', e.target.value)}
                            />
                        </Field>
                    )}
                </>
            )}
        </>
    )
}
