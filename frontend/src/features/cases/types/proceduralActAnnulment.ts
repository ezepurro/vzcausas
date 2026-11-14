/**
 * Anular un acto procesal (HU29, V6 §3.8, D-124).
 *
 * La anulación es una baja lógica (RN12): el acto se conserva, con el motivo,
 * quién lo anuló y cuándo, en la auditoría, pero para el cliente deja de
 * existir. No aparece en la línea de vida, su `GET` y su `PATCH` responden
 * `404`, y el estado de la causa se recalcula con el acto vigente más
 * reciente (D-99).
 *
 * Vive en `cases` y no en `proceedings` porque se anula desde la línea de
 * vida del detalle de la causa, y las dependencias van `proceedings → cases`
 * (como los actos interruptivos).
 */

/** Cuerpo opcional del `DELETE /cases/{caseId}/procedural-acts/{actId}`. */
export interface AnnulProceduralActBody {
    /** Hasta 500 caracteres. */
    reason?: string
}

/** Los valores del diálogo "Anular acto procesal". */
export type AnnulProceduralActFormValues = {
    /** "Motivo de la anulación (opcional)". */
    reason: string
}
