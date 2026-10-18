import type { ReactNode } from 'react';

export interface DetailItem {
  label: string;
  /**
   * aclaración chica debajo de la etiqueta: de dónde sale el dato
   * ("8 años desde el 27/02/2021")
   */
  note?: ReactNode;
  /** ya formateado por la pantalla; vacío muestra una raya */
  value: ReactNode;
  /** tipografía monoespaciada: DNI, fechas, matrículas */
  mono?: boolean;
}

export interface DetailListProps {
  items: DetailItem[];
}

/** Lo que se muestra en lugar de un dato que no está. */
const EMPTY = '—';

/**
 * Pares etiqueta–valor, uno por renglón: la etiqueta apagada a la izquierda y
 * el dato en negrita a la derecha. Es la tarjeta "Cliente" del detalle de una
 * causa, el "Resumen del alta" y el "Cómputo del plazo".
 *
 * Es un `<dl>` y no una grilla de `<div>`: así el lector de pantalla anuncia
 * cada dato con su etiqueta.
 *
 * Un valor `null`, `undefined` o `''` se muestra como `—`. Los datos
 * opcionales del contrato (teléfono, correo) llegan en `null`, y un renglón
 * con la etiqueta sola parece un error de carga.
 *
 * `note` agrega un segundo renglón, apagado, debajo de la etiqueta. Para una
 * aclaración debajo del valor, el `value` puede traer un
 * `<span className="vz-details__note">`.
 */
export function DetailList({ items }: DetailListProps) {
  return (
    <dl className="vz-details">
      {items.map((item) => {
        const missing = item.value === null || item.value === undefined || item.value === '';

        return (
          <div key={item.label} className="vz-details__row">
            <dt className="vz-details__label">
              {item.label}
              {item.note && <span className="vz-details__note">{item.note}</span>}
            </dt>
            <dd className={`vz-details__value ${item.mono && !missing ? 'vz-mono' : ''}`}>
              {missing ? EMPTY : item.value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
