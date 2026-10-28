/**
 * Dar de baja una causa (HU21, V5 §3.7 y §4 "Bajas").
 *
 * La baja es lógica (RN12): la causa se conserva con sus actos y documentos,
 * pero para el cliente deja de existir. El motivo es opcional y queda en la
 * auditoría; no hay endpoint para consultarlo.
 */

/** Cuerpo del `DELETE /cases/{caseId}`, el único `DELETE` del contrato con cuerpo. */
export interface DeleteCaseBody {
    /** Hasta 500 caracteres. */
    reason?: string
}

/** Los valores del diálogo "Dar de baja la causa". */
export type DeleteCaseFormValues = {
    /** "Motivo (opcional)". */
    reason: string
}