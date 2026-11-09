import { FormModal, type FieldSpec } from '@/shared/components/forms'
import type { PrescriptionDeclarationFormValues } from '@/features/cases/types/prescriptionDeclaration'
import { PRESCRIPTION_DECLARATION_MAX_LENGTH, type PrescriptionDeclarationFormErrors } from '@/features/cases/schemas/prescriptionDeclaration.schema'

export interface PrescriptionDeclarationModalProps {
    /** La carátula de la causa, debajo del título. */
    caption: string
    /**
     * D-113: el nombre de la calificación que se declara. Sin ella, es la causa
     * entera ("Marcar toda la causa prescripta").
     */
    qualificationName?: string
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
 *
 * Desde D-113 también declara una sola calificación: los mismos campos, con
 * su título, su nota y su botón ("Declarar prescripta").
 */
export function PrescriptionDeclarationModal({
    caption, qualificationName, values, errors, saving, onChange, onConfirm, onCancel,
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
            maxLength: PRESCRIPTION_DECLARATION_MAX_LENGTH.resolution,
            error: errors.resolution,
        },
        {
            k: 'grounds',
            label: 'Fundamento (opcional)',
            type: 'area',
            maxLength: PRESCRIPTION_DECLARATION_MAX_LENGTH.grounds,
            error: errors.grounds,
        },
    ]

    return (
        <FormModal
            title={qualificationName ? 'Declarar prescripta la calificación' : 'Marcar la causa como prescripta'}
            sub={qualificationName ? `${qualificationName} · ${caption}` : caption}
            note={qualificationName
                ? 'El delito deja de figurar en las alertas y su prescripción no se reinicia con actos posteriores. Si es el último sin declarar, la causa pasa al estado Prescripta.'
                : 'Las calificaciones que faltan quedan declaradas con estos datos. La causa pasa al estado Prescripta, deja de figurar en los tableros y se cierran los plazos abiertos. Queda accesible en el historial.'}
            tone="danger"
            fields={fields}
            values={values}
            onChange={onChange}
            okLabel={qualificationName ? 'Declarar prescripta' : 'Marcar prescripta'}
            okDisabled={saving}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    )
}
