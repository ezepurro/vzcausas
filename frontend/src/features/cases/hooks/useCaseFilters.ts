import { useCallback, useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { JURISDICTIONS, type Jurisdiction } from '@/features/legal-params'
import { rememberCasesList } from '@/features/cases/utils/casesListPath'
import { UNASSIGNED_FILTER } from '@/features/cases/utils/responsibleFilter'
import { ALL_STATES, WITHOUT_ACTS } from '@/features/cases/utils/stateFilter'

/** Lo que el usuario eligió en el listado de causas. */
export interface CaseFilterValues {
    search: string
    page: number
    /** `''` = todos los fueros. */
    jurisdiction: Jurisdiction | ''
    /** Id del abogado como texto, `UNASSIGNED_FILTER` o `''` = todos. */
    responsibleLawyerId: string
    /** Valor de `utils/stateFilter`; `ALL_STATES` = todos. */
    state: string
    openDeadline: boolean
}

/** Los parámetros de la URL del listado. */
const PARAM = {
    search: 'buscar',
    page: 'pagina',
    jurisdiction: 'fuero',
    responsibleLawyerId: 'responsable',
    state: 'estado',
    openDeadline: 'plazo',
} as const satisfies Record<keyof CaseFilterValues, string>

const DEFAULTS: CaseFilterValues = {
    search: '',
    page: 1,
    jurisdiction: '',
    responsibleLawyerId: '',
    state: ALL_STATES,
    openDeadline: false,
}

function parsePage(value: string | null): number {
    const page = Number(value)
    return Number.isInteger(page) && page >= 1 ? page : DEFAULTS.page
}

function parseJurisdiction(value: string | null): Jurisdiction | '' {
    return (JURISDICTIONS as readonly string[]).includes(value ?? '') ? (value as Jurisdiction) : ''
}

function parseResponsible(value: string | null): string {
    if (value === UNASSIGNED_FILTER) return value
    const id = Number(value)
    return value && Number.isInteger(id) && id > 0 ? value : ''
}

/** Uno de los tres tipos de valor del filtro de estado (`utils/stateFilter`). */
function parseState(value: string | null): string {
    if (value === null) return ALL_STATES
    if (value === WITHOUT_ACTS || /^state:\d+$/.test(value) || /^custom:.+/.test(value)) return value
    return ALL_STATES
}

/** El valor en la URL, o `null` si es el de por defecto: así no viaja. */
function toParam(key: keyof CaseFilterValues, value: CaseFilterValues[keyof CaseFilterValues]): string | null {
    if (value === DEFAULTS[key]) return null
    if (key === 'openDeadline') return value ? '1' : null
    return String(value)
}

/**
 * La búsqueda, los filtros y la página del listado de causas, guardados en
 * la URL (`/causas?responsable=3&fuero=CRIMINAL&pagina=2`) y no en el estado
 * del componente: sobreviven a abrir una causa y volver con la flecha, al
 * botón atrás del navegador y a recargar. Es el molde de
 * `dashboard/hooks/useDashboardFilters`.
 *
 * Entrar desde el menú lateral no trae parámetros: abre limpio. Un valor que
 * no se entiende cuenta como ausente. Escribe con `replace`: tocar un filtro
 * no suma una entrada al historial.
 *
 * Además recuerda el último listado de la pestaña, para las migas "Causas"
 * (`utils/casesListPath`).
 */
export function useCaseFilters() {
    const [params, setParams] = useSearchParams()
    const { search: locationSearch } = useLocation()

    useEffect(() => {
        rememberCasesList(locationSearch)
    }, [locationSearch])

    const values: CaseFilterValues = {
        search: params.get(PARAM.search) ?? DEFAULTS.search,
        page: parsePage(params.get(PARAM.page)),
        jurisdiction: parseJurisdiction(params.get(PARAM.jurisdiction)),
        responsibleLawyerId: parseResponsible(params.get(PARAM.responsibleLawyerId)),
        state: parseState(params.get(PARAM.state)),
        openDeadline: params.get(PARAM.openDeadline) === '1',
    }

    /** Cambia los valores que vienen; los demás quedan como están. */
    const update = useCallback(
        (changes: Partial<CaseFilterValues>) => {
            setParams(
                (current) => {
                    const next = new URLSearchParams(current)
                    for (const [key, value] of Object.entries(changes) as [keyof CaseFilterValues, CaseFilterValues[keyof CaseFilterValues]][]) {
                        const param = toParam(key, value)
                        if (param === null) next.delete(PARAM[key])
                        else next.set(PARAM[key], param)
                    }
                    return next
                },
                { replace: true },
            )
        },
        [setParams],
    )

    return { ...values, update }
}
