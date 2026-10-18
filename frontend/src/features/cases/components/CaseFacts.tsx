import { DetailList, Panel, type DetailItem } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'
import { DAY_TYPE_LABELS, JURISDICTION_LABELS } from '@/features/legal-params'
import type { Case } from '@/features/cases/types/case'

export interface CaseFactsProps {
    case: Case
}

/**
 * La tarjeta "Datos del fuero" del detalle de la causa: los datos propios de
 * cada fuero y la tasa de justicia (V4 D-67).
 *
 * Estos datos no figuran en el prototipo; el contrato pide que el detalle los
 * sume. Se cargan sólo en el alta: modificarlos llega con HU19, así que la
 * tarjeta es de lectura.
 *
 * En el amparo muestra además la fecha vigente del acto lesivo, que puede ser
 * una renovación calculada por el backend (D-78). El vencimiento de ese plazo
 * va en el chip del encabezado, como cualquier otro vencimiento.
 */
export function CaseFacts({ case: c }: CaseFactsProps) {
    const items: DetailItem[] = [...jurisdictionItems(c), { label: 'Tasa de justicia', value: yesNo(c.courtFeePaid, 'Pagada', 'Sin pagar') }]

    return (
        <Panel title={`Datos del fuero ${JURISDICTION_LABELS[c.jurisdiction]}`}>
            <div className="vz-panel__body">
                <DetailList items={items} />
            </div>
        </Panel>
    )
}

function jurisdictionItems(c: Case): DetailItem[] {
    switch (c.jurisdiction) {
        case 'CRIMINAL':
            return [{ label: 'Cliente preso', value: yesNo(c.clientDetained) }]
        case 'ADMINISTRATIVE':
            return [
                {
                    label: 'Agotamiento de la vía administrativa',
                    value: c.administrativeRemedyExhaustedOn
                        ? formatDate(c.administrativeRemedyExhaustedOn)
                        : 'Sin agotar',
                    mono: c.administrativeRemedyExhaustedOn !== null,
                },
            ]
        case 'AMPARO':
            return amparoItems(c)
    }
}

function amparoItems(c: Case): DetailItem[] {
    const items: DetailItem[] = [
        { label: 'Medida cautelar', value: yesNo(c.injunctionGranted, 'Concedida', 'No concedida') },
        {
            label: 'Fecha del acto lesivo',
            value: c.harmfulActDate ? formatDate(c.harmfulActDate) : null,
            mono: true,
        },
    ]
    if (!c.harmfulActDate) return items

    if (c.harmfulActRenews && c.harmfulActRenewalDays !== null) {
        items.push({
            label: 'Renovación del acto lesivo',
            value: `Cada ${c.harmfulActRenewalDays} ${c.harmfulActRenewalDays === 1 ? 'día corrido' : 'días corridos'}`,
        })
    }
    if (c.harmfulActDeadline?.renewed) {
        items.push({
            label: 'Renovación vigente',
            value: formatDate(c.harmfulActDeadline.actDate),
            mono: true,
        })
    }
    if (c.harmfulActTermDays !== null && c.harmfulActTermDayType !== null) {
        items.push({
            label: 'Plazo para presentar el amparo',
            value: `${c.harmfulActTermDays} ${c.harmfulActTermDays === 1 ? 'día' : 'días'} ${DAY_TYPE_LABELS[c.harmfulActTermDayType].toLowerCase()}`,
        })
    }
    return items
}

/** `true`/`false` a texto; `null` (dato de otro fuero) se muestra como raya. */
function yesNo(value: boolean | null, yes = 'Sí', no = 'No'): string | null {
    if (value === null) return null
    return value ? yes : no
}
