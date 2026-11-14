import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Icon, PageHeader, Pagination, Panel, SearchInput, LoadError } from '@/shared/components/ui'
import type { SelectOption, SelectOptionGroup } from '@/shared/components/forms'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { usePageTitle } from '@/shared/hooks/usePageTitle'
import { formatPersonName } from '@/shared/lib/personName'
import { useLawyers } from '@/features/lawyers'
import {
    JURISDICTION_LABELS,
    JURISDICTIONS,
    useProceduralStates,
    type Jurisdiction,
    type ProceduralState,
} from '@/features/legal-params'
import { useCases, usePrefetchCasesPage } from '@/features/cases/api/useCases'
import { useCaseCustomStates } from '@/features/cases/api/useCaseCustomStates'
import { usePrefetchCase } from '@/features/cases/api/usePrefetchCase'
import { CaseFilters } from '@/features/cases/components/CaseFilters'
import { CasesTable } from '@/features/cases/components/CasesTable'
import { INITIAL_STATE_LABEL } from '@/features/cases/utils/caseState'
import {
    ALL_STATES,
    customStateFilterValue,
    stateFilterParams,
    stateFilterValue,
    WITHOUT_ACTS,
} from '@/features/cases/utils/stateFilter'

const LIMIT = 20
//Limite de opciones para poner en los selects, 
// la paginacion trae 20 causas, pero los selects
// tienen que mostrar todos entonces le pones de limite
// 100 opciones en el select
const OPTIONS_LIMIT = 100

