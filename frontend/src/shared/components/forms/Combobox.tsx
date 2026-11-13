import { useId, useState, type KeyboardEvent } from 'react';

export interface ComboboxOption {
  /** el código que viaja, igual que en `SelectOption` */
  value: string;
  /** lo que se lee, y lo que queda escrito en el campo al elegirla */
  label: string;
  /** segundo renglón, más apagado: "30 días hábiles" */
  description?: string;
}

export interface ComboboxProps {
  /** para enlazarlo con la etiqueta de `Field` (`htmlFor`) */
  id?: string;
  /** lo que está escrito en el campo */
  value: string;
  /** cada tecla: la pantalla guarda el texto y decide qué opciones mostrar */
  onChange: (text: string) => void;
  /** eligieron una opción de la lista, con el mouse o con Enter */
  onSelect: (option: ComboboxOption) => void;
  /** las opciones a mostrar, ya filtradas por la pantalla */
  options: ComboboxOption[];
  placeholder?: string;
  /** qué decir cuando no hay ninguna opción para mostrar */
  emptyText?: string;
  disabled?: boolean;
  mono?: boolean;
  /** tope de caracteres de lo que se escribe (el atributo `maxlength`) */
  maxLength?: number;
  /** el error, la nota y lo obligatorio del campo (`controlA11y`) */
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
}

/**
 * Campo de texto con una lista para elegir, que también acepta lo que se
 * escriba aunque no esté en la lista.
 *
 * Es el "Estado procesal al que pasa la causa" del acto procesal: se elige
 * uno de la tabla del fuero o se escribe un estado a mano. Un `Select` no
 * sirve, porque no deja escribir, y un `TextInput` no muestra las opciones.
 *
 * Presentacional como el resto: **no filtra**. La pantalla recibe el texto
 * en `onChange`, decide qué opciones corresponden y las pasa en `options`.
 * Elegir una opción avisa con `onSelect`; escribir, con `onChange`. Si el
 * texto final coincide o no con una opción es una decisión de la pantalla.
 *
 * Teclado, como pide el patrón de combobox de ARIA: las flechas recorren la
 * lista (y la abren si está cerrada), Enter elige la marcada, Escape cierra.
 * El foco se queda siempre en el campo: la opción marcada se anuncia con
 * `aria-activedescendant`.
 */
export function Combobox({
  id, value, onChange, onSelect, options, placeholder, emptyText, disabled, mono, maxLength,
  'aria-invalid': ariaInvalid, 'aria-describedby': ariaDescribedBy, 'aria-required': ariaRequired,
}: ComboboxProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const optionId = (i: number) => `${listId}-option-${i}`;

  /* Las opciones cambian con cada tecla; una marca que quedó fuera de la
     lista nueva no apunta a nada. */
  const activeIndex = active < options.length ? active : -1;

  function openList() {
    if (disabled) return;
    setOpen(true);
  }

  function closeList() {
    setOpen(false);
    setActive(-1);
  }

  function choose(option: ComboboxOption) {
    onSelect(option);
    closeList();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      if (options.length === 0) return;

      const step = event.key === 'ArrowDown' ? 1 : -1;
      // Da la vuelta: después de la última viene la primera.
      setActive((activeIndex + step + options.length) % options.length);
      return;
    }

    if (event.key === 'Enter' && open && activeIndex >= 0) {
      // Sin esto, el Enter también enviaría el formulario que lo contiene.
      event.preventDefault();
      choose(options[activeIndex]);
      return;
    }

    if (event.key === 'Escape' && open) {
      // Frena el Escape acá para que un modal de atrás no se cierre también.
      event.stopPropagation();
      closeList();
    }
  }

  /* Una lista abierta sin nada adentro es un recuadro vacío flotando: sin
     opciones, sólo se abre si hay un texto que explique por qué. */
  const expanded = open && !disabled && (options.length > 0 || Boolean(emptyText));
  const selectedLabel = value.trim().toLowerCase();

  return (
    <div className="vz-combobox">
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        aria-required={ariaRequired}
        className={`vz-input ${mono ? 'vz-input--mono' : ''}`}
        placeholder={placeholder}
        maxLength={maxLength}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setActive(-1);
          openList();
        }}
        onFocus={openList}
        onClick={openList}
        onBlur={closeList}
        onKeyDown={handleKeyDown}
      />

      {expanded && (
        <div
          id={listId}
          role="listbox"
          className="vz-combobox__list"
          /* Un clic en la lista que no cae en una opción —la barra de scroll,
             el relleno— no le saca el foco al campo: si se lo saca, la lista
             se cierra y no se puede arrastrar el scroll. */
          onMouseDown={(e) => e.preventDefault()}
        >
          {options.map((option, i) => (
            <div
              key={option.value}
              id={optionId(i)}
              role="option"
              aria-selected={i === activeIndex}
              className={`vz-combobox__option ${i === activeIndex ? 'is-active' : ''}`}
              /* mouseDown y no click: el click llega después del blur del
                 campo, y para entonces la lista ya se cerró. */
              onMouseDown={(e) => {
                e.preventDefault();
                choose(option);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <div className="vz-combobox__text">
                <div className="vz-combobox__label">{option.label}</div>
                {option.description && (
                  <div className="vz-combobox__description">{option.description}</div>
                )}
              </div>
              {option.label.toLowerCase() === selectedLabel && (
                <span className="vz-combobox__check" aria-hidden="true">✓</span>
              )}
            </div>
          ))}

          {options.length === 0 && emptyText && (
            <div className="vz-combobox__empty">{emptyText}</div>
          )}
        </div>
      )}
    </div>
  );
}
