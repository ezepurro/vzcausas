import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { useHoverIntent } from '@/shared/hooks/useHoverIntent';
import { Icon, type IconName } from './Icon';

export interface RailItem {
  /** la ruta de la sección: es el `href` del enlace y lo que recibe `onNavigate` */
  id: string;
  label: string;
  icon: IconName;
  /** el ítem no se dibuja (la sección existe pero todavía no se muestra) */
  hidden?: boolean;
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
 * Abierto, la página de abajo no scrollea ni se alcanza con el teclado: queda
 * inerte, el foco entra al menú y al cerrarlo vuelve al botón que lo abrió
 * (H-07). Al agrandar la ventana por encima del corte el menú se cierra solo:
 * si no, quedaba abierto "de fondo" y reaparecía abierto al volver a
 * achicarla.
 *
 * Los ítems son enlaces de verdad (`<a href>`): se pueden abrir en otra
 * pestaña o copiar, y un lector de pantalla los anuncia como enlaces. Un clic
 * común no recarga la página: avisa con `onNavigate`, como siempre.
 */
export function AppShell({
  groups, active, onNavigate, onIntent, brand, railAction, railFooter, topBar, topBarBrand, children,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Pasar el mouse por el rail no cuenta: sólo quedarse sobre un ítem (`useHoverIntent`).
  const intent = useHoverIntent(onIntent);
  const railId = useId();
  const closeButton = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const main = useRef<HTMLElement>(null);

  /* Al abrir, el foco entra al menú; al cerrar, vuelve al botón que lo abrió.
     Sin esto quedaba en un botón de la página tapada. La primera vez no hay
     nada que devolver: el menú arranca cerrado. */
  const wasOpen = useRef(false);
  useEffect(() => {
    if (menuOpen) closeButton.current?.focus();
    else if (wasOpen.current) menuButton.current?.focus();
    wasOpen.current = menuOpen;
  }, [menuOpen]);

  /* Clic común: navega la app, sin recargar. Con Ctrl, Cmd, Shift o el botón
     del medio se deja hacer al navegador: abrir en otra pestaña o ventana. */
  function handleItemClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(id);
  }

  function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    main.current?.focus();
  }

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
      {/* Lo primero que encuentra el tabulador: saltea el rail entero. Sólo
          se ve cuando tiene el foco. */}
      <a className="vz-skip" href={`#${railId}-main`} onClick={skipToContent}>
        Saltar al contenido
      </a>

      <div className="vz-scrim" aria-hidden="true" onClick={() => setMenuOpen(false)} />

      <nav id={railId} className="vz-rail" aria-label="Navegación principal" onClick={handleRailClick}>
        <button ref={closeButton} type="button" className="vz-rail__close" aria-label="Cerrar menú">
          <Icon name="close" size={18} />
        </button>

        {brand}
        {railAction && <div className="vz-rail__action">{railAction}</div>}

        <div className="vz-rail__nav">
          {groups.map((g) => (
            <div key={g.label} className="vz-rail__section">
              <div className="vz-rail__group">{g.label}</div>
              {g.items.map((it) => (
                <a
                  key={it.id}
                  href={it.id}
                  aria-current={it.id === active ? 'page' : undefined}
                  className={`vz-rail__item ${it.id === active ? 'is-on' : ''}`}
                  onClick={(event) => handleItemClick(event, it.id)}
                  {...intent(it.id)}
                  title={it.label}
                >
                  <Icon name={it.icon} />
                  <span className="vz-rail__item-label">{it.label}</span>
                </a>
              ))}
            </div>
          ))}
        </div>

        {railFooter}
      </nav>

      {/* Con el menú abierto la página queda inerte: ni el tabulador ni un
          lector de pantalla llegan a lo que está detrás del velo. */}
      <div className="vz-main" inert={menuOpen}>
        <header className="vz-topbar">
          <button
            ref={menuButton}
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
        <main ref={main} id={`${railId}-main`} tabIndex={-1} className="vz-page">{children}</main>
      </div>
    </div>
  );
}
