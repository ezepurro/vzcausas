import { Icon } from './Icon';

export interface RailUserProps {
  name: string;
  profile: string;
  /** iniciales para el avatar; si no viene se derivan del nombre */
  initials?: string;
  onChangePassword: () => void;
  onLogout: () => void;
}

const deriveInitials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

/** Pie del rail: quién está adentro, cambiar contraseña y cerrar sesión. */
export function RailUser({
  name, profile, initials, onChangePassword, onLogout,
}: RailUserProps) {
  return (
    <div className="vz-rail__user">
      <span className="vz-rail__avatar" title={name}>{initials ?? deriveInitials(name)}</span>
      <div className="vz-rail__ident">
        <div className="vz-rail__ident-name">{name}</div>
        <div className="vz-rail__ident-profile">{profile}</div>
      </div>
      <button
        type="button"
        className="vz-rail__iconbtn"
        title="Cambiar contraseña"
        aria-label="Cambiar contraseña"
        onClick={onChangePassword}
      >
        <Icon name="password" />
      </button>
      <button
        type="button"
        className="vz-rail__iconbtn"
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        onClick={onLogout}
      >
        <Icon name="logout" />
      </button>
    </div>
  );
}
