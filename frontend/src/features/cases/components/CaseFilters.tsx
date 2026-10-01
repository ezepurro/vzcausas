import { Button } from '@/shared/components/ui'
import { Select, type SelectOption, type SelectOptionGroup } from '@/shared/components/forms'
import { JURISDICTION_LABELS, JURISDICTIONS, type Jurisdiction } from '@/features/legal-params'
import { ALL_STATES } from '@/features/cases/utils/stateFilter'

export interface CaseFiltersProps {
    /** `''` = todos los fueros. */
    jurisdiction: Jurisdiction | ''
    /** Id del abogado como texto; `''` = todos. */
    responsibleLawyerId: string
    /** Valor de `utils/stateFilter`; `''` = todos. */
    state: string
    openDeadline: boolean
    /** Los abogados, ya armados por la pantalla. */
    lawyerOptions: SelectOption[]
    /**
     * Los estados agrupados por fuero, el grupo "Causas nuevas" con "Sin acto
     * procesal" (`WITHOUT_ACTS`) y, si hay, "Escritos a mano en causas". Los
     * arma la pantalla con los valores de `utils/stateFilter`.
     */
    stateOptions: SelectOptionGroup[]
    onJurisdictionChange: (value: Jurisdiction | '') => void
    onResponsibleLawyerChange: (value: string) => void
    onStateChange: (value: string) => void
    onOpenDeadlineChange: (value: boolean) => void
    onClear: () => void
}

const JURISDICTION_OPTIONS: SelectOption[] = [
    { value: '', label: 'Todos los fueros' },
    ...JURISDICTIONS.map((j) => ({ value: j, label: JURISDICTION_LABELS[j] })),
]

/**
 * Los filtros del listado de causas. Van en `Panel actions`.
 *
 * Presentacional: los valores y el efecto de cambiarlos (volver a la página
 * 1, pedir de nuevo) son de la pantalla. "Limpiar filtros" aparece sólo
 * cuando hay algo que limpiar.
 *
 * Al cambiar el fuero, la pantalla decide si el estado elegido se conserva:
 * uno del fuero anterior no, "Sin acto procesal" sí.
 */
export function CaseFilters({
    jurisdiction, responsibleLawyerId, state, openDeadline, lawyerOptions, stateOptions,
    onJurisdictionChange, onResponsibleLawyerChange, onStateChange, onOpenDeadlineChange, onClear,
}: CaseFiltersProps) {
    const hasFilters =
        jurisdiction !== '' || responsibleLawyerId !== '' || state !== ALL_STATES || openDeadline

    return (
        <>
            <Select
                aria-label="Filtrar por fuero"
                options={JURISDICTION_OPTIONS}
                value={jurisdiction}
                onChange={(e) => onJurisdictionChange(e.target.value as Jurisdiction | '')}
            />
            <Select
                aria-label="Filtrar por responsable"
                options={[{ value: '', label: 'Todos los responsables' }, ...lawyerOptions]}
                value={responsibleLawyerId}
                onChange={(e) => onResponsibleLawyerChange(e.target.value)}
            />
            <Select
                aria-label="Filtrar por estado procesal"
                options={[{ value: ALL_STATES, label: 'Todos los estados procesales' }, ...stateOptions]}
                value={state}
                onChange={(e) => onStateChange(e.target.value)}
            />
            <Button
                variant="secondary"
                size="md"
                pressed={openDeadline}
                onClick={() => onOpenDeadlineChange(!openDeadline)}
            >
                Solo con plazo por vencer
            </Button>
            {hasFilters && (
                <Button variant="ghost" size="md" onClick={onClear}>Limpiar filtros</Button>
            )}
        </>
    )
}
