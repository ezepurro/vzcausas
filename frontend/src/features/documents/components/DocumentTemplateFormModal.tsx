import { useId } from 'react'
import { Button, Modal } from '@/shared/components/ui'
import { Checkbox, Field, TextInput } from '@/shared/components/forms'
import { JurisdictionPicker } from '@/features/documents/components/JurisdictionPicker'
import { FileDropzone } from '@/features/documents/components/FileDropzone'
import type { DocumentTemplateFormValues } from '@/features/documents/types/documentTemplate'
import {
    NAME_MAX,
    type DocumentTemplateErrors,
    type DocumentTemplateFormMode,
} from '@/features/documents/schemas/documentTemplate.schema'

const DOCX_ACCEPT = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const CREATE_SUB = 'Subí el modelo en Word (.docx, hasta 10 MB) y elegí los fueros en los que se usa.'

/**
 * El prototipo dice "la anterior queda en el historial": no hay historial en
 * V6 (§3.10). Ver `documents/CAMBIOS.md`.
 */
const REPLACE_NOTE = 'Opcional. Si subís otro, el anterior pasa a la Papelera del estudio en Drive.'

export interface DocumentTemplateFormModalProps {
    /** `create` (por defecto) registra; `edit` modifica (HU36). Los campos son los mismos. */
    mode?: DocumentTemplateFormMode
    /** Debajo del título, en la edición: el nombre del modelo, como en el prototipo. */
    sub?: string
    /** En la edición, el archivo que ya tiene el modelo: se ve hasta que se elija otro. */
    currentFileName?: string
    values: DocumentTemplateFormValues
    errors: DocumentTemplateErrors
    /** true mientras la mutación está en vuelo: bloquea el confirmar */
    saving: boolean
    onChange: <K extends keyof DocumentTemplateFormValues>(key: K, value: DocumentTemplateFormValues[K]) => void
    onConfirm: () => void
    onCancel: () => void
}

/**
 * "Registrar modelo formal" (HU-34) y "Modificar modelo formal" (HU-36) en el
 * mismo modal: los cuatro campos son los mismos. Se arma con `Modal` y no con
 * `FormModal` porque lleva una lista de fueros y un archivo, que `FormValues`
 * no admite. Como el resto de los modales del sistema, no valida ni guarda.
 *
 * En la edición los fueros son una lista, como en el alta (D-125), aunque el
 * prototipo muestre un selector de uno; y el archivo es opcional.
 */
export function DocumentTemplateFormModal({
    mode = 'create', sub, currentFileName, values, errors, saving, onChange, onConfirm, onCancel,
}: DocumentTemplateFormModalProps) {
    const creating = mode === 'create'
    const nameId = useId()
    const jurisdictionsId = useId()
    const fileId = useId()

    return (
        <Modal
            title={creating ? 'Registrar modelo formal' : 'Modificar modelo formal'}
            sub={creating ? CREATE_SUB : sub}
            onClose={onCancel}
            dismissOnBackdrop={false}
            footer={
                <>
                    <Button variant="secondary" size="md" onClick={onCancel}>Cancelar</Button>
                    <Button size="md" disabled={saving} onClick={onConfirm}>
                        {creating ? 'Registrar modelo' : 'Guardar cambios'}
                    </Button>
                </>
            }
        >
            <div className="vz-form-grid">
                <Field label="Nombre del modelo" required htmlFor={nameId} error={errors.name}>
                    <TextInput
                        id={nameId}
                        maxLength={NAME_MAX}
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

                <Field
                    label="Archivo del modelo"
                    required={creating}
                    note={creating ? undefined : REPLACE_NOTE}
                    htmlFor={fileId}
                    error={errors.file}
                >
                    <FileDropzone
                        id={fileId}
                        file={values.file}
                        currentFileName={currentFileName}
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