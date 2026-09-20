import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
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
