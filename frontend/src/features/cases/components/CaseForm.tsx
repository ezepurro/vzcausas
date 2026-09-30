import type { FormEvent } from 'react'
import { Button, Panel } from '@/shared/components/ui'
import {
    Field,
    FormSection,
    SegmentedControl,
    Select,
    TextInput,
    type SelectOption,
} from '@/shared/components/forms'
import {
    JURISDICTION_LABELS,
    JURISDICTIONS,
    type Jurisdiction,
    type LegalQualification,
} from '@/features/legal-params'
import {
    PROCEDURAL_ROLE_LABELS,
    PROCEDURAL_ROLES_BY_JURISDICTION,
    type CaseFormValues,
    type ProceduralRole,
} from '@/features/cases/types/case'
import type { CaseFormErrors } from '@/features/cases/schemas/case.schema'
import { LegalQualificationPicker } from '@/features/cases/components/LegalQualificationPicker'

export interface CaseFormProps {
    values: CaseFormValues
    errors: CaseFormErrors
    /** Cada campo, salvo el fuero. */
    onChange: <K extends keyof CaseFormValues>(key: K, value: CaseFormValues[K]) => void
    /**
     * El fuero va aparte porque arrastra otros campos: la pantalla aplica
     * `changeJurisdiction` de `utils/caseForm`.
     */
    onJurisdictionChange: (jurisdiction: Jurisdiction) => void
    /** Los clientes, ya armados: `value` el id, `label` "GÓMEZ, Ariel Fernando · DNI …". */
    clientOptions: SelectOption[]
    /** Los abogados vigentes, ya armados. */
    lawyerOptions: SelectOption[]
    /** Las calificaciones elegidas, resueltas a partir de `values.legalQualificationIds`. */
    selectedQualifications: Pick<LegalQualification, 'id' | 'name' | 'prescriptionMonths'>[]
    /** Las que todavía se pueden agregar. */
    qualificationOptions: SelectOption[]
    onAddQualification: (id: number) => void
    onRemoveQualification: (id: number) => void
    /** "Registrar cliente nuevo". */
    onNewClient: () => void
    /** "Registrar calificación nueva". */
    onNewQualification: () => void
    /** Sólo `ADMINISTRATOR` registra clientes y calificaciones (V3 D-04, D-05). */
    canCreateClient: boolean
    canCreateQualification: boolean
    /** true mientras la mutación está en vuelo: bloquea el confirmar */
    saving: boolean
    onConfirm: () => void
    onCancel: () => void
}

const JURISDICTION_OPTIONS: SelectOption[] = JURISDICTIONS.map((j) => ({
    value: j,
    label: JURISDICTION_LABELS[j],
}))

/**
 * El formulario de "Registrar causa" (HU18), en tres secciones como el
 * prototipo: identificación, cliente y rol procesal, y asignación.
 *
 * No valida ni guarda: recibe los errores ya calculados y avisa con
 * `onConfirm`. Lo que depende del fuero lo decide con `values.jurisdiction`:
 * en el penal pide calificaciones legales; en los otros dos, la contraparte.
 *
 * Las casillas de Drive y de modelos del prototipo no están: son HU39 y HU40,
 * del Sprint 3 (V3 §8.3).
 */
export function CaseForm({
    values, errors, onChange, onJurisdictionChange, clientOptions, lawyerOptions,
    selectedQualifications, qualificationOptions, onAddQualification, onRemoveQualification,
    onNewClient, onNewQualification, canCreateClient, canCreateQualification,
    saving, onConfirm, onCancel,
}: CaseFormProps) {
    const criminal = values.jurisdiction === 'CRIMINAL'

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

                    <Field label="N° de SAC" required width="half" htmlFor="case-sac" error={errors.sacNumber}
                        note="Identifica la causa de forma única.">
                        <TextInput
                            id="case-sac"
                            mono
                            inputMode="numeric"
                            maxLength={8}
                            placeholder="8 dígitos"
                            value={values.sacNumber}
                            onChange={(e) => onChange('sacNumber', e.target.value)}
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

                    <Field label="Instructor de la causa" width="half" htmlFor="case-instructor"
                        error={errors.instructorName}
                        note="Quien lleva la instrucción en el tribunal o la dependencia.">
                        <TextInput
                            id="case-instructor"
                            placeholder="Apellido y nombre del instructor"
                            value={values.instructorName}
                            onChange={(e) => onChange('instructorName', e.target.value)}
                        />
                    </Field>

                    <Field label="Interno (teléfono)" width="half" htmlFor="case-instructor-phone"
                        error={errors.instructorPhone}>
                        <TextInput
                            id="case-instructor-phone"
                            type="tel"
                            mono
                            placeholder="0351 448-1200 int. 214"
                            value={values.instructorPhone}
                            onChange={(e) => onChange('instructorPhone', e.target.value)}
                        />
                    </Field>

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
                                disabled={!canCreateClient}
                                title={canCreateClient ? undefined : 'Sólo el Administrador puede registrar clientes.'}
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

                    {criminal ? (
                        <Field
                            label="Calificaciones legales"
                            required
                            htmlFor="case-qualifications"
                            error={errors.legalQualificationIds}
                            note="Si en la causa concurren varios delitos, agregá una calificación por cada uno: cada una tiene su propio plazo de prescripción."
                        >
                            <LegalQualificationPicker
                                id="case-qualifications"
                                selected={selectedQualifications}
                                options={qualificationOptions}
                                onAdd={onAddQualification}
                                onRemove={onRemoveQualification}
                                onCreate={onNewQualification}
                                canCreate={canCreateQualification}
                            />
                        </Field>
                    ) : (
                        <Field label="Contraparte u organismo" htmlFor="case-counterparty" error={errors.counterparty}>
                            <TextInput
                                id="case-counterparty"
                                placeholder="APROSS, Provincia de Córdoba, Tribunal de Conducta…"
                                value={values.counterparty}
                                onChange={(e) => onChange('counterparty', e.target.value)}
                            />
                        </Field>
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

                    <Field label="Fecha de inicio" width="half" htmlFor="case-start" error={errors.startDate}>
                        <TextInput
                            id="case-start"
                            type="date"
                            mono
                            value={values.startDate}
                            onChange={(e) => onChange('startDate', e.target.value)}
                        />
                    </Field>
                </div>
            </Panel>
        </form>
    )
}
