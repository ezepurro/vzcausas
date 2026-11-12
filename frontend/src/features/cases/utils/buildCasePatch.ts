/**
 * Del formulario "Modificar causa" al cuerpo del `PATCH /cases/{caseId}`
 * (HU19, V5 §3.7): **sólo lo que cambió** respecto de la causa abierta
 * (CA-19.2).
 *
 * Los dos lados pasan por la misma normalización (`toCaseFields`) antes de
 * compararse: se recortan los espacios, un texto vacío de un campo anulable
 * es `null` y lo que no es del fuero de la causa no se mira. Así un espacio de
 * más no es un cambio, y lo que viaja es lo mismo que se comparó.
 *
 * Si no cambió nada devuelve `{}`, y la página no llama: el contrato responde
 * `400` a un `PATCH` vacío.
 */

import type {
    Case,
    CaseFormValues,
    CaseQualificationBody,
    UpdateCaseBody,
} from '@/features/cases/types/case'
import { caseToFormValues } from '@/features/cases/utils/caseForm'

export function buildCasePatch(original: Case, values: CaseFormValues): UpdateCaseBody {
    const before = toCaseFields(caseToFormValues(original))
    const after = toCaseFields(values)
    const patch: UpdateCaseBody = {}

    function copyIfChanged<K extends keyof UpdateCaseBody>(key: K) {
        if (after[key] !== before[key]) patch[key] = after[key]
    }

    for (const key of Object.keys(after) as (keyof UpdateCaseBody)[]) {
        // Las calificaciones son una lista: se comparan aparte.
        if (key !== 'legalQualifications') copyIfChanged(key)
    }

    /* La lista se reemplaza entera (V5 §3.7): viaja sólo si cambió alguna
       calificación o alguna fecha del hecho. Así una causa "Prescripta" no la
       manda sin que nadie la toque (CA-19.13). */
    if (after.legalQualifications && !sameQualifications(before.legalQualifications, after.legalQualifications)) {
        patch.legalQualifications = after.legalQualifications
    }

    /* Si cambia el SAC, la fecha de inicio viaja siempre con él (CA-19.6):
       con el valor cargado o, si la causa queda sin SAC, en `null`. */
    if ('sacNumber' in patch) patch.startDate = after.startDate ?? null

    return patch
}

/**
 * Los valores del formulario como campos del `PATCH`, completos y
 * normalizados. Sólo los del fuero de la causa: un dato de otro fuero es un
 * `400` (V5 §3.7), así que ni se compara.
 */
function toCaseFields(values: CaseFormValues): UpdateCaseBody {
    const sacNumber = values.sacNumber.trim()
    const fields: UpdateCaseBody = {
        sacNumber: sacNumber || null,
        caption: values.caption.trim(),
        court: values.court.trim() || null,
        instructorName: values.instructorName.trim() || null,
        tribunalPhone: values.tribunalPhone.trim() || null,
        instructorExtension: values.instructorExtension.trim() || null,
        proceduralRole: values.proceduralRole,
        responsibleLawyerId: Number(values.responsibleLawyerId),
        // Sin SAC no hay fecha de inicio (D-38).
        startDate: sacNumber ? values.startDate.trim() || null : null,
        courtFeePaid: values.courtFeePaid,
    }

    if (values.jurisdiction === 'CRIMINAL') {
        fields.legalQualifications = values.legalQualifications.map((q) => ({
            legalQualificationId: q.legalQualificationId,
            offenseDate: q.offenseDate,
        }))
        fields.clientDetained = values.clientDetained
    } else {
        fields.counterparty = values.counterparty.trim() || null
        fields.subjectMatter = values.subjectMatter.trim()
    }

    if (values.jurisdiction === 'AMPARO') {
        fields.injunctionGranted = values.injunctionGranted
        const harmfulActDate = values.harmfulActDate.trim()
        fields.harmfulActDate = harmfulActDate || null
        /* Sin fecha del acto lesivo no hay plazo ni renovación: mandarla en
           `null` los borra con ella (V5 §3.7), así que no se comparan. */
        if (harmfulActDate) {
            fields.harmfulActTermDays = Number(values.harmfulActTermDays.trim())
            fields.harmfulActTermDayType = values.harmfulActTermDayType
            fields.harmfulActRenews = values.harmfulActRenews
            fields.harmfulActRenewalDays = values.harmfulActRenews
                ? Number(values.harmfulActRenewalDays.trim())
                : null
        }
    }

    if (values.jurisdiction === 'ADMINISTRATIVE') {
        fields.administrativeRemedyExhaustedOn = values.administrativeRemedyExhaustedOn.trim() || null
    }

    return fields
}

/**
 * Las mismas calificaciones con las mismas fechas del hecho, sin importar el
 * orden: quitar una y volver a agregarla no es un cambio. No hay repetidas
 * (D-28), así que alcanza con comparar por id.
 */
function sameQualifications(
    a: CaseQualificationBody[] = [],
    b: CaseQualificationBody[] = [],
): boolean {
    if (a.length !== b.length) return false
    const dates = new Map(a.map((q) => [q.legalQualificationId, q.offenseDate]))
    return b.every((q) => dates.get(q.legalQualificationId) === q.offenseDate)
}