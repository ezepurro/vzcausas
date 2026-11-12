import { splitErrorMessage } from '../../lib/splitErrorMessage';
import { Icon } from '../ui/Icon';

export interface FieldErrorProps {
  /** el mensaje; puede traer varias oraciones juntas, como las que une el backend */
  message: string;
  /** para el `aria-describedby` del control */
  id?: string;
}

/**
 * Error de un campo: el ícono de alerta y cada oración en su renglón.
 *
 * El backend junta en un solo texto todos los mensajes que fallan sobre un
 * mismo campo; leídos de corrido quedaban como un párrafo. Un solo ícono por
 * campo, y no uno por oración, porque hay mensajes que son un error y su
 * aclaración ("Los años son obligatorios. Si el plazo es menor a un año,
 * poné 0."): con dos íconos parecerían dos errores.
 *
 * El texto es un solo nodo con saltos de línea (`white-space: pre-line`):
 * `getByText` lo sigue encontrando entero, porque normaliza los espacios.
 */
export function FieldError({ message, id }: FieldErrorProps) {
  const lines = splitErrorMessage(message);
  if (lines.length === 0) return null;

  return (
    <div id={id} className="vz-error vz-error--field">
      <Icon name="alert" size={13} className="vz-error__icon" />
      {lines.join('\n')}
    </div>
  );
}
