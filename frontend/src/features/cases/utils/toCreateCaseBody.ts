/**
 * De los valores del formulario al cuerpo de `POST /cases`.
 *
 * Lo vacío no viaja, y lo que es de un fuero no viaja en otro: el contrato
 * responde `400` si llegan calificaciones en un amparo, una contraparte en el
 * penal o un dato propio de otro fuero (V4 §3.7, D-67).
 *
 * `createFolder` y `copyTemplates` viajan siempre, aunque sean `false`: sin
 * ellos el backend crearía la carpeta con los modelos (D-59), que no es lo
 * que se eligió. Sin carpeta no se copian modelos (`400`, CA-40.3).
 */

import type { CaseFormValues, CreateCaseBody } from '@/features/cases/types/case'

export function toCreateCaseBody(values: CaseFormValues): CreateCaseBody {
    const body: CreateCaseBody = {
        jurisdiction: values.jurisdiction,
        caption: values.caption.trim(),
        clientId: Number(values.clientId),
        proceduralRole: values.proceduralRole,
        responsibleLawyerId: Number(values.responsibleLawyerId),
        // La tasa es de los tres fueros (RN10); se manda siempre, aunque sea `false`.
        courtFeePaid: values.courtFeePaid,
        createFolder: values.createFolder,
        copyTemplates: values.createFolder && values.copyTemplates,
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

    // La fecha de inicio va con el SAC (CA-18.2): sin SAC no viaja.
    const startDate = values.startDate.trim()
    if (sacNumber && startDate) body.startDate = startDate

    if (values.jurisdiction === 'CRIMINAL') {
        /* Las calificaciones son opcionales (D-33): sin ninguna, el campo no
           viaja y la causa no computa prescripción hasta que se le cargue una. */
        if (values.legalQualifications.length > 0) {
            body.legalQualifications = values.legalQualifications.map((q) => ({
                legalQualificationId: q.legalQualificationId,
                offenseDate: q.offenseDate,
            }))
        }
        body.clientDetained = values.clientDetained
    } else {
        const counterparty = values.counterparty.trim()
        if (counterparty) body.counterparty = counterparty
        // El objeto es obligatorio fuera del penal (D-27): viaja siempre.
        body.subjectMatter = values.subjectMatter.trim()
    }

    if (values.jurisdiction === 'AMPARO') {
        body.injunctionGranted = values.injunctionGranted
        /* Sin fecha del acto lesivo no hay vencimiento que calcular: el plazo,
           su tipo de día y la renovación sólo viajan con ella (V4 D-78). */
        const harmfulActDate = values.harmfulActDate.trim()
        if (harmfulActDate) {
            body.harmfulActDate = harmfulActDate
            body.harmfulActTermDays = Number(values.harmfulActTermDays.trim())
            body.harmfulActTermDayType = values.harmfulActTermDayType
            body.harmfulActRenews = values.harmfulActRenews
            if (values.harmfulActRenews) {
                body.harmfulActRenewalDays = Number(values.harmfulActRenewalDays.trim())
            }
        }
    }

    if (values.jurisdiction === 'ADMINISTRATIVE') {
        const exhaustedOn = values.administrativeRemedyExhaustedOn.trim()
        if (exhaustedOn) body.administrativeRemedyExhaustedOn = exhaustedOn
    }

    return body
}
