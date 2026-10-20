import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

export type SkeletonShape = 'line' | 'circle' | 'pill' | 'block';

export interface SkeletonProps {
  /** ancho: número en px o cualquier medida CSS ('60%'). Por defecto, todo el ancho */
  width?: number | string;
  /** alto: número en px o cualquier medida CSS. Cada forma trae el suyo */
  height?: number | string;
  /** 'line' renglón de texto, 'circle' avatar, 'pill' chip, 'block' recuadro */
  shape?: SkeletonShape;
  /** sobre un fondo oscuro: la banda de los tableros, la cabecera de una tabla */
  onDark?: boolean;
}

/**
 * Un bloque gris que ocupa el lugar de un dato que todavía no llegó.
 * No anuncia nada por sí solo: va siempre adentro de un `LoadingState`, que es
 * el que le avisa al lector de pantalla y espera antes de mostrarse.
 */
export function Skeleton({ width, height, shape = 'line', onDark = false }: SkeletonProps) {
  const style: CSSProperties = { width, height };
  return <span className={`vz-skel vz-skel--${shape}${onDark ? ' vz-skel--on-dark' : ''}`} style={style} />;
}

export interface LoadingStateProps {
  /** lo que oye un lector de pantalla: 'Cargando causas…' */
  label: string;
  /** el esqueleto de la pantalla, armado con `Skeleton` */
  children: ReactNode;
  /**
   * Cuánto esperar antes de dibujar el esqueleto. Una respuesta que llega
   * antes no lo muestra nunca: si no, aparece y desaparece en un parpadeo.
   */
  delayMs?: number;
  className?: string;
}

/**
 * Envoltorio de todo esqueleto. Mientras espera, el esqueleto ya ocupa su
 * lugar pero invisible, así la página no salta cuando aparece.
 *
 * Para la tecnología asistiva es un `status` con el texto de carga: el
 * esqueleto en sí queda oculto (`aria-hidden`), porque una pila de bloques
 * grises no le dice nada a quien no los ve.
 */
export function LoadingState({ label, children, delayMs = 200, className }: LoadingStateProps) {
  const [shown, setShown] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) return;
    const timer = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    <div
      role="status"
      aria-busy="true"
      className={['vz-loading', shown ? '' : 'is-waiting', className ?? ''].filter(Boolean).join(' ')}
    >
      <span className="vz-sr-only">{label}</span>
      <div className="vz-loading__skeleton" aria-hidden="true">{children}</div>
    </div>
  );
}
