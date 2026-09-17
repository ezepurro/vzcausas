export interface TabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  activa: T;
  onCambiar: (id: T) => void;
}

/** Pestañas. No guardan estado: la pantalla es dueña de `activa`. */
export function Tabs<T extends string>({ tabs, activa, onCambiar }: TabsProps<T>) {
  return (
    <div className="vz-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === activa}
          className={`vz-tab ${t.id === activa ? 'is-on' : ''}`}
          onClick={() => onCambiar(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
