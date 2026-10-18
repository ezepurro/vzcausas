import { useState, type InputHTMLAttributes } from 'react';
import { Icon } from '../ui/Icon';
import { TextInput } from './Field';

export type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  mono?: boolean;
};

/**
 * Campo de contraseña con un ojo para mostrarla u ocultarla. Recibe lo mismo
 * que `TextInput`, salvo `type`, que lo maneja el ojo.
 *
 * Mostrar u ocultar no es un dato del formulario, así que el estado vive acá
 * adentro y la pantalla no se entera. Arranca oculta.
 *
 * El nombre del botón ("Mostrar contraseña" / "Ocultar contraseña") va como
 * texto oculto y no como `aria-label`: así no se confunde con la etiqueta
 * "Contraseña" del campo cuando un test lo busca por su etiqueta.
 */
export function PasswordInput({ disabled, ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const label = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';

  return (
    <div className="vz-password">
      <TextInput type={visible ? 'text' : 'password'} disabled={disabled} {...rest} />
      <button
        type="button"
        className="vz-password__toggle"
        title={label}
        disabled={disabled}
        onClick={() => setVisible((v) => !v)}
      >
        <Icon name={visible ? 'eye' : 'eyeOff'} size={18} />
        <span className="vz-sr-only">{label}</span>
      </button>
    </div>
  );
}
