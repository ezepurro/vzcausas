import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variante = 'primary' | 'secondary' | 'danger' | 'ghost';
type Tamano = 'lg' | 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamano?: Tamano;
  /** ocupa todo el ancho disponible */
  bloque?: boolean;
  /** icono a la izquierda del texto */
  icono?: ReactNode;
}

/** Botón presentacional. No decide nada: el onClick lo pone la pantalla. */
export function Button({
  variante = 'primary',
  tamano = 'lg',
  bloque = false,
  icono,
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  const clases = [
    'vz-btn',
    `vz-btn--${variante}`,
    tamano !== 'lg' ? `vz-btn--${tamano}` : '',
    bloque ? 'vz-btn--block' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type={type} className={clases} {...rest}>
      {icono}
      {children}
    </button>
  );
}
