import { useRef, type MouseEvent, type ReactNode } from 'react';
import { useFocusFirstError } from '../../hooks/useFocusFirstError';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Field, TextInput, Select, Textarea, Checkbox, FormSection, type SelectOption } from './Field';
import { FieldError } from './FieldError';

export type FieldType = 'text' | 'pass' | 'email' | 'select' | 'date' | 'area' | 'check' | 'section';

export type FormValues = Record<string, string | boolean>;

export interface FieldSpec {
  /** clave del valor; no hace falta en 'section' */
  k?: string;
  label: string;
  type?: FieldType;
  width?: 'half' | 'full';
  required?: boolean;
  mono?: boolean;
  placeholder?: string;
  /**
   * tope de caracteres del control (el atributo `maxlength`): no deja escribir
   * de más. En un 'area' también dibuja el contador `120 / 2000`. La
   * validación del schema sigue igual, como respaldo
   */
  maxLength?: number;
  /**
   * el atributo `autocomplete` del control. Importa sobre todo en las
   * contraseñas: `'new-password'` cuando se carga la de otra persona o una
   * nueva (sin él, el navegador ofrece la de quien está logueado) y
   * `'current-password'` cuando se pide la propia
   */
  autoComplete?: string;
  note?: ReactNode;
  /** mensaje de error del campo; lo decide la pantalla, igual que en `Field` */
  error?: string;
  /** opciones del 'select': una cadena, o `{ value, label }` si el código que viaja no es el texto que se lee */
  options?: SelectOption[];
  /** muestra el campo solo si devuelve true; recibe los valores actuales */
  when?: (values: FormValues) => boolean;
}
export interface FormModalProps {
  title: string;
  sub?: string;
  /** aclaración destacada arriba del formulario: reglas de negocio, advertencias */
  note?: ReactNode;
  tone?: 'normal' | 'danger';
  width?: 'sm' | 'md' | 'lg';
  fields?: FieldSpec[];
  values: FormValues;
  onChange: (k: string, v: string | boolean) => void;
  okLabel?: string;
  cancelLabel?: string;
  /** deshabilita el confirmar; la validación vive en la pantalla */
  okDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** contenido propio además de los campos declarados */
  children?: ReactNode;
}

/**
 * Modal de formulario declarativo: los campos se describen como datos y el
 * modal los dibuja. Cubre alta, modificación y confirmación de baja.
 * No valida ni guarda: avisa con onConfirm y la pantalla decide.
 */
export function FormModal({
  title, sub, note, tone = 'normal', width = 'md', fields = [],
  values, onChange, okLabel = 'Confirmar', cancelLabel = 'Cancelar',
  okDisabled, onConfirm, onCancel, children,
}: FormModalProps) {
  const visible = fields.filter((c) => !c.when || c.when(values));

  /* Al confirmar, al primer campo con error: el cuerpo del modal tiene su
     propio scroll, y en uno largo (usuarios) el error puede quedar arriba. El
     contenedor sale del botón porque `Modal` no expone su tarjeta. */
  const card = useRef<HTMLElement | null>(null);
  const focusErrors = useFocusFirstError(card, visible.map((c) => c.error ?? ''));

  function confirm(event: MouseEvent<HTMLButtonElement>) {
    card.current = event.currentTarget.closest('.vz-modal');
    focusErrors();
    onConfirm();
  }

  return (
    <Modal
      title={title}
      sub={sub}
      width={width}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            disabled={okDisabled}
            onClick={confirm}
          >
            {okLabel}
          </Button>
        </>
      }
    >
      {note && (
        <p className={`vz-modal__note ${tone === 'danger' ? 'vz-modal__note--danger' : ''}`}>
          {note}
        </p>
      )}

      {visible.length > 0 && (
        <div className="vz-form-grid">
          {visible.map((c, i) => {
            if (c.type === 'section') return <FormSection key={`s${i}`} label={c.label} />;

            const k = c.k as string;
            const id = `field-${k}`;
            const value = values[k];

            /* Lo que un lector de pantalla necesita del control: que está en
               error y cuál es, o la ayuda del campo; y que es obligatorio. */
            const errorId = `${id}-error`;
            const noteId = `${id}-note`;
            const a11y = {
              'aria-invalid': c.error ? true : undefined,
              'aria-describedby': c.error ? errorId : c.note ? noteId : undefined,
              'aria-required': c.required ? true : undefined,
            } as const;

            if (c.type === 'check') {
              return (
                <div key={k} className={`${c.width === 'half' ? '' : 'vz-col-full'} ${c.error ? 'vz-field--error' : ''}`}>
                  <Checkbox
                    label={c.label}
                    checked={Boolean(value)}
                    aria-invalid={a11y['aria-invalid']}
                    aria-describedby={c.error ? errorId : undefined}
                    onChange={(e) => onChange(k, e.target.checked)}
                  />
                  {c.error && <FieldError id={errorId} message={c.error} />}
                </div>
              );
            }

            return (
              <Field
                key={k}
                label={c.label}
                required={c.required}
                note={c.note}
                hint={c.type === 'area' && c.maxLength !== undefined
                  ? `${String(value ?? '').length} / ${c.maxLength}`
                  : undefined}
                error={c.error}
                width={c.width ?? 'full'}
                htmlFor={id}
                errorId={errorId}
                noteId={noteId}
              >
                {c.type === 'select' ? (
                  <Select
                    id={id}
                    {...a11y}
                    options={c.options ?? []}
                    value={String(value ?? '')}
                    onChange={(e) => onChange(k, e.target.value)}
                  />
                ) : c.type === 'area' ? (
                  <Textarea
                    id={id}
                    {...a11y}
                    maxLength={c.maxLength}
                    placeholder={c.placeholder}
                    value={String(value ?? '')}
                    onChange={(e) => onChange(k, e.target.value)}
                  />
                ) : (
                  <TextInput
                    id={id}
                    {...a11y}
                    type={c.type === 'pass' ? 'password' : c.type === 'date' ? 'date' : c.type === 'email' ? 'email' : 'text'}
                    autoComplete={c.autoComplete}
                    mono={c.mono}
                    maxLength={c.maxLength}
                    placeholder={c.placeholder}
                    value={String(value ?? '')}
                    onChange={(e) => onChange(k, e.target.value)}
                  />
                )}
              </Field>
            );
          })}
        </div>
      )}

      {children}
    </Modal>
  );
}
