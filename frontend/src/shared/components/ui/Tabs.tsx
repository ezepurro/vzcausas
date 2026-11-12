import { useRef, type KeyboardEvent } from 'react';

export interface TabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  /** nombre del grupo para un lector de pantalla: "Tableros", "Fuero" */
  'aria-label'?: string;
  /**
   * `id` del contenedor que cambia con la pestaña. Si la pantalla lo marca
   * con `role="tabpanel"`, el lector de pantalla puede saltar de la pestaña a
   * su contenido.
   */
  panelId?: string;
}

/**
 * Pestañas. No guardan estado: la pantalla es dueña de `active`.
 *
 * Teclado, como pide el patrón de pestañas y como ya hace `SegmentedControl`:
 * el tabulador entra a la pestaña elegida y sale del grupo; las flechas
 * izquierda y derecha —y Inicio y Fin— cambian de pestaña.
 */
export function Tabs<T extends string>({
  tabs, active, onChange, panelId, 'aria-label': ariaLabel,
}: TabsProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = tabs.findIndex((t) => t.id === active);
  // Sin pestaña elegida, el tabulador igual tiene que poder entrar.
  const tabStop = selected >= 0 ? selected : 0;

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    const next = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;

    event.preventDefault();
    onChange(tabs[next].id);
    buttons.current[next]?.focus();
  }

  return (
    <div className="vz-tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => {
            buttons.current[i] = el;
          }}
          type="button"
          role="tab"
          aria-selected={t.id === active}
          aria-controls={panelId}
          tabIndex={i === tabStop ? 0 : -1}
          className={`vz-tab ${t.id === active ? 'is-on' : ''}`}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => handleKeyDown(e, i)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
