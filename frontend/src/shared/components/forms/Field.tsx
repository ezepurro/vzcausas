import type {
  InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode,
} from 'react';

export interface FieldProps {
  label: string;
  /** marca el asterisco: es señalización visual, la validación va afuera */
  required?: boolean;
  /** aclaración bajo el campo */
  note?: ReactNode;
  /** mensaje de error; lo decide la pantalla */
  error?: string;
  /** ocupa las dos columnas de .vz-form-grid */
  width?: 'half' | 'full';
  htmlFor?: string;
  children: ReactNode;
}

/** Envoltorio de campo: etiqueta, control, nota y error. */
export function Field({
  label, required, note, error, width = 'full', htmlFor, children,
}: FieldProps) {
  return (
    <div className={`vz-field ${error ? 'vz-field--error' : ''} ${width === 'full' ? 'vz-col-full' : ''}`}>
      <label className="vz-label" htmlFor={htmlFor}>
        {label}
        {required && <span className="vz-label__req">*</span>}
      </label>
      {children}
      {note && !error && <div className="vz-note">{note}</div>}
      {error && <div className="vz-error">{error}</div>}
    </div>
  );
}

type Base = { mono?: boolean };

export function TextInput({ mono, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & Base) {
  return <input className={`vz-input ${mono ? 'vz-input--mono' : ''} ${className}`} {...rest} />;
}

/**
 * Una opción del select cuando el valor que viaja no es el texto que se lee:
 * un id, o un código del contrato con su rótulo en castellano.
 */
export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  options, className = '', ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { options: (string | SelectOption)[] }) {
  return (
    <select className={`vz-select ${className}`} {...rest}>
      {options.map((o) => {
        // Una cadena suelta es valor y rótulo a la vez: el caso de siempre.
        const { value, label } = typeof o === 'string' ? { value: o, label: o } : o;
        return <option key={value} value={value}>{label}</option>;
      })}
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
