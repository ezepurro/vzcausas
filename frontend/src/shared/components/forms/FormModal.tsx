import type { ReactNode } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Field, TextInput, Select, Textarea, Checkbox, FormSection } from './Field';

export type TipoCampo = 'texto' | 'pass' | 'select' | 'date' | 'area' | 'check' | 'seccion';

export type ValoresForm = Record<string, string | boolean>;

export interface CampoSpec {
  /** clave del valor; no hace falta en 'seccion' */
  k?: string;
  label: string;
  tipo?: TipoCampo;
  ancho?: 'half' | 'full';
  requerido?: boolean;
  mono?: boolean;
  placeholder?: string;
  nota?: ReactNode;
  opciones?: string[];
  /** muestra el campo solo si devuelve true; recibe los valores actuales */
  si?: (valores: ValoresForm) => boolean;
}

export interface FormModalProps {
  titulo: string;
  sub?: string;
  /** aclaración destacada arriba del formulario: reglas de negocio, advertencias */
  nota?: ReactNode;
  tono?: 'normal' | 'danger';
  ancho?: 'sm' | 'md' | 'lg';
  campos?: CampoSpec[];
  valores: ValoresForm;
  onCambiar: (k: string, v: string | boolean) => void;
  okLabel?: string;
  cancelarLabel?: string;
  /** deshabilita el confirmar; la validación vive en la pantalla */
  okDeshabilitado?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
  /** contenido propio además de los campos declarados */
  children?: ReactNode;
}

/**
 * Modal de formulario declarativo: los campos se describen como datos y el
 * modal los dibuja. Cubre alta, modificación y confirmación de baja.
 * No valida ni guarda: avisa con onConfirmar y la pantalla decide.
 */
export function FormModal({
  titulo, sub, nota, tono = 'normal', ancho = 'md', campos = [],
  valores, onCambiar, okLabel = 'Confirmar', cancelarLabel = 'Cancelar',
  okDeshabilitado, onConfirmar, onCancelar, children,
}: FormModalProps) {
  const visibles = campos.filter((c) => !c.si || c.si(valores));

  return (
    <Modal
      titulo={titulo}
      sub={sub}
      ancho={ancho}
      onCerrar={onCancelar}
      pie={
        <>
          <Button variante="secondary" onClick={onCancelar}>{cancelarLabel}</Button>
          <Button
            variante={tono === 'danger' ? 'danger' : 'primary'}
            disabled={okDeshabilitado}
            onClick={onConfirmar}
          >
            {okLabel}
          </Button>
        </>
      }
    >
      {nota && (
        <p className={`vz-modal__note ${tono === 'danger' ? 'vz-modal__note--danger' : ''}`}>
          {nota}
        </p>
      )}

      {visibles.length > 0 && (
        <div className="vz-form-grid">
          {visibles.map((c, i) => {
            if (c.tipo === 'seccion') return <FormSection key={`s${i}`} label={c.label} />;

            const k = c.k as string;
            const id = `campo-${k}`;
            const valor = valores[k];

            if (c.tipo === 'check') {
              return (
                <div key={k} className={c.ancho === 'half' ? '' : 'vz-col-full'}>
                  <Checkbox
                    label={c.label}
                    checked={Boolean(valor)}
                    onChange={(e) => onCambiar(k, e.target.checked)}
                  />
                </div>
              );
            }

            return (
              <Field
                key={k}
                label={c.label}
                requerido={c.requerido}
                nota={c.nota}
                ancho={c.ancho ?? 'full'}
                htmlFor={id}
              >
                {c.tipo === 'select' ? (
                  <Select
                    id={id}
                    opciones={c.opciones ?? []}
                    value={String(valor ?? '')}
                    onChange={(e) => onCambiar(k, e.target.value)}
                  />
                ) : c.tipo === 'area' ? (
                  <Textarea
                    id={id}
                    placeholder={c.placeholder}
                    value={String(valor ?? '')}
                    onChange={(e) => onCambiar(k, e.target.value)}
                  />
                ) : (
                  <TextInput
                    id={id}
                    type={c.tipo === 'pass' ? 'password' : c.tipo === 'date' ? 'date' : 'text'}
                    mono={c.mono}
                    placeholder={c.placeholder}
                    value={String(valor ?? '')}
                    onChange={(e) => onCambiar(k, e.target.value)}
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
