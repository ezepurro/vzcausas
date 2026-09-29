import type { ReactNode } from 'react';

export type PillTone = 'neutral' | 'ok' | 'warn' | 'danger' | 'primary';

export interface PillProps {
  tone?: PillTone;
  /** muestra el punto a la izquierda; 'hollow' lo deja sin relleno */
  dot?: boolean | 'hollow';
  children: ReactNode;
}

/**
 * Píldora de estado. El tono es decisión de la pantalla:
 * warn = plazo por vencer, danger = vencido o prescripta, ok = al día.
 */
export function Pill({ tone = 'neutral', dot, children }: PillProps) {
  return (
    <span className={`vz-pill vz-pill--${tone}`}>
      {dot && <span className={`vz-dot ${dot === 'hollow' ? 'vz-dot--hollow' : ''}`} />}
      {children}
    </span>
  );
}
