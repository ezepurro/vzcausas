export type MeterTone = 'primary' | 'warn' | 'danger';

export interface MeterProps {
  /** cuánto va */
  value: number;
  /** contra qué se compara; por defecto 100, para pasar un porcentaje */
  max?: number;
  /** qué mide, para el lector de pantalla: "Prescripción transcurrida" */
  label: string;
  /** cómo lo dice el lector de pantalla, si el número pelado no alcanza: "27 %" */
  valueText?: string;
  /** el color lo decide la pantalla: warn = cerca del límite */
  tone?: MeterTone;
}

/**
 * Barra horizontal de cuánto de algo ya se ocupó: la prescripción
 * transcurrida de una causa, la carga de causas de un abogado contra el
 * máximo del estudio.
 *
 * No es una barra de progreso: no mide una tarea que va a terminar, mide una
 * cantidad dentro de un rango. Por eso es `role="meter"`.
 *
 * El valor se recorta al rango: una prescripción ya cumplida o un abogado por
 * encima del máximo llenan la barra, no la desbordan.
 */
export function Meter({ value, max = 100, label, valueText, tone = 'primary' }: MeterProps) {
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = max > 0 ? (clamped / max) * 100 : 0;

  return (
    <div
      className={`vz-meter vz-meter--${tone}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
      aria-valuetext={valueText}
    >
      <div className="vz-meter__fill" style={{ width: `${percent}%` }} />
    </div>
  );
}
