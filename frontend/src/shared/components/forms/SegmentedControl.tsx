import { useRef, type KeyboardEvent } from 'react';
import type { SelectOption } from './Field';

export interface SegmentedControlProps {
  /** las opciones, igual que en `Select`: cadena suelta o par valor/etiqueta */
  options: SelectOption[];
  /** el `value` de la opción elegida */
  value: string;
  onChange: (value: string) => void;
  /**
   * Nombre del grupo. Hace falta porque un grupo de botones no se enlaza con
   * un `<label htmlFor>`: se pasa `aria-label` o el id de la etiqueta.
   */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** el error y lo obligatorio del campo (`controlA11y`): van al grupo */
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
  disabled?: boolean;
}

/**
 * Elegir una entre pocas opciones, todas a la vista: el "Rol procesal del
 * cliente" del alta de causa (Defensa / Querellante particular).
 *
 * Es un grupo de radios dibujado como botones pegados. Para más de cuatro o
 * cinco opciones, o textos largos, va un `Select`.
 *
 * Teclado de radio: el tabulador entra al grupo por la opción elegida (una
 * sola parada, no una por botón) y las flechas cambian la elección.
 */
export function SegmentedControl({
  options, value, onChange, disabled, ...labelling
}: SegmentedControlProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));

  const selected = items.findIndex((item) => item.value === value);
  // Sin nada elegido, la parada del tabulador es la primera opción.
  const tabStop = selected >= 0 ? selected : 0;

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined) return;

    event.preventDefault();
    const next = (index + step + items.length) % items.length;
    onChange(items[next].value);
    buttons.current[next]?.focus();
  }

  return (
    <div className="vz-segmented" role="radiogroup" {...labelling}>
      {items.map((item, i) => {
        const checked = i === selected;

        return (
          <button
            key={item.value}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={i === tabStop ? 0 : -1}
            className={`vz-segmented__option ${checked ? 'is-on' : ''}`}
            disabled={disabled}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
