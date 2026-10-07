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
        tribunalPhone: '',
        instructorExtension: '',
        clientId: '',
        proceduralRole: PROCEDURAL_ROLES_BY_JURISDICTION.CRIMINAL[0],
        legalQualifications: [],
        counterparty: '',
        subjectMatter: '',
        responsibleLawyerId: '',
        startDate: todayIsoDate(),
    }
}

/**
 * Cambiar el fuero no es cambiar un campo: arrastra otros.
 *
 * - El rol procesal vuelve al primero que admite el fuero nuevo: "Querellante
 *   particular" no existe en un amparo.
 * - Las calificaciones, con sus fechas del hecho, sólo van en el penal (V3
 *   §3.7): fuera de él se vacían, si no viajarían y el backend respondería
 *   `400`.
 * - La contraparte y el objeto del reclamo son al revés: no van en el penal.
 *   Entre administrativo y amparo se conservan, porque el campo es el mismo y
 *   sólo cambia su rótulo.
 */
export function changeJurisdiction(values: CaseFormValues, jurisdiction: Jurisdiction): CaseFormValues {
    const criminal = jurisdiction === 'CRIMINAL'
    return {
        ...values,
        jurisdiction,
        proceduralRole: PROCEDURAL_ROLES_BY_JURISDICTION[jurisdiction][0],
        legalQualifications: criminal ? values.legalQualifications : [],
        counterparty: criminal ? '' : values.counterparty,
        subjectMatter: criminal ? '' : values.subjectMatter,
    }
}
