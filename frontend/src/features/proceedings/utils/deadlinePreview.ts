/**
 * Si ya se puede pedir el cómputo del vencimiento y con qué parámetros.
 *
 * El vencimiento no se calcula en el front (V3 D-20): se pide a
 * `deadline-preview`. Esto decide sólo **cuándo** pedirlo, y si todavía no se
 * puede, qué mostrar en "Cómputo del plazo" en su lugar.
 */

import { todayIsoDate } from '@/shared/lib/dates'
import type { Jurisdiction, ProceduralState } from '@/features/legal-params'
import type {
    DeadlinePreviewParams,
    ProceduralActFormValues,
} from '@/features/proceedings/types/proceduralAct'
import { opensTerm } from '@/features/proceedings/utils/resolveState'

/**
 * O se pide el cómputo, o se muestra uno de los estados que no lo necesitan.
 * Las tres formas sin pedido son las mismas de `DeadlinePreviewState`.
 */
export type PreviewRequest =
    | { kind: 'request'; params: DeadlinePreviewParams }
    /** Todavía no se eligió ni escribió el estado. */
    | { kind: 'empty' }
    /** Estado escrito a mano: no tiene plazo de tabla, no hay qué pedir. */
    | { kind: 'custom'; stateName: string }
    /** Falta, o está mal, la fecha desde la que corre el plazo. */
    | { kind: 'missing-base'; message: string }

export function previewRequest(
    values: ProceduralActFormValues,
    selected: ProceduralState | null,
    jurisdiction: Jurisdiction,
): PreviewRequest {
    const stateName = values.stateText.trim()
    if (!stateName) return { kind: 'empty' }
    if (!selected) return { kind: 'custom', stateName }

    const today = todayIsoDate()
    const { actDate, notificationDate } = values

    // Una fecha que el backend va a rechazar no se manda: el error ya lo
    // muestra el campo al confirmar.
    if (!actDate || actDate > today) {
        return { kind: 'missing-base', message: 'Cargá la fecha del acto para calcular el vencimiento.' }
    }

    const params: DeadlinePreviewParams = { proceduralStateId: selected.id, actDate }
    if (jurisdiction !== 'ADMINISTRATIVE') return { kind: 'request', params }

    // RN6: en el administrativo el plazo corre desde la notificación.
    if (!notificationDate) {
        return opensTerm(selected)
            ? { kind: 'missing-base', message: 'Cargá la fecha de notificación: en el fuero administrativo el plazo corre desde ahí.' }
            : { kind: 'request', params }
    }
    if (notificationDate > today || notificationDate < actDate) {
        return { kind: 'missing-base', message: 'La fecha de notificación tiene que estar entre la del acto y hoy.' }
    }
    return { kind: 'request', params: { ...params, notificationDate } }
}
