import { useEffect, useId, useState, type MouseEvent, type ReactNode } from 'react';
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
  /** Acción destacada bajo el logo: normalmente 'Nueva causa'. */
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
 *
 * Debajo de 1024px el rail no ocupa lugar: queda fuera de la pantalla y se
 * abre encima de la página con el botón de la barra superior. Acá vive sólo
 * el estado —abierto o cerrado—; que el rail esté fijo o deslizable lo decide
 * `shell.css`, así que en una pantalla ancha este estado no cambia nada.
 */
export function AppShell({
  groups, active, onNavigate, brand, railAction, railFooter, topBar, children,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const railId = useId();

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  /* Todo botón del rail lleva a otro lado o abre un modal —una sección,
     "Nueva causa", cambiar contraseña, cerrar sesión—, así que cualquiera de
     ellos cierra el menú. Va en el rail y no en cada botón porque la acción y
     el pie llegan armados desde afuera. */
  function handleRailClick(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('button, a')) setMenuOpen(false);
  }

  return (
    <div className={`vz-app ${menuOpen ? 'is-menu-open' : ''}`}>
      <div className="vz-scrim" aria-hidden="true" onClick={() => setMenuOpen(false)} />

      <nav id={railId} className="vz-rail" aria-label="Navegación principal" onClick={handleRailClick}>
        <button type="button" className="vz-rail__close" aria-label="Cerrar menú">
          <Icon name="close" size={18} />
        </button>

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
        <header className="vz-topbar">
          <button
            type="button"
            className="vz-iconbtn vz-topbar__menu"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            aria-controls={railId}
            onClick={() => setMenuOpen(true)}
          >
            <Icon name="menu" size={18} />
          </button>
          {topBar}
        </header>
        <main className="vz-page">{children}</main>
      </div>
    </div>
  );
}
