import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react';

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

/**
 * Lo que puede recibir el foco con el tabulador.
 *
 * `[tabindex="-1"]` queda afuera a propósito: es lo que marca a la tarjeta,
 * que se enfoca al abrir pero no es una parada del ciclo.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Las paradas del tabulador adentro del modal, en orden de documento.
 *
 * No hay filtro de visibilidad —`offsetParent`, `getBoundingClientRect`— a
 * propósito: no haría nada acá y rompería los tests. `FormModal` no esconde
 * campos con CSS, los deja de renderizar (`when`), así que lo que está en el
 * DOM se ve. Si algún día aparece un campo oculto con estilos, este es el
 * lugar donde hay que filtrarlo.
 */
function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
}

/** Caparazón de modal: fondo, tarjeta, cabecera, cuerpo scrolleable y pie. */
export function Modal({ title, sub, width = 'md', footer, onClose, children }: ModalProps) {
  const titleId = useId();
  const card = useRef<HTMLDivElement>(null);

  /* Dónde estaba el foco antes de abrir, para devolvérselo al cerrar. Se
     guarda en un ref y no en estado: cambiarlo no tiene que redibujar nada. */
  const opener = useRef<Element | null>(null);

  /**
   * El teclado del modal: cerrar con Escape y no dejar salir al tabulador.
   *
   * Va en `document` y no en un `onKeyDown` del backdrop por dos razones. Un
   * div no recibe teclas si no tiene el foco, y el foco casi siempre está en
   * un campo de adentro; y si el foco igual se escapó —un click en el fondo,
   * un `autoFocus` de otro lado—, desde `document` se lo puede traer de vuelta.
   *
   * El Escape estuvo documentado en este archivo mucho antes de existir: si
   * volvés a sacarlo, sacá también la línea del `ModalProps`.
   */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || card.current === null) return;

      const stops = focusableWithin(card.current);

      /* Un modal sin nada que enfocar —una confirmación sin botones— igual
         retiene el tabulador: el foco se queda en la tarjeta. */
      if (stops.length === 0) {
        event.preventDefault();
        card.current.focus();
        return;
      }

      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;

      // El foco quedó afuera: se vuelve a entrar por la punta que toca.
      if (!card.current.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      // Los dos bordes del ciclo. En el medio, el navegador se arregla solo.
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  /* Al abrir, el foco entra al modal; al cerrar, vuelve a donde estaba. Sin
     esto, quien navega con teclado sigue parado atrás del fondo. */
  useEffect(() => {
    opener.current = document.activeElement;
    card.current?.focus();

    return () => {
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, []);

  /**
   * Cerrar al hacer click en el fondo, pero sólo si el gesto **empezó** ahí.
   *
   * Si no, seleccionar texto adentro del formulario y soltar el botón afuera
   * cuenta como click en el fondo y cierra el modal con todo lo escrito.
   */
  const pressedBackdrop = useRef(false);

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    pressedBackdrop.current = event.target === event.currentTarget;
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && pressedBackdrop.current) onClose();
    pressedBackdrop.current = false;
  }

  return (
    <div
      className="vz-modal-backdrop"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      {/* El diálogo es la tarjeta, no el fondo: `aria-labelledby` lo nombra
          con su propio título, y `tabIndex` existe sólo para poder enfocarlo
          al abrir. */}
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`vz-modal ${width !== 'md' ? `vz-modal--${width}` : ''}`}
      >
        <header className="vz-modal__head">
          <h2 className="vz-modal__title" id={titleId}>{title}</h2>
          {sub && <p className="vz-modal__sub">{sub}</p>}
        </header>

        <div className="vz-modal__body">{children}</div>

        {footer && <footer className="vz-modal__foot">{footer}</footer>}
      </div>
    </div>
  );
}
