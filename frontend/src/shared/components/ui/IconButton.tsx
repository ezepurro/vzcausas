import type { ButtonHTMLAttributes } from 'react';
import { Icon, type NombreIcono } from './Icon';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  nombre: NombreIcono;
  /** obligatorio: el botón no tiene texto visible */
  etiqueta: string;
}

/** Botón cuadrado de 40px con un solo icono. */
export function IconButton({ nombre, etiqueta, className = '', ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`vz-iconbtn ${className}`}
      title={etiqueta}
      aria-label={etiqueta}
      {...rest}
    >
      <Icon nombre={nombre} tamano={18} />
    </button>
  );
}
