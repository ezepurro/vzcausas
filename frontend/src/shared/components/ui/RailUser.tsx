import { Icon } from './Icon';

export interface RailUserProps {
  nombre: string;
  perfil: string;
  /** iniciales para el avatar; si no viene se derivan del nombre */
  iniciales?: string;
  onCambiarContrasena: () => void;
  onCerrarSesion: () => void;
}

const derivar = (nombre: string) =>
  nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

/** Pie del rail: quién está adentro, cambiar contraseña y cerrar sesión. */
export function RailUser({
  nombre, perfil, iniciales, onCambiarContrasena, onCerrarSesion,
}: RailUserProps) {
  return (
    <div className="vz-rail__user">
      <span className="vz-rail__avatar" title={nombre}>{iniciales ?? derivar(nombre)}</span>
      <div className="vz-rail__ident">
        <div className="vz-rail__ident-nombre">{nombre}</div>
        <div className="vz-rail__ident-perfil">{perfil}</div>
      </div>
      <button
        type="button"
        className="vz-rail__iconbtn"
        title="Cambiar contraseña"
        aria-label="Cambiar contraseña"
        onClick={onCambiarContrasena}
      >
        <Icon nombre="contrasena" />
      </button>
      <button
        type="button"
        className="vz-rail__iconbtn"
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        onClick={onCerrarSesion}
      >
        <Icon nombre="salir" />
      </button>
    </div>
  );
}
