import type { ReactNode } from 'react';

export interface ModalProps {
  title: string;
  sub?: string;
  width?: 'sm' | 'md' | 'lg';
  /** botonera del pie; normalmente Cancelar + la acción */
  footer?: ReactNode;
  /** click en el fondo o Escape */
  onClose: () => void;
  children: ReactNode;
}

/** Caparazón de modal: fondo, tarjeta, cabecera, cuerpo scrolleable y pie. */
export function Modal({ title, sub, width = 'md', footer, onClose, children }: ModalProps) {
  return (
    <div className="vz-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className={`vz-modal ${width !== 'md' ? `vz-modal--${width}` : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="vz-modal__head">
          <h2 className="vz-modal__title">{title}</h2>
          {sub && <p className="vz-modal__sub">{sub}</p>}
        </header>

        <div className="vz-modal__body">{children}</div>

        {footer && <footer className="vz-modal__foot">{footer}</footer>}
      </div>
    </div>
  );
}
