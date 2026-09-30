import { initials as deriveInitials } from '@/shared/lib/initials';

export interface AvatarProps {
  /** nombre de la persona; de acá salen las iniciales si no vienen */
  name: string;
  /** iniciales ya armadas, cuando la pantalla las quiere distintas */
  initials?: string;
}

/**
 * Círculo con las iniciales de una persona, para la primera columna de una
 * tabla (usuarios, clientes). El del rail es otro: vive sobre fondo oscuro y
 * lo dibuja `RailUser`.
 *
 * Es decorativo: el nombre ya está escrito al lado, así que el lector de
 * pantalla lo saltea en vez de deletrear "F G".
 */
export function Avatar({ name, initials }: AvatarProps) {
  return (
    <span className="vz-avatar" aria-hidden="true">
      {initials ?? deriveInitials(name)}
    </span>
  );
}
