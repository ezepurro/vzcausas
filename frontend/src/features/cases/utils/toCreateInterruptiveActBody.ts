import type {
    CreateInterruptiveActBody,
    InterruptiveActFormValues,
} from '@/features/cases/types/interruptiveAct'

/** Del modal al cuerpo del alta: recorta espacios y unas observaciones vacías no viajan. */
export function toCreateInterruptiveActBody(values: InterruptiveActFormValues): CreateInterruptiveActBody {
    const notes = values.notes.trim()
    return {
        name: values.name.trim(),
        actDate: values.actDate,
        ...(notes ? { notes } : {}),
    }
}
