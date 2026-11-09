import { useEffect, useId, useState, type MouseEvent, type ReactNode } from 'react';
import { useHoverIntent } from '@/shared/hooks/useHoverIntent';
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
  /**
   * El usuario apunta a un ítem (el mouse quedó encima un momento o tomó el
   * foco): la app puede adelantar lo que esa sección va a necesitar.
   */
  onIntent?: (id: string) => void;
  /** logo, o lo que vaya arriba del rail */
  brand: ReactNode;
  /** Acción destacada bajo el logo: normalmente 'Nueva causa'. */
  railAction?: ReactNode;
  /** pie del rail: usar <RailUser> */
  railFooter?: ReactNode;
  /** contenido de la barra superior clara: buscador, avisos, notificaciones */
  topBar?: ReactNode;
  /**
   * Marca de la barra superior: normalmente el mismo logo del rail, como
   * enlace al inicio. Se ve sólo debajo de 1024px, donde el rail está
   * guardado y sin ella la barra no dice en qué aplicación se está.
   */
  topBarBrand?: ReactNode;
  children: ReactNode;
}

/** Desde acá el rail ocupa su columna. Coincide con el corte de `shell.css`. */
const WIDE_SCREEN = '(min-width: 1024px)';

/**
 * Estructura de la aplicación: rail a la izquierda, barra superior y página.
 * No rutea: recibe `active` y avisa con onNavigate.
 *
 * Debajo de 1024px el rail no ocupa lugar: queda fuera de la pantalla y se
 * abre encima de la página con el botón de la barra superior. Acá vive sólo
 * el estado —abierto o cerrado—; que el rail esté fijo o deslizable lo decide
 * `shell.css`, así que en una pantalla ancha este estado no cambia nada.
 *
 * Abierto, la página de abajo no scrollea. Al agrandar la ventana por encima
 * del corte el menú se cierra solo: si no, quedaba abierto "de fondo" y
 * reaparecía abierto al volver a achicarla.
 */
export function AppShell({
  groups, active, onNavigate, onIntent, brand, railAction, railFooter, topBar, topBarBrand, children,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Pasar el mouse por el rail no cuenta: sólo quedarse sobre un ítem (`useHoverIntent`).
  const intent = useHoverIntent(onIntent);
  const railId = useId();

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  // El setState va en el aviso del navegador, no en el cuerpo del efecto.
  // jsdom no implementa `matchMedia`: ahí no hay corte que cruzar.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const wide = window.matchMedia(WIDE_SCREEN);
    const onChange = () => { if (wide.matches) setMenuOpen(false); };
    wide.addEventListener('change', onChange);
    return () => wide.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const { style } = document.documentElement;
    const previous = style.overflow;
    style.overflow = 'hidden';
    return () => { style.overflow = previous; };
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
                  {...intent(it.id)}
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
          {topBarBrand && <div className="vz-topbar__brand">{topBarBrand}</div>}
          {topBar}
        </header>
        <main className="vz-page">{children}</main>
      </div>
    </div>
  );
}
