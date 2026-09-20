import type { PillTone } from '@/shared/components/ui';
import type { DayType } from '@/features/legal-params/types/proceduralState';

/**
 * Tono del `Pill` según cómo se cuentan los días.
 *
 * Mapa de presentación del módulo, que es lo que el CLAUDE.md permite en
 * `utils/`. Los días corridos son los que hay que mirar con más atención
 * —corren sábados, domingos y feria— así que van en `warn`, el bronce del
 * prototipo. Los hábiles quedan neutros, y `NONE` también: un estado sin plazo
 * no pide atención, es sólo un tramo del ciclo.
 */
export function dayTypeTone(dayType: DayType): PillTone {
    return dayType === 'CONSECUTIVE' ? 'warn' : 'neutral';
}
