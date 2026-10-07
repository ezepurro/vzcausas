/**
 * De los valores del formulario al cuerpo de `POST /cases`.
 *
 * Lo vacío no viaja, y lo que es de un fuero no viaja en otro: el contrato
 * responde `400` si llegan calificaciones en un amparo o una contraparte en el
 * penal (V3 §3.7).
 */

import type { CaseFormValues, CreateCaseBody } from '@/features/cases/types/case'

export function toCreateCaseBody(values: CaseFormValues): CreateCaseBody {
    const body: CreateCaseBody = {
        jurisdiction: values.jurisdiction,
        caption: values.caption.trim(),
        clientId: Number(values.clientId),
        proceduralRole: values.proceduralRole,
        responsibleLawyerId: Number(values.responsibleLawyerId),
    }

    /* El SAC es opcional (D-33): la causa puede iniciarse antes de que el Poder
       Judicial se lo asigne. */
    const sacNumber = values.sacNumber.trim()
    if (sacNumber) body.sacNumber = sacNumber

    const court = values.court.trim()
    if (court) body.court = court
    const instructorName = values.instructorName.trim()
    if (instructorName) body.instructorName = instructorName
    const tribunalPhone = values.tribunalPhone.trim()
    if (tribunalPhone) body.tribunalPhone = tribunalPhone
    const instructorExtension = values.instructorExtension.trim()
    if (instructorExtension) body.instructorExtension = instructorExtension

    // Sin fecha de inicio el backend toma la del día (CA-18.9).
    const startDate = values.startDate.trim()
    if (startDate) body.startDate = startDate

    if (values.jurisdiction === 'CRIMINAL') {
        /* Las calificaciones son opcionales (D-33): sin ninguna, el campo no
           viaja y la causa no computa prescripción hasta que se le cargue una. */
        if (values.legalQualifications.length > 0) {
            body.legalQualifications = values.legalQualifications.map((q) => ({
                legalQualificationId: q.legalQualificationId,
                offenseDate: q.offenseDate,
            }))
        }
    } else {
        const counterparty = values.counterparty.trim()
        if (counterparty) body.counterparty = counterparty
        // El objeto es obligatorio fuera del penal (D-27): viaja siempre.
        body.subjectMatter = values.subjectMatter.trim()
    }

    return body
}
