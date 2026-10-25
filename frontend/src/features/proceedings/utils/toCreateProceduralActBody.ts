/**
 * Del formulario al cuerpo de `POST /cases/{caseId}/procedural-acts`.
 */

import type { Jurisdiction, ProceduralState } from '@/features/legal-params'
import type {
    CreateProceduralActBody,
    ProceduralActFormValues,
} from '@/features/proceedings/types/proceduralAct'

/**
 * Recorta los textos y deja afuera lo que no corresponde mandar:
 * - `proceduralStateId` **o** `customState`, nunca los dos (V3 §3.8);
 * - `notificationDate` sólo en el fuero administrativo (RN6);
 * - `manualDueDate` sólo si se tildó el ajuste manual, y nunca hacia un estado
 *   terminal: no abre plazo y el contrato no admite el ajuste (V4 §3.8);
 * - `notes` vacías no viajan.
 *
 * `selected` es el estado de la tabla que resolvió `resolveSelectedState`;
 * `null` = estado escrito a mano.
 */
export function toCreateProceduralActBody(
    values: ProceduralActFormValues,
    selected: ProceduralState | null,
    jurisdiction: Jurisdiction,
): CreateProceduralActBody {
    const body: CreateProceduralActBody = selected
        ? { proceduralStateId: selected.id, actDate: values.actDate }
        : { customState: values.stateText.trim(), actDate: values.actDate }

    if (jurisdiction === 'ADMINISTRATIVE' && values.notificationDate) {
        body.notificationDate = values.notificationDate
    }
    if (values.manualDue && values.manualDueDate && !selected?.terminal) {
        body.manualDueDate = values.manualDueDate
    }
    const notes = values.notes.trim()
    if (notes) body.notes = notes

    return body
}
