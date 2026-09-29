import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export interface RailItem {
  id: string;
  label: string;
  icon: IconName;
}

export interface RailGroup {
  /** título del grupo: 'Trabajo diario', 'Administración' */
  label: string;
  items: RailItem[];
}

export interface AppShellProps {
  groups: RailGroup[];
  active: string;
  onNavigate: (id: string) => void;
  /** logo, o lo que vaya arriba del rail */
  brand: ReactNode;
  /**
   * Acción destacada bajo el logo: normalmente 'Nueva causa'.
   * El texto del botón va envuelto en <span className="vz-rail__action-label">
   * para que se esconda cuando el rail colapsa a 64px.
   */
  railAction?: ReactNode;
  /** pie del rail: usar <RailUser> */
  railFooter?: ReactNode;
  /** contenido de la barra superior clara: buscador, avisos, notificaciones */
  topBar?: ReactNode;
  children: ReactNode;
}

/**
 * Estructura de la aplicación: rail a la izquierda, barra superior y página.
 * No rutea: recibe `active` y avisa con onNavigate.
 */
export function AppShell({
  groups, active, onNavigate, brand, railAction, railFooter, topBar, children,
}: AppShellProps) {
  return (
    <div className="vz-app">
      <nav className="vz-rail" aria-label="Navegación principal">
        {brand}
        {railAction && <div className="vz-rail__action">{railAction}</div>}

        <div className="vz-rail__nav">
          {groups.map((g) => (
            <div key={g.label} className="vz-rail__section">
              <div className="vz-rail__group">{g.label}</div>
              {g.items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  aria-current={it.id === active ? 'page' : undefined}
                  className={`vz-rail__item ${it.id === active ? 'is-on' : ''}`}
                  onClick={() => onNavigate(it.id)}
                  title={it.label}
                >
                  <Icon name={it.icon} />
                  <span className="vz-rail__item-label">{it.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {railFooter}
      </nav>

      <div className="vz-main">
        {topBar && <header className="vz-topbar">{topBar}</header>}
        <main className="vz-page">{children}</main>
      </div>
    </div>
  );
}
