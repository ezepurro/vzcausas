/**
 * Transformaciones del formulario de alta de causa.
 */

import type { Jurisdiction } from '@/features/legal-params'
import {
    PROCEDURAL_ROLES_BY_JURISDICTION,
    type CaseFormValues,
    type Case,
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
        // Las dos casillas de la carpeta vienen tildadas, como el prototipo (D-59).
        createFolder: true,
        copyTemplates: true,
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
/**
 * El SAC en "Modificar causa" (HU19, CA-19.6). Va con la fecha de inicio,
 * igual que en el alta (`changeSacNumber`), con una diferencia: corregir el
 * SAC no cambia la fecha que ya tenía la causa.
 *
 * Para corregirlo se lo borra y se lo vuelve a escribir, y en el medio queda
 * vacío: ahí `changeSacNumber` se lleva la fecha. Cuando el SAC vuelve a tener
 * valor, se repone la fecha original. Sólo la que borró el SAC: si el usuario
 * vació la fecha a mano, queda vacía.
 */
export function changeEditSacNumber(
    values: CaseFormValues,
    sacNumber: string,
    originalStartDate: string | null,
): CaseFormValues {
    const next = changeSacNumber(values, sacNumber)
    const sacCameBack = values.sacNumber.trim() === '' && sacNumber.trim() !== ''
    if (sacCameBack && next.startDate === '' && originalStartDate) {
        return { ...next, startDate: originalStartDate }
    }
    return next
}
/**
 * Sin carpeta no hay dónde copiar los modelos (CA-40.3): destildar "Crear la
 * carpeta" destilda también "Copiar los modelos", y el contrato respondería
 * `400` si viajara así. Volver a tildarla no la vuelve a tildar: que lo
 * decida el usuario.
 */
export function changeCreateFolder(values: CaseFormValues, createFolder: boolean): CaseFormValues {
    return {
        ...values,
        createFolder,
        copyTemplates: createFolder ? values.copyTemplates : false,
    }
}

/**
 * La causa abierta, en los valores del formulario "Modificar causa" (HU19).
 * Es también contra lo que se compara al guardar: lo que no cambió no viaja
 * (CA-19.2).
 *
 * Lo que viene en `null` pasa a `''`, que es lo que muestra un input vacío, y
 * los ids pasan a texto porque salen de un select. Las calificaciones se
 * cargan con la fecha del hecho de cada una; una dada de baja sigue en la
 * lista, porque es parte de la causa.
 *
 * El fuero no se modifica (D-95) y la carpeta tiene su propio endpoint: las
 * casillas de la carpeta quedan en `false` y el formulario no las muestra.
 */
export function caseToFormValues(c: Case): CaseFormValues {
    return {
        sacNumber: c.sacNumber ?? '',
        jurisdiction: c.jurisdiction,
        caption: c.caption,
        court: c.court ?? '',
        instructorName: c.instructorName ?? '',
        tribunalPhone: c.tribunalPhone ?? '',
        instructorExtension: c.instructorExtension ?? '',
        clientId: String(c.client.id),
        proceduralRole: c.proceduralRole,
        legalQualifications: c.legalQualifications.map((q) => ({
            legalQualificationId: q.id,
            offenseDate: q.offenseDate,
        })),
        counterparty: c.counterparty ?? '',
        subjectMatter: c.subjectMatter ?? '',
        responsibleLawyerId: String(c.responsibleLawyer.id),
        startDate: c.startDate ?? '',
        clientDetained: c.clientDetained ?? false,
        injunctionGranted: c.injunctionGranted ?? false,
        harmfulActDate: c.harmfulActDate ?? '',
        harmfulActRenews: c.harmfulActRenews ?? false,
        harmfulActRenewalDays: c.harmfulActRenewalDays === null ? '' : String(c.harmfulActRenewalDays),
        harmfulActTermDays: c.harmfulActTermDays === null ? '' : String(c.harmfulActTermDays),
        // Sin acto lesivo no hay tipo de día: arranca en hábiles, como el alta.
        harmfulActTermDayType: c.harmfulActTermDayType === 'CONSECUTIVE' ? 'CONSECUTIVE' : 'BUSINESS',
        administrativeRemedyExhaustedOn: c.administrativeRemedyExhaustedOn ?? '',
        courtFeePaid: c.courtFeePaid,
        createFolder: false,
        copyTemplates: false,
    }
}