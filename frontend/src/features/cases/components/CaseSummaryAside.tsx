import { Button, DetailList, Panel, type DetailItem } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'

/** Una calificación elegida, con su vencimiento estimado. */
export interface SummaryPrescription {
    name: string
    /** "8 años", ya formateado. */
    term: string
    /** `YYYY-MM-DD`, o `null` si todavía no hay fecha de inicio. */
    expiresOn: string | null
}

export interface ChecklistItem {
    label: string
    done: boolean
}

export interface CaseSummaryAsideProps {
    /** `null` mientras no hay cliente elegido. */
    suggestedCaption: string | null
    /** "Usar esta carátula": la pantalla la copia al campo. */
    onUseCaption: () => void
    /** `true` si la carátula del formulario ya es la sugerida: el botón no hace falta. */
    captionIsSuggested: boolean
    /** El estado de posición 1 del fuero, o `null` si todavía no se cargó. */
    initialState: string | null
    /**
     * `null` fuera del fuero penal: la prescripción no aplica. En el penal, una
     * por calificación elegida (puede ser una lista vacía).
     */
    prescriptions: SummaryPrescription[] | null
    /** El nombre del fuero, para "No aplica al fuero Amparo". */
    jurisdictionLabel: string
    /** "Para poder registrar": lo que falta y lo que ya está. */
    checklist: ChecklistItem[]
}

/**
 * El panel "Resumen del alta" de Registrar causa: la carátula sugerida, con
 * qué estado va a nacer la causa, su prescripción y lo que falta para poder
 * registrarla.
 *
 * Todo lo recibe calculado: la carátula con `utils/suggestedCaption`, el
 * vencimiento con `utils/prescription`. No muestra un vencimiento de plazo
 * porque el alta no abre ninguno (V3 D-09).
 *
 * La "Carpeta en Drive" del prototipo no está: es HU39, del Sprint 3.
 */
export function CaseSummaryAside({
    suggestedCaption, onUseCaption, captionIsSuggested, initialState,
    prescriptions, jurisdictionLabel, checklist,
}: CaseSummaryAsideProps) {
    const summary: DetailItem[] = [
        { label: 'Estado inicial', value: initialState },
        {
            label: 'Prescripción',
            value: prescriptions === null
                ? `No aplica al fuero ${jurisdictionLabel}`
                : prescriptions.length === 0
                    ? 'Falta la calificación legal'
                    : undefined,
        },
    ]

    // En el penal con calificaciones, el renglón de prescripción se reemplaza
    // por uno por calificación, con su vencimiento.
    const items: DetailItem[] = prescriptions && prescriptions.length > 0
        ? [
            summary[0],
            ...prescriptions.map((p) => ({
                label: `${p.name} · ${p.term}`,
                value: formatDate(p.expiresOn),
                mono: true,
            })),
        ]
        : summary

    return (
        <Panel title="Resumen del alta">
            <div className="vz-panel__body">
                <div className="vz-overline">Carátula sugerida</div>
                <div className={`vz-callout ${suggestedCaption ? '' : 'vz-callout--empty'}`}>
                    {suggestedCaption ?? 'Elegí el cliente para sugerir la carátula.'}
                </div>
                <div className="vz-summary__caption-action">
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={!suggestedCaption || captionIsSuggested}
                        onClick={onUseCaption}
                    >
                        Usar esta carátula
                    </Button>
                </div>

                <DetailList items={items} />

                <div className="vz-overline vz-summary__block">Para poder registrar</div>
                <ul className="vz-checklist">
                    {checklist.map((item) => (
                        <li key={item.label} className={`vz-checklist__item ${item.done ? 'is-done' : ''}`}>
                            <span className="vz-checklist__mark" aria-hidden="true">{item.done ? '✓' : '○'}</span>
                            <span>
                                {item.label}
                                {/* La marca es visual: el lector de pantalla necesita la palabra. */}
                                <span className="vz-sr-only">{item.done ? ' (listo)' : ' (falta)'}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </Panel>
    )
}
