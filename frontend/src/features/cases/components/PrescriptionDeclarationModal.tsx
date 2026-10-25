import { FormModal, type FieldSpec } from '@/shared/components/forms'
import type { PrescriptionDeclarationFormValues } from '@/features/cases/types/prescriptionDeclaration'
import type { PrescriptionDeclarationFormErrors } from '@/features/cases/schemas/prescriptionDeclaration.schema'

export interface PrescriptionDeclarationModalProps {
    /** La carátula de la causa, debajo del título. */
    caption: string
    values: PrescriptionDeclarationFormValues
    errors: PrescriptionDeclarationFormErrors
    /** true mientras la mutación está en vuelo: bloquea el confirmar */
    saving: boolean
    onChange: (k: string, v: string | boolean) => void
    onConfirm: () => void
    onCancel: () => void
}

/**
 * "Marcar la causa como prescripta" (HU33), con los textos del prototipo. Va
 * en rojo porque no tiene vuelta atrás: el contrato no ofrece revertirlo
 * (V4 D-54). No valida ni guarda: recibe los errores ya calculados.
 */
export function PrescriptionDeclarationModal({
    caption, values, errors, saving, onChange, onConfirm, onCancel,
}: PrescriptionDeclarationModalProps) {
    const fields: FieldSpec[] = [
        {
            k: 'prescriptionDate',
            label: 'Fecha de la prescripción',
            type: 'date',
            width: 'half',
            required: true,
            mono: true,
            error: errors.prescriptionDate,
        },
        {
            k: 'resolution',
            label: 'Resolución que la declara',
            width: 'half',
            required: true,
            placeholder: 'Sentencia',
            error: errors.resolution,
        },
        {
            k: 'grounds',
            label: 'Fundamento (opcional)',
            type: 'area',
            error: errors.grounds,
        },
    ]

    return (
        <FormModal
            title="Marcar la causa como prescripta"
            sub={caption}
            note="La causa pasa al estado Prescripta, deja de figurar en los tableros y se cierran los plazos abiertos. Queda accesible en el historial."
            tone="danger"
            fields={fields}
            values={values}
            onChange={onChange}
            okLabel="Marcar prescripta"
            okDisabled={saving}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    )
}
