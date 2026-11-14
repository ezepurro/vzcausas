import { useState } from 'react'
import { useToast } from '@/app/providers/ToastContext'
import { isApiError } from '@/shared/api/ApiError'
import {
    formatPrescription,
    isValidLegalQualification,
    LegalQualificationFormModal,
    toCreateLegalQualificationBody,
    toLegalQualificationFormErrors,
    useCreateLegalQualification,
    validateLegalQualification,
    type LegalQualificationErrors,
    type LegalQualificationFormValues,
} from '@/features/legal-params'

const EMPTY_QUALIFICATION: LegalQualificationFormValues = { name: '', years: '', months: '0' }

/**
 * "Registrar calificación nueva" desde una causa: el modal de `legal-params`,
 * en su modo `fromCase`, con su alta. Avisa el id de la registrada para que
 * quien lo abrió la agregue a la causa.
 *
 * Lo usan "Registrar causa" y "Modificar causa" (ahí se abre encima del
 * diálogo: `Modal` atiende el teclado sólo en el de arriba).
 */
export function NewQualificationModal({ onDone, onCancel }: { onDone: (id: number) => void; onCancel: () => void }) {
    const toast = useToast()
    const [values, setValues] = useState<LegalQualificationFormValues>(EMPTY_QUALIFICATION)
    const [errors, setErrors] = useState<LegalQualificationErrors>({})
    const create = useCreateLegalQualification()

    function submit() {
        const found = validateLegalQualification(values)
        setErrors(found)
        if (!isValidLegalQualification(found)) return

        create.mutate(toCreateLegalQualificationBody(values), {
            onSuccess: (qualification) => {
                toast(
                    'success',
                    `Calificación registrada · prescripción ${formatPrescription(qualification.prescriptionMonths)}.`,
                )
                onDone(qualification.id)
            },
            onError: (error) => {
                if (!isApiError(error)) throw error
                if (error.isValidation) {
                    /* El servidor informa el plazo como `prescriptionMonths` y el
                       formulario lo pide en años y meses: el mapa lo lleva a los años. */
                    const fieldErrors = toLegalQualificationFormErrors(error.details)
                    if (!isValidLegalQualification(fieldErrors)) {
                        setErrors(fieldErrors)
                        return
                    }
                    // Un 400 sin ningún campo que marcar no puede quedar mudo.
                }
                toast('error', error.message)
            },
        })
    }

    return (
        <LegalQualificationFormModal
            mode="create"
            values={values}
            errors={errors}
            fromCase
            saving={create.isPending}
            onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
            onConfirm={submit}
            onCancel={onCancel}
        />
    )
}
