import type { ReactNode } from 'react';

export type TonoPill = 'neutral' | 'ok' | 'warn' | 'danger' | 'primary';

export interface PillProps {
  tono?: TonoPill;
  /** muestra el punto a la izquierda; 'hollow' lo deja sin relleno */
  punto?: boolean | 'hollow';
  children: ReactNode;
}

/**
 * Píldora de estado. El tono es decisión de la pantalla:
 * warn = plazo por vencer, danger = vencido o prescripta, ok = al día.
 */
export function Pill({ tono = 'neutral', punto, children }: PillProps) {
  return (
    <span className={`vz-pill vz-pill--${tono}`}>
      {punto && <span className={`vz-dot ${punto === 'hollow' ? 'vz-dot--hollow' : ''}`} />}
      {children}
    </span>
  );
}
