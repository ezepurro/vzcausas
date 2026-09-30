/**
 * Transformaciones del formulario de alta de causa.
 */

import { todayIsoDate } from '@/shared/lib/dates'
import type { Jurisdiction } from '@/features/legal-params'
import {
    PROCEDURAL_ROLES_BY_JURISDICTION,
    type CaseFormValues,
} from '@/features/cases/types/case'

/** El alta arranca en el fuero penal, como el prototipo, con la fecha de hoy. */
export function emptyCaseForm(): CaseFormValues {
    return {
        sacNumber: '',
        jurisdiction: 'CRIMINAL',
        caption: '',
        court: '',
        instructorName: '',
        instructorPhone: '',
        clientId: '',
        proceduralRole: PROCEDURAL_ROLES_BY_JURISDICTION.CRIMINAL[0],
        legalQualificationIds: [],
        counterparty: '',
        responsibleLawyerId: '',
        startDate: todayIsoDate(),
    }
}

/**
 * Cambiar el fuero no es cambiar un campo: arrastra otros tres.
 *
 * - El rol procesal vuelve al primero que admite el fuero nuevo: "Querellante
 *   particular" no existe en un amparo.
 * - Las calificaciones sólo van en el penal (V3 §3.7): fuera de él se vacían,
 *   si no viajarían y el backend respondería `400`.
 * - La contraparte es al revés: no va en el penal.
 */
export function changeJurisdiction(values: CaseFormValues, jurisdiction: Jurisdiction): CaseFormValues {
    const criminal = jurisdiction === 'CRIMINAL'
    return {
        ...values,
        jurisdiction,
        proceduralRole: PROCEDURAL_ROLES_BY_JURISDICTION[jurisdiction][0],
        legalQualificationIds: criminal ? values.legalQualificationIds : [],
        counterparty: criminal ? '' : values.counterparty,
    }
}
