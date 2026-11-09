import { useId, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

export interface CollapsibleFiltersProps {
  /**
   * Cuántos filtros están aplicados: el botón lo muestra ("Filtros · 2"), así
   * con el panel cerrado se sabe que la lista está filtrada.
   */
  active?: number;
  /** Los desplegables y botones de filtro: lo que va plegado en el teléfono. */
  children: ReactNode;
}

/**
 * Los filtros de un listado, plegados en el teléfono.
 *
 * Va en `Panel actions`, al lado del buscador. En una pantalla ancha no cambia
 * nada: el botón no se ve y los filtros quedan en la fila de la cabecera, como
 * si no estuvieran envueltos (`display: contents`). Debajo de 721px los filtros
 * se esconden detrás de un botón "Filtros" que los despliega; el buscador
 * sigue a la vista. Apilados de a uno, cuatro filtros tapaban la lista.
 *
 * Los filtros siempre están en el DOM —plegados sólo no se dibujan—, así que
 * lo que elige el usuario no se pierde al cerrar.
 */
export function CollapsibleFilters({ active = 0, children }: CollapsibleFiltersProps) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  return (
    <>
      <button
        type="button"
        className={`vz-btn vz-btn--secondary vz-btn--md vz-filters-toggle ${active > 0 ? 'is-pressed' : ''}`}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="filter" size={15} />
        Filtros
        {active > 0 && <span className="vz-filters-toggle__count">{active}</span>}
      </button>
      <div id={bodyId} className={`vz-filters-body ${open ? 'is-open' : ''}`}>
        {children}
      </div>
    </>
  );
}
