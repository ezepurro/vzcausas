import { useId, useState, type KeyboardEvent } from 'react';

export interface SearchSelectOption {
  value: string;
  label: string;
}

export interface SearchSelectProps {
  id?: string;
  /** El `value` de la opción elegida, o `''` si no hay ninguna. */
  value: string;
  /**
   * El rótulo de la elegida. Hace falta cuando la elegida puede no estar entre
   * `options` (las opciones cambian con cada búsqueda). Sin esto se busca ahí.
   */
  selectedLabel?: string;
  options: SearchSelectOption[];
  onSelect: (value: string) => void;
  /**
   * Avisa lo que se escribe, para que el dueño busque en el servidor. Al
   * cerrarse la lista avisa `''`. Las opciones igual se filtran acá con lo
   * escrito, así la lista responde al instante mientras llega la búsqueda.
   */
  onSearch?: (text: string) => void;
  placeholder?: string;
  /** Lo que dice la lista cuando nada coincide. */
  emptyText?: string;
  /** Hay una búsqueda en curso: sin opciones a la vista, la lista dice "Buscando…". */
  loading?: boolean;
  /** Un renglón al pie de la lista, por ejemplo "Se muestran 100 de 240 clientes…". */
  note?: string | null;
  disabled?: boolean;
  /**
   * Con este texto, el campo ofrece una "×" para sacar la elección (el texto
   * es su nombre accesible). Sin él no se puede vaciar.
   */
  clearLabel?: string;
  maxLength?: number;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
}

/** Sin acentos, sin mayúsculas y sin los puntos de un DNI, para comparar. */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** ¿El rótulo tiene todas las palabras escritas? "gomez ariel" encuentra "GÓMEZ, Ariel". */
function matches(label: string, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  const text = normalize(label);
  const haystack = `${text} ${text.replace(/\./g, '')}`;
  return words.every((word) => haystack.includes(word));
}

/**
 * Un select en el que se puede escribir para filtrar.
 *
 * Al abrirlo muestra todas las opciones, como un select; al escribir, quedan
 * las que coinciden. Sólo se puede elegir una opción de la lista: lo escrito
 * no es un valor (para "elegir o escribir" está `Combobox`).
 *
 * Con `value` fijo en `''` sirve para "agregar": cada elección avisa por
 * `onSelect` y el campo vuelve a quedar vacío.
 */
export function SearchSelect({
  id, value, selectedLabel, options, onSelect, onSearch, placeholder, emptyText = 'Sin resultados.',
  loading = false, note, disabled, clearLabel, maxLength,
  'aria-label': ariaLabel, 'aria-invalid': ariaInvalid, 'aria-describedby': ariaDescribedBy,
  'aria-required': ariaRequired,
}: SearchSelectProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);

  const optionId = (i: number) => `${listId}-option-${i}`;

  const visible = options.filter((option) => matches(option.label, query));
  /* Las opciones cambian con cada tecla; una marca que quedó fuera de la
     lista nueva no apunta a nada. */
  const activeIndex = active < visible.length ? active : -1;

  const currentLabel = value === ''
    ? ''
    : selectedLabel ?? options.find((option) => option.value === value)?.label ?? '';

  function openList() {
    if (disabled || open) return;
    setOpen(true);
  }

  function closeList() {
    if (!open && query === '') return;
    setOpen(false);
    setActive(-1);
    setQuery('');
    onSearch?.('');
  }

  function choose(option: SearchSelectOption) {
    onSelect(option.value);
    closeList();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      if (visible.length === 0) return;

      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((activeIndex + step + visible.length) % visible.length);
      return;
    }

    if (event.key === 'Enter' && open) {
      /* Con la lista abierta, Enter elige y nunca envía el formulario. Si
         quedó una sola opción, es esa aunque no se haya bajado con la flecha. */
      event.preventDefault();
      const target = activeIndex >= 0 ? visible[activeIndex] : visible.length === 1 ? visible[0] : null;
      if (target) choose(target);
      return;
    }

    if (event.key === 'Escape' && open) {
      /* Sólo cierra la lista: sin esto, el Escape también cierra el modal
         que tenga el campo adentro. */
      event.stopPropagation();
      closeList();
    }
  }

  const expanded = open && !disabled;
  const showClear = Boolean(clearLabel) && value !== '' && !disabled;

  return (
    <div className={`vz-combobox vz-combobox--select ${showClear ? 'has-clear' : ''}`}>
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        aria-required={ariaRequired}
        className="vz-input"
        /* Con la lista abierta el campo queda libre para escribir, y lo
           elegido se sigue leyendo de fondo. */
        placeholder={open && currentLabel !== '' ? currentLabel : placeholder}
        maxLength={maxLength}
        value={open ? query : currentLabel}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(-1);
          setOpen(true);
          onSearch?.(e.target.value);
        }}
        onFocus={openList}
        onClick={openList}
        onBlur={closeList}
        onKeyDown={handleKeyDown}
      />

      {showClear && (
        <button
          type="button"
          className="vz-combobox__clear"
          aria-label={clearLabel}
          /* mouseDown y no click: no le saca el foco al campo. */
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onSelect('');
            closeList();
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}

      {expanded && (
        <div id={listId} role="listbox" className="vz-combobox__list">
          {visible.map((option, i) => (
            <div
              key={option.value}
              id={optionId(i)}
              role="option"
              aria-selected={option.value === value}
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
              </div>
              {option.value === value && (
                <span className="vz-combobox__check" aria-hidden="true">✓</span>
              )}
            </div>
          ))}

          {visible.length === 0 && (
            <div className="vz-combobox__empty">{loading ? 'Buscando…' : emptyText}</div>
          )}

          {note && <div className="vz-combobox__note">{note}</div>}
        </div>
      )}
    </div>
  );
}
