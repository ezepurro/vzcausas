/** Del formulario al cuerpo del `POST /lawyers`. */

import type { CreateLawyerBody, LawyerFormValues } from '@/features/lawyers/types/lawyer'

/**
 * Recorta los espacios de los tres campos. Si llegaste hasta acá, el schema ya
 * validó que ninguno esté vacío.
 */
export function toCreateLawyerBody(values: LawyerFormValues): CreateLawyerBody {
    return {
        lastName: values.lastName.trim(),
        firstName: values.firstName.trim(),
        registrationNumber: values.registrationNumber.trim(),
    }
}
