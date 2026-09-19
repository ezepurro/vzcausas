import type { ReactNode } from 'react';

export interface PanelProps {
  title?: string;
  sub?: string;
  /** controles a la derecha de la cabecera: filtros, botón de alta */
  actions?: ReactNode;
  /** nota al pie del panel: reglas de negocio, aclaraciones */
  footer?: ReactNode;
  children: ReactNode;
}

/** Contenedor con cabecera y pie. Envuelve tablas, formularios y listas. */
export function Panel({ title, sub, actions, footer, children }: PanelProps) {
  return (
    <section className="vz-panel">
      {(title || actions) && (
        <header className="vz-panel__head">
          {title && (
            <div>
              <div className="vz-panel__title">{title}</div>
              {sub && <div className="vz-panel__sub">{sub}</div>}
            </div>
          )}
          {actions && <div className="vz-filters">{actions}</div>}
        </header>
      )}
      {children}
      {footer && <footer className="vz-panel__foot">{footer}</footer>}
    </section>
  );
}
