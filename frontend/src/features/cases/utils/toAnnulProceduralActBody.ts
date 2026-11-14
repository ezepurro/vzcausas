import type {
    AnnulProceduralActBody,
    AnnulProceduralActFormValues,
} from '@/features/cases/types/proceduralActAnnulment'

/**
 * Del diálogo al cuerpo de la anulación: recorta espacios, y sin motivo no
 * viaja cuerpo. El contrato lo admite: el cuerpo es opcional (V6 §3.8).
 */
export function toAnnulProceduralActBody(values: AnnulProceduralActFormValues): AnnulProceduralActBody | undefined {
    const reason = values.reason.trim()
    return reason ? { reason } : undefined
}
