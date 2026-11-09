/** Del formulario al cuerpo del `POST /lawyers`. */

import type { CreateLawyerBody, LawyerFormValues } from '@/features/lawyers/types/lawyer'

/**
 * Recorta los espacios de los tres campos. Si llegaste hasta acá, el schema ya
 * validó el apellido y los nombres. La matrícula es opcional: vacía no viaja.
 */
export function toCreateLawyerBody(values: LawyerFormValues): CreateLawyerBody {
    const body: CreateLawyerBody = {
        lastName: values.lastName.trim(),
        firstName: values.firstName.trim(),
    }
    const registrationNumber = values.registrationNumber.trim()
    if (registrationNumber) {
        body.registrationNumber = registrationNumber
    }
    return body
}
