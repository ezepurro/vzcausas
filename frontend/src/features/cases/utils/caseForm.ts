/**
 * Transformaciones del formulario de alta de causa.
 */

import type { Jurisdiction } from '@/features/legal-params'
import {
    PROCEDURAL_ROLES_BY_JURISDICTION,
    type CaseFormValues,
} from '@/features/cases/types/case'

/**
 * El alta arranca en el fuero penal, como el prototipo, sin SAC y, por eso,
 * sin fecha de inicio (CA-18.2).
 */
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
        startDate: '',
        ...emptyJurisdictionData(),
        courtFeePaid: false,
    }
}

/**
 * Los datos propios de cada fuero (V4 D-67), vacíos. Los booleanos arrancan en
 * `false`, que es el valor por defecto del contrato; el plazo del acto lesivo
 * se cuenta por defecto en días hábiles.
 */
function emptyJurisdictionData(): Pick<
    CaseFormValues,
    | 'clientDetained'
    | 'injunctionGranted'
    | 'harmfulActDate'
    | 'harmfulActRenews'
    | 'harmfulActRenewalDays'
    | 'harmfulActTermDays'
    | 'harmfulActTermDayType'
    | 'administrativeRemedyExhaustedOn'
> {
    return {
        clientDetained: false,
        injunctionGranted: false,
        harmfulActDate: '',
        harmfulActRenews: false,
        harmfulActRenewalDays: '',
        harmfulActTermDays: '',
        harmfulActTermDayType: 'BUSINESS',
        administrativeRemedyExhaustedOn: '',
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
 * - Los datos propios de cada fuero (V4 D-67) se vacían: un dato de otro fuero
 *   no viaja. La tasa de justicia es de los tres y se conserva.
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
        ...(jurisdiction === values.jurisdiction ? {} : emptyJurisdictionData()),
    }
}

/**
 * La fecha de inicio va con el SAC (CA-18.2): con SAC es obligatoria y sin SAC
 * no se carga. Borrar el SAC se lleva la fecha, si no quedaría una que no
 * puede viajar. Con SAC no se propone ninguna: la tiene que cargar el usuario.
 */
export function changeSacNumber(values: CaseFormValues, sacNumber: string): CaseFormValues {
    return {
        ...values,
        sacNumber,
        startDate: sacNumber.trim() ? values.startDate : '',
    }
}
