import { useRef, type MouseEvent, type ReactNode } from 'react';
import { useFocusFirstError } from '../../hooks/useFocusFirstError';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Field, TextInput, Select, Textarea, Checkbox, FormSection, type SelectOption } from './Field';

export type FieldType = 'text' | 'pass' | 'select' | 'date' | 'area' | 'check' | 'section';

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

            if (c.type === 'check') {
              return (
                <div key={k} className={`${c.width === 'half' ? '' : 'vz-col-full'} ${c.error ? 'vz-field--error' : ''}`}>
                  <Checkbox
                    label={c.label}
                    checked={Boolean(value)}
                    onChange={(e) => onChange(k, e.target.checked)}
                  />
                  {c.error && <div className="vz-error">{c.error}</div>}
                </div>
              );
            }

            return (
              <Field
                key={k}
                label={c.label}
                required={c.required}
                note={c.note}
                error={c.error}
                width={c.width ?? 'full'}
                htmlFor={id}
              >
                {c.type === 'select' ? (
                  <Select
                    id={id}
                    options={c.options ?? []}
                    value={String(value ?? '')}
                    onChange={(e) => onChange(k, e.target.value)}
                  />
                ) : c.type === 'area' ? (
                  <Textarea
                    id={id}
                    placeholder={c.placeholder}
                    value={String(value ?? '')}
                    onChange={(e) => onChange(k, e.target.value)}
                  />
                ) : (
                  <TextInput
                    id={id}
                    type={c.type === 'pass' ? 'password' : c.type === 'date' ? 'date' : 'text'}
                    mono={c.mono}
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
