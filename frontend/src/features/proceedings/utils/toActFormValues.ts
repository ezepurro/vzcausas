/**
 * Del acto procesal guardado a los valores del formulario, para modificarlo
 * (HU28). Es el punto de partida contra el que `buildProceduralActPatch`
 * compara.
 */

import type { ProceduralAct, ProceduralActFormValues } from '@/features/proceedings/types/proceduralAct'

export function toActFormValues(act: ProceduralAct): ProceduralActFormValues {
    const { resultingState, deadline } = act
    const manuallyAdjusted = deadline?.manuallyAdjusted ?? false

    return {
        stateText: resultingState.name,
        // Un estado escrito a mano no tiene id: se carga como texto.
        proceduralStateId: resultingState.proceduralStateId === null ? '' : String(resultingState.proceduralStateId),
        actDate: act.actDate,
        notificationDate: act.notificationDate ?? '',
        notes: act.notes ?? '',
        manualDue: manuallyAdjusted,
        manualDueDate: manuallyAdjusted && deadline ? deadline.dueDate : '',
    }
}
