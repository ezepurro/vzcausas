/**
 * Los estados del fuero como opciones del combobox "Estado procesal al que
 * pasa la causa", y cómo se resuelve lo que el usuario escribió.
 */

import type { ComboboxOption } from '@/shared/components/forms'
import { DAY_TYPE_LABELS, type ProceduralState } from '@/features/legal-params'

/**
 * Los estados a los que puede pasar la causa: vigentes, **no terminales** (un
 * acto no puede llevar a "Archivada" ni a "Prescripta", V3 D-15) y en el orden
 * en que llegan del backend, que es el de registro: los estados no tienen
 * posición (V3 D-31). Cada opción dice en el segundo renglón qué plazo abre.
 *
 * El estado inicial "Iniciada" no viene en la tabla, así que nunca se ofrece
 * como destino de un acto (V3 D-34).
 */
export function stateOptions(states: ProceduralState[]): ComboboxOption[] {
    return states
        .filter((s) => s.active && !s.terminal)
        .map((s) => ({
            value: String(s.id),
            label: s.name,
            description: termText(s),
        }))
}

/**
 * Las opciones que coinciden con lo escrito, sin distinguir mayúsculas ni
 * tildes. Con el campo vacío, todas: es lo que se ve al abrir la lista.
 */
export function filterStateOptions(options: ComboboxOption[], text: string): ComboboxOption[] {
    const needle = normalize(text)
    if (!needle) return options
    return options.filter((o) => normalize(o.label).includes(needle))
}

/**
 * El estado de la tabla cuyo nombre es exactamente lo escrito, si hay uno.
 *
 * El contrato pide que, si el texto coincide con un estado de la tabla, se
 * mande su `proceduralStateId` y no un `customState` (V3 §3.8): alguien que
 * escribió "oposición" en vez de elegirla de la lista quiso decir ese estado.
 */
export function findStateByName(options: ComboboxOption[], text: string): ComboboxOption | null {
    const needle = normalize(text)
    if (!needle) return null
    return options.find((o) => normalize(o.label) === needle) ?? null
}

/** "5 días hábiles", "30 días corridos", "Sin plazo". */
export function termText(state: Pick<ProceduralState, 'timeLimitDays' | 'dayType'>): string {
    if (state.timeLimitDays === 0) return DAY_TYPE_LABELS.NONE
    const days = state.timeLimitDays === 1 ? 'día' : 'días'
    return `${state.timeLimitDays} ${days} ${DAY_TYPE_LABELS[state.dayType].toLowerCase()}`
}

function normalize(text: string): string {
    return text.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}
