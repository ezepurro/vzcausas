import { JURISDICTION_LABELS } from '@/features/legal-params'
import type { CasesByJurisdiction } from '@/features/dashboard/types/dashboard'

interface PortfolioByJurisdictionProps {
    /** Siempre vienen los tres fueros, aunque alguno tenga 0 (CA-42.3). */
    items: CasesByJurisdiction[]
    /** `summary.activeCases`: la suma de los tres. */
    total: number
}

/**
 * "Cartera por fuero" (CA-42.3): una barra partida según cuántas causas
 * activas tiene cada fuero, y debajo la leyenda con los números.
 */
export function PortfolioByJurisdiction({ items, total }: PortfolioByJurisdictionProps) {
    return (
        <>
            <div className="vz-dash-portfolio__head">
                <span>Cartera por fuero</span>
                <span className="vz-dash-portfolio__total">{total} causas</span>
            </div>
            <div className="vz-dash-portfolio__bar" aria-hidden="true">
                {items.map((item) => (
                    <span
                        key={item.jurisdiction}
                        className={`vz-dash-fuero--${item.jurisdiction}`}
                        style={{ flex: `${Math.max(item.activeCases, 1)} 1 0` }}
                    />
                ))}
            </div>
            <div className="vz-dash-portfolio__legend">
                {items.map((item) => (
                    <span key={item.jurisdiction} className="vz-dash-portfolio__item">
                        <span className={`vz-dash-portfolio__swatch vz-dash-fuero--${item.jurisdiction}`} />
                        {JURISDICTION_LABELS[item.jurisdiction]}{' '}
                        <span className="vz-dash-portfolio__count">{item.activeCases}</span>
                    </span>
                ))}
            </div>
        </>
    )
}