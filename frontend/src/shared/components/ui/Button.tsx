import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * `ghost-danger` es el destructivo de baja intensidad: se ve igual de callado
 * que `ghost` hasta que el cursor lo apunta, y recién ahí se tiñe. Es para las
 * acciones destructivas que se repiten en cada fila de una tabla, donde un
 * `danger` con borde pintaría la pantalla de rojo.
 */
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'ghost-danger';
type Size = 'lg' | 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** ocupa todo el ancho disponible */
  block?: boolean;
  /** icono a la izquierda del texto */
  icon?: ReactNode;
}

/** Botón presentacional. No decide nada: el onClick lo pone la pantalla. */
export function Button({
  variant = 'primary',
  size = 'lg',
  block = false,
  icon,
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    'vz-btn',
    `vz-btn--${variant}`,
    size !== 'lg' ? `vz-btn--${size}` : '',
    block ? 'vz-btn--block' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {icon}
      {children}
    </button>
  );
}
