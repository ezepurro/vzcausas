import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  name: IconName;
  /** obligatorio: el botón no tiene texto visible */
  label: string;
}

/** Botón cuadrado de 40px con un solo icono. */
export function IconButton({ name, label, className = '', ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`vz-iconbtn ${className}`}
      title={label}
      aria-label={label}
      {...rest}
    >
      <Icon name={name} size={18} />
    </button>
  );
}
