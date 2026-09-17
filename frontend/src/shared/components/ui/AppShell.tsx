import type { ReactNode } from 'react';
import { Icon, type NombreIcono } from './Icon';

export interface ItemRail {
  id: string;
  label: string;
  icono: NombreIcono;
}

export interface GrupoRail {
  /** título del grupo: 'Trabajo diario', 'Administración' */
  label: string;
  items: ItemRail[];
}

export interface AppShellProps {
  grupos: GrupoRail[];
  activo: string;
  onNavegar: (id: string) => void;
  /** logo, o lo que vaya arriba del rail */
  marca: ReactNode;
  /**
   * Acción destacada bajo el logo: normalmente 'Nueva causa'.
   * El texto del botón va envuelto en <span className="vz-rail__accion-label">
   * para que se esconda cuando el rail colapsa a 64px.
   */
  accionRail?: ReactNode;
  /** pie del rail: usar <RailUser> */
  pieRail?: ReactNode;
  /** contenido de la barra superior clara: buscador, avisos, notificaciones */
  barraSuperior?: ReactNode;
  children: ReactNode;
}

/**
 * Estructura de la aplicación: rail a la izquierda, barra superior y página.
 * No rutea: recibe `activo` y avisa con onNavegar.
 */
export function AppShell({
  grupos, activo, onNavegar, marca, accionRail, pieRail, barraSuperior, children,
}: AppShellProps) {
  return (
    <div className="vz-app">
      <nav className="vz-rail" aria-label="Navegación principal">
        {marca}
        {accionRail && <div className="vz-rail__accion">{accionRail}</div>}

        <div className="vz-rail__nav">
          {grupos.map((g) => (
            <div key={g.label} className="vz-rail__seccion">
              <div className="vz-rail__group">{g.label}</div>
              {g.items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  aria-current={it.id === activo ? 'page' : undefined}
                  className={`vz-rail__item ${it.id === activo ? 'is-on' : ''}`}
                  onClick={() => onNavegar(it.id)}
                  title={it.label}
                >
                  <Icon nombre={it.icono} />
                  <span className="vz-rail__item-label">{it.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {pieRail}
      </nav>

      <div className="vz-main">
        {barraSuperior && <header className="vz-topbar">{barraSuperior}</header>}
        <main className="vz-page">{children}</main>
      </div>
    </div>
  );
}
