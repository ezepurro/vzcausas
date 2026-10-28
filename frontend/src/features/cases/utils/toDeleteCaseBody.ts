import type { DeleteCaseBody, DeleteCaseFormValues } from '@/features/cases/types/caseDeletion'

/**
 * Del diálogo al cuerpo de la baja: recorta espacios, y sin motivo no viaja
 * cuerpo. El contrato lo admite: "Sin cuerpo, la baja procede igual" (V5 §3.7).
 */
export function toDeleteCaseBody(values: DeleteCaseFormValues): DeleteCaseBody | undefined {
    const reason = values.reason.trim()
    return reason ? { reason } : undefined
}