import type { ProceduralActFormValues } from '@/features/proceedings/types/proceduralAct'

/** El formulario recién abierto el día del prototipo (15/09/2026). */
export const EMPTY_VALUES: ProceduralActFormValues = {
    stateText: '',
    proceduralStateId: '',
    actDate: '2026-09-15',
    notificationDate: '',
    notes: '',
    manualDue: false,
    manualDueDate: '',
}
