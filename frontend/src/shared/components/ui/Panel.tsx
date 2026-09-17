import type { ReactNode } from 'react';

export interface PanelProps {
  titulo?: string;
  sub?: string;
  /** controles a la derecha de la cabecera: filtros, botón de alta */
  acciones?: ReactNode;
  /** nota al pie del panel: reglas de negocio, aclaraciones */
  pie?: ReactNode;
  children: ReactNode;
}

/** Contenedor con cabecera y pie. Envuelve tablas, formularios y listas. */
export function Panel({ titulo, sub, acciones, pie, children }: PanelProps) {
  return (
    <section className="vz-panel">
      {(titulo || acciones) && (
        <header className="vz-panel__head">
          {titulo && (
            <div>
              <div className="vz-panel__title">{titulo}</div>
              {sub && <div className="vz-panel__sub">{sub}</div>}
            </div>
          )}
          {acciones && <div className="vz-filters">{acciones}</div>}
        </header>
      )}
      {children}
      {pie && <footer className="vz-panel__foot">{pie}</footer>}
    </section>
  );
}
