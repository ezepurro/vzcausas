import { useId } from 'react'
import { Button, Modal } from '@/shared/components/ui'
import { Checkbox, Field, TextInput } from '@/shared/components/forms'
import { JurisdictionPicker } from '@/features/documents/components/JurisdictionPicker'
import { FileDropzone } from '@/features/documents/components/FileDropzone'
import type { DocumentTemplateFormValues } from '@/features/documents/types/documentTemplate'
import type { DocumentTemplateErrors } from '@/features/documents/schemas/documentTemplate.schema'

const DOCX_ACCEPT = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export interface DocumentTemplateFormModalProps {
    values: DocumentTemplateFormValues
    errors: DocumentTemplateErrors
    /** true mientras la mutación está en vuelo: bloquea el confirmar */
    saving: boolean
    onChange: <K extends keyof DocumentTemplateFormValues>(key: K, value: DocumentTemplateFormValues[K]) => void
    onConfirm: () => void
    onCancel: () => void
}

/**
 * "Registrar modelo formal" (HU-34). Se arma con `Modal` y no con `FormModal`
 * porque lleva una lista de fueros y un archivo, que `FormValues` no admite.
 * Como el resto de los modales del sistema, no valida ni guarda.
 */
export function DocumentTemplateFormModal({
    values, errors, saving, onChange, onConfirm, onCancel,
}: DocumentTemplateFormModalProps) {
    const nameId = useId()
    const jurisdictionsId = useId()
    const fileId = useId()

    return (
        <Modal
            title="Registrar modelo formal"
            sub="Subí el modelo en Word (.docx, hasta 10 MB) y elegí los fueros en los que se usa."
            onClose={onCancel}
            footer={
                <>
                    <Button variant="secondary" size="md" onClick={onCancel}>Cancelar</Button>
                    <Button size="md" disabled={saving} onClick={onConfirm}>Registrar modelo</Button>
                </>
            }
        >
            <div className="vz-form-grid">
                <Field label="Nombre del modelo" required htmlFor={nameId} error={errors.name}>
                    <TextInput
                        id={nameId}
                        value={values.name}
                        placeholder="Recurso de queja"
                        onChange={(e) => onChange('name', e.target.value)}
                    />
                </Field>

                <Field label="Fuero" required htmlFor={jurisdictionsId} error={errors.jurisdictions}>
                    <JurisdictionPicker
                        id={jurisdictionsId}
                        value={values.jurisdictions}
                        onChange={(jurisdictions) => onChange('jurisdictions', jurisdictions)}
                    />
                </Field>

                <Field label="Archivo del modelo" required htmlFor={fileId} error={errors.file}>
                    <FileDropzone
                        id={fileId}
                        file={values.file}
                        accept={DOCX_ACCEPT}
                        acceptText="Solo .docx, hasta 10 MB"
                        onChange={(file) => onChange('file', file)}
                    />
                </Field>

                <div className="vz-col-full">
                    <Checkbox
                        label="Copiar en las causas nuevas de los fueros elegidos"
                        checked={values.copyToNewCases}
                        onChange={(e) => onChange('copyToNewCases', e.target.checked)}
                    />
                </div>
            </div>
        </Modal>
    )
}
