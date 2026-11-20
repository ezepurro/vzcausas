import { IconButton } from '@/shared/components/ui'
import { lastClosedPeriod, periodLabel, periodRange, shiftPeriod } from '@/features/dashboard/utils/reportPeriod'

interface ReportPeriodPickerProps {
    period: string
    availableFrom: string
    currentPeriod: string
    onChange: (period: string) => void
}

/**
 * "Mes anterior", el selector de meses y "Mes siguiente" (CA-43.3). Solo se
 * ofrecen los meses de `availableFrom` a `currentPeriod`, que se marca
 * "(en curso)"; no hay meses anteriores al primero con reporte (CA-43.4).
 *
 * Desde el 19/11/2026 las flechas y el mes van en un solo recuadro, y
 * "Último cerrado" es un link chico al costado (`dashboard/CAMBIOS.md`).
 */
export function ReportPeriodPicker({ period, availableFrom, currentPeriod, onChange }: ReportPeriodPickerProps) {
    const months = periodRange(availableFrom, currentPeriod).reverse()
    const lastClosed = lastClosedPeriod(availableFrom, currentPeriod)
    const isFirst = period <= availableFrom
    const isCurrent = period >= currentPeriod

    return (
        <div className="vz-report-picker">
            {/* A la izquierda del selector (pedido del 14/11/2026). */}
            {lastClosed && period !== lastClosed && (
                <button type="button" className="vz-link-button" onClick={() => onChange(lastClosed)}>
                    Último cerrado
                </button>
            )}
            <div className="vz-report-picker__nav" role="group" aria-label="Cambiar de mes">
                <IconButton
                    name="back"
                    label="Mes anterior"
                    title="Mes anterior"
                    className="vz-report-picker__arrow"
                    disabled={isFirst}
                    onClick={() => onChange(shiftPeriod(period, -1))}
                />
                <select
                    className="vz-select vz-report-picker__select"
                    aria-label="Mes del reporte"
                    value={period}
                    onChange={(e) => onChange(e.target.value)}
                >
                    {months.map((m) => (
                        <option key={m} value={m}>
                            {m === currentPeriod ? `${periodLabel(m)} (en curso)` : periodLabel(m)}
                        </option>
                    ))}
                </select>
                <IconButton
                    name="forward"
                    label="Mes siguiente"
                    title="Mes siguiente"
                    className="vz-report-picker__arrow"
                    disabled={isCurrent}
                    onClick={() => onChange(shiftPeriod(period, 1))}
                />
            </div>
        </div>
    )
}