export function CasesPage() {
    usePageTitle('Causas')
    const navigate = useNavigate()
    // Al apuntar a "Ver detalle" se pide la causa: cuando llega el click, ya está o está en camino.
    const prefetchCase = usePrefetchCase()

    /* ---------------- las busquedas y filtros del usuario ---------------- */
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebouncedValue(search.trim())
    const [page, setPage] = useState(1)
    const [jurisdiction, setJurisdiction] = useState<Jurisdiction | ''>('')
    const [state, setState] = useState(ALL_STATES)
    const [responsibleLawyerId, setResponsibleLawyerId] = useState('')
    const [openDeadline, setOpenDeadline] = useState(false)

        /* ---------------- Causas ---------------- */

        const listParams = {
            //Los ponemos en undefined asi no viajan la busqueda los filtros
            search: debouncedSearch === '' ? undefined : debouncedSearch,
            page,
            limit: LIMIT,
            jurisdiction: jurisdiction === '' ? undefined : jurisdiction,
            responsibleLawyerId: responsibleLawyerId === '' ? undefined : Number(responsibleLawyerId),
            openDeadline: openDeadline ? true : undefined,
            ...stateFilterParams(state),
        }
        const query = useCases(listParams)
        // Al apuntar a "Siguiente" se pide esa página (`usePrefetchPage`).
        const prefetchPage = usePrefetchCasesPage(listParams)
        const rows = query.data?.data ?? []
        const pagination = query.data?.pagination 

         /* ---------------- las opciones de los desplegables ---------------- */
        const lawyersQuery = useLawyers({ page: 1, limit: OPTIONS_LIMIT })
        const criminalStates = useProceduralStates({ jurisdiction: 'CRIMINAL', page: 1, limit: OPTIONS_LIMIT })
        const amparoStates = useProceduralStates({ jurisdiction: 'AMPARO', page: 1, limit: OPTIONS_LIMIT })
        const administrativeStates = useProceduralStates({ jurisdiction: 'ADMINISTRATIVE', page: 1, limit: OPTIONS_LIMIT })
        const statesByJurisdiction: Record<Jurisdiction, ProceduralState[]> = {
            CRIMINAL: criminalStates.data?.data ?? [],
            AMPARO: amparoStates.data?.data ?? [],
            ADMINISTRATIVE: administrativeStates.data?.data ?? [],
        }       
        const customStates = useCaseCustomStates(jurisdiction === '' ? undefined : jurisdiction).data ?? []
        const lawyerOptions: SelectOption[] = (lawyersQuery.data?.data ?? []).map(lawyer => ({
            value: String(lawyer.id),
            label: formatPersonName(lawyer),
    }))
        const shownJurisdictions: readonly Jurisdiction[] = jurisdiction === '' ? JURISDICTIONS : [jurisdiction]
        const stateOptions: SelectOptionGroup[] = [
        ...shownJurisdictions.map((j) => ({
            group: `Fuero ${JURISDICTION_LABELS[j]}`,
            options: statesByJurisdiction[j].map((s) => ({ value: stateFilterValue(s.id), label: s.name })),
        })),
        { group: 'Causas nuevas', options: [{ value: WITHOUT_ACTS, label: INITIAL_STATE_LABEL }] },
    ]
    if (customStates.length > 0) {
        stateOptions.push({
            group: 'Escritos a mano en causas',
            options: customStates.map((name) => ({ value: customStateFilterValue(name), label: name })),
        })
    }


     /* ---------------- cambios: cada uno vuelve a la página 1 ---------------- */
    function changeSearch(value: string) {
        setSearch(value)
        setPage(1)
    }

    function keepsState(next: Jurisdiction | ''): boolean {
        if (state === ALL_STATES || state === WITHOUT_ACTS || next === '') return true
        return statesByJurisdiction[next].some((s) => stateFilterValue(s.id) === state)
    }

    function changeJurisdiction(next: Jurisdiction | '') {
        setJurisdiction(next)
        if (!keepsState(next)) setState(ALL_STATES)
        setPage(1)
    }

    function changeResponsibleLawyer(value: string) {
        setResponsibleLawyerId(value)
        setPage(1)
    }

    function changeState(value: string) {
        setState(value)
        setPage(1)
    }

    function changeOpenDeadline(value: boolean) {
        setOpenDeadline(value)
        setPage(1)
    }

    function clearFilters() {
        setJurisdiction('')
        setResponsibleLawyerId('')
        setState(ALL_STATES)
        setOpenDeadline(false)
        setPage(1)
    }

    /* ---------------- pantalla ---------------- */
    return (
        <>
            <PageHeader
                eyebrow="Trabajo diario"
                title="Causas"
                actions={
                    <Button icon={<Icon name="plus" />} size="md" onClick={() => navigate('/causas/nueva')}>
                        Registrar causa
                    </Button>
                }
            />
            <Panel
                actions={
                    <>
                        <SearchInput
                            placeholder="Buscar por SAC, carátula o cliente"
                            aria-label="Buscar causa"
                            value={search}
                            onChange={(e) => changeSearch(e.target.value)}
                        />
                        <CaseFilters
                            jurisdiction={jurisdiction}
                            responsibleLawyerId={responsibleLawyerId}
                            state={state}
                            openDeadline={openDeadline}
                            lawyerOptions={lawyerOptions}
                            stateOptions={stateOptions}
                            onJurisdictionChange={changeJurisdiction}
                            onResponsibleLawyerChange={changeResponsibleLawyer}
                            onStateChange={changeState}
                            onOpenDeadlineChange={changeOpenDeadline}
                            onClear={clearFilters}
                        />
                    </>
                }
                /* Sin datos no hay pie: mientras carga o si falló, decía "Sin
                   resultados" (H-57). */
                footer={query.isSuccess && (
                    <Pagination
                        page={pagination?.page ?? 1}
                        totalPages={pagination?.totalPages ?? 1}
                        totalItems={pagination?.totalItems ?? 0}
                        noun={['causa', 'causas']}
                        onChange={setPage}
                        onIntent={prefetchPage}
                    />
                )}
            >
                {query.isError ? (
                    <LoadError title="No se pudieron cargar las causas" error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
                ) : (
                    <CasesTable
                        loading={query.isPending}
                        busy={query.isPlaceholderData}
                        rows={rows}
                        onOpen={(c) => navigate(`/causas/${c.id}`)}
                        onIntent={(c) => prefetchCase(c.id)}
                        empty={
                            <div className="vz-empty">
                                <div className="vz-empty__title">Sin causas</div>
                                <div className="vz-empty__text">Ninguna causa coincide con los filtros.</div>
                            </div>
                        }
                    />
                )}
            </Panel>
        </>
    )
    }       
