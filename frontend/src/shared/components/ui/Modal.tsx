import type { ReactNode } from 'react';

export interface ModalProps {
  titulo: string;
  sub?: string;
  ancho?: 'sm' | 'md' | 'lg';
  /** botonera del pie; normalmente Cancelar + la acción */
  pie?: ReactNode;
  /** click en el fondo o Escape */
  onCerrar: () => void;
  children: ReactNode;
}

/** Caparazón de modal: fondo, tarjeta, cabecera, cuerpo scrolleable y pie. */
export function Modal({ titulo, sub, ancho = 'md', pie, onCerrar, children }: ModalProps) {
  return (
    <div className="vz-modal-backdrop" role="dialog" aria-modal="true" onClick={onCerrar}>
      <div
        className={`vz-modal ${ancho !== 'md' ? `vz-modal--${ancho}` : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="vz-modal__head">
          <h2 className="vz-modal__title">{titulo}</h2>
          {sub && <p className="vz-modal__sub">{sub}</p>}
        </header>

        <div className="vz-modal__body">{children}</div>

        {pie && <footer className="vz-modal__foot">{pie}</footer>}
      </div>
    </div>
  );
}
