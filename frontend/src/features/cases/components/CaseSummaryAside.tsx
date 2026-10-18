import { Button, DetailList, Panel, type DetailItem } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'
import { INITIAL_STATE_LABEL } from '@/features/cases/utils/caseState'

/** Una calificación elegida, con su vencimiento estimado. */
export interface SummaryPrescription {
    /** La parte de la denominación antes del artículo: "Robo calificado". */
    name: string
    /** "8 años", ya formateado. */
    term: string
    /** La fecha del hecho, `YYYY-MM-DD`, o `''` si todavía no se cargó. */
    offenseDate: string
    /** `YYYY-MM-DD` (`estimatedExpiry`), o `null` si todavía no hay fecha del hecho. */
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
 * vencimiento con `utils/prescription`.
 *
 * El estado inicial es siempre el mismo y por eso no es una prop: la causa
 * nace "Sin acto procesal" en cualquier fuero, y el estado lo fija su primer
 * acto (V3 D-09). Tampoco muestra un vencimiento de plazo, porque el alta no
 * abre ninguno.
 *
 * La "Carpeta en Drive" del prototipo no está: es HU39, del Sprint 3.
 */
export function CaseSummaryAside({
    suggestedCaption, onUseCaption, captionIsSuggested,
    prescriptions, jurisdictionLabel, checklist,
}: CaseSummaryAsideProps) {
    const initialState: DetailItem = {
        label: 'Estado inicial',
        value: (
            <>
                {INITIAL_STATE_LABEL}
                <span className="vz-details__note">El estado lo fija el primer acto procesal</span>
            </>
        ),
    }

    // En el penal con calificaciones, el renglón de prescripción se reemplaza
    // por uno por calificación: cada una corre desde la fecha de su hecho.
    const prescriptionItems: DetailItem[] = prescriptions && prescriptions.length > 0
        ? prescriptions.map((p) => ({
            label: p.name,
            note: p.offenseDate
                ? `${p.term} desde el ${formatDate(p.offenseDate)}`
                : `${p.term} · falta la fecha del hecho`,
            value: formatDate(p.expiresOn),
            mono: true,
        }))
        : [
            {
                label: 'Prescripción',
                value: prescriptions === null
                    ? `No aplica al fuero ${jurisdictionLabel}`
                    : 'Falta la calificación legal',
            },
        ]

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

                <DetailList items={[initialState, ...prescriptionItems]} />

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
