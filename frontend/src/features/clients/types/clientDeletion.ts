/**
 * Dar de baja un cliente (HU11, V6 §3.6 `DELETE /clients/{clientId}` y §4
 * "Bajas").
 *
 * La baja es lógica (RN12): el cliente se conserva, pero para el cliente HTTP
 * deja de existir: no se lista, su consulta responde `404` y no se puede
 * elegir para una causa nueva. No procede si tiene causas activas
 * (`409 CLIENT_HAS_ACTIVE_CASES`, D-122). El motivo es opcional y queda en la
 * auditoría; no hay endpoint para consultarlo.
 */

/** Cuerpo del `DELETE /clients/{clientId}`. Opcional, como el de las causas. */
export interface DeleteClientBody {
    /** Hasta 500 caracteres (CA-11.7). */
    reason?: string
}

/** Los valores del diálogo "Eliminar cliente". */
export type DeleteClientFormValues = {
    /** "Motivo (opcional)". */
    reason: string
}