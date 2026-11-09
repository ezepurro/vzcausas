import { FieldError } from './FieldError';
import type {
  InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode,
} from 'react';

export interface FieldProps {
  label: string;
  /** marca el asterisco: es señalización visual, la validación va afuera */
  required?: boolean;
  /** aclaración bajo el campo */
  note?: ReactNode;
  /**
   * dato chico a la derecha de la etiqueta: el contador de caracteres de un
   * texto largo (`120 / 800`). Lo calcula la pantalla
   */
  hint?: ReactNode;
  /** mensaje de error; lo decide la pantalla */
  error?: string;
  /** ocupa las dos columnas de .vz-form-grid */
  width?: 'half' | 'full';
  htmlFor?: string;
  children: ReactNode;
}

/** Envoltorio de campo: etiqueta, control, nota y error. */
export function Field({
  label, required, note, hint, error, width = 'full', htmlFor, children,
}: FieldProps) {
  const labelNode = (
    <label className="vz-label" htmlFor={htmlFor}>
      {label}
      {required && <span className="vz-label__req">*</span>}
    </label>
  );

  return (
    <div className={`vz-field ${error ? 'vz-field--error' : ''} ${width === 'full' ? 'vz-col-full' : ''}`}>
      {hint === undefined ? labelNode : (
        <div className="vz-label-row">
          {labelNode}
          <span className="vz-label__hint">{hint}</span>
        </div>
      )}
      {children}
      {note && !error && <div className="vz-note">{note}</div>}
      {error && <FieldError message={error} />}
    </div>
  );
}

type Base = { mono?: boolean };

export function TextInput({ mono, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & Base) {
  return <input className={`vz-input ${mono ? 'vz-input--mono' : ''} ${className}`} {...rest} />;
}

/**
 * Opción de un `Select`. Una cadena suelta es el caso en que el valor y la
 * etiqueta son lo mismo; el par separa el código que viaja del texto que se lee
 * —"Penal" en pantalla, `CRIMINAL` en la API—, igual que `Tabs` separa `id` de
 * `label`.
 */
export type SelectOption = string | { value: string; label: string };

/**
 * Un grupo de opciones con título, que el select dibuja como `<optgroup>`.
 * Es el filtro de estado procesal del listado de causas: los estados de cada
 * fuero bajo su nombre, y aparte los "Escritos a mano en causas".
 */
export interface SelectOptionGroup {
  group: string;
  options: SelectOption[];
}

function renderOption(o: SelectOption) {
  const { value, label } = typeof o === 'string' ? { value: o, label: o } : o;
  return <option key={value} value={value}>{label}</option>;
}

export function Select({
  options, className = '', ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { options: (SelectOption | SelectOptionGroup)[] }) {
  return (
    <select className={`vz-select ${className}`} {...rest}>
      {options.map((o) =>
        typeof o === 'object' && 'group' in o ? (
          <optgroup key={`group-${o.group}`} label={o.group}>
            {o.options.map(renderOption)}
          </optgroup>
        ) : (
          renderOption(o)
        ),
      )}
    </select>
  );
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`vz-textarea ${className}`} {...rest} />;
}

export function Checkbox({
  label, className = '', ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={`vz-check ${className}`}>
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
}

/** Separador de sección dentro de un formulario en grilla. */
export function FormSection({ label }: { label: string }) {
  return (
    <div className="vz-form-sep">
      <span className="vz-form-sep__label">{label}</span>
      <span className="vz-form-sep__rule" />
    </div>
  );
}
