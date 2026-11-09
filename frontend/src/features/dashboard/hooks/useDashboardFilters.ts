import { useCallback, type SetStateAction } from 'react'
import { useSearchParams } from 'react-router'
import { URGENCIES, type Urgency } from '@/features/dashboard/utils/urgency'
import type { UrgencyFilter } from '@/features/dashboard/components/DeadlinesPanel'

export type Board = 'lawyer' | 'administrator'

/** Los parámetros de la URL de Inicio. */
const PARAM = { board: 'tablero', urgency: 'urgencia', lawyer: 'responsable' } as const

function parseBoard(value: string | null): Board | null {
    return value === 'lawyer' || value === 'administrator' ? value : null
}

function parseUrgency(value: string | null): UrgencyFilter {
    return (URGENCIES as readonly string[]).includes(value ?? '') ? (value as Urgency) : 'all'
}

function parseLawyerId(value: string | null): number | null {
    const id = Number(value)
    return value && Number.isInteger(id) && id > 0 ? id : null
}

/**
 * La pestaña y los filtros de los tableros, guardados en la URL
 * (`/?tablero=administrator&urgencia=overdue&responsable=3`) y no en el estado
 * del componente: así sobreviven a abrir una causa y volver con la flechita,
 * al botón atrás del navegador y a recargar la página.
 *
 * Entrar a Inicio desde el menú no trae parámetros: abre en "Mi día" sin
 * filtros (CA-41.7). Un valor que no se entiende cuenta como ausente.
 *
 * Escribe siempre con `replace`: tocar un filtro no suma una entrada al
 * historial, y la flechita vuelve a la pantalla anterior, no al filtro
 * anterior.
 */
export function useDashboardFilters() {
    const [params, setParams] = useSearchParams()

    const board = parseBoard(params.get(PARAM.board))
    const urgency = parseUrgency(params.get(PARAM.urgency))
    const lawyerId = parseLawyerId(params.get(PARAM.lawyer))

    /** `null` saca el parámetro. */
    const update = useCallback(
        (changes: (current: URLSearchParams) => Record<string, string | null>) => {
            setParams(
                (current) => {
                    const next = new URLSearchParams(current)
                    for (const [key, value] of Object.entries(changes(current))) {
                        if (value === null) next.delete(key)
                        else next.set(key, value)
                    }
                    return next
                },
                { replace: true },
            )
        },
        [setParams],
    )

    /** Cambiar de tablero limpia los filtros: son de la pestaña que se deja. */
    const setBoard = useCallback(
        (next: Board) => update(() => ({ [PARAM.board]: next, [PARAM.urgency]: null, [PARAM.lawyer]: null })),
        [update],
    )

    const setUrgency = useCallback(
        (next: UrgencyFilter) => update(() => ({ [PARAM.urgency]: next === 'all' ? null : next })),
        [update],
    )

    /** Acepta un valor o una función del valor actual, como un `useState`. */
    const setLawyerId = useCallback(
        (next: SetStateAction<number | null>) =>
            update((current) => {
                const value = typeof next === 'function' ? next(parseLawyerId(current.get(PARAM.lawyer))) : next
                return { [PARAM.lawyer]: value === null ? null : String(value) }
            }),
        [update],
    )

    return { board, setBoard, urgency, setUrgency, lawyerId, setLawyerId }
}
