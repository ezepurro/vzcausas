import type { CSSProperties, ReactNode } from 'react';

export interface Column<T> {
  /** clave estable de la columna */
  id: string;
  header: string;
  /** contenido de la celda, ya formateado por la pantalla */
  cell: (row: T) => ReactNode;
  /** tipografía monoespaciada: SAC, fechas, matrículas, importes */
  mono?: boolean;
  /** no parte el contenido en dos renglones */
  nowrap?: boolean;
  /** alinea a la derecha; usalo para la columna de acciones */
  actions?: boolean;
  width?: string;
  /**
   * La columna que identifica a la fila: carátula, nombre. En una pantalla
   * angosta, donde cada fila es una tarjeta, va arriba y a todo el ancho.
   */
  primary?: boolean;
  /** Prescindible: se esconde cuando la tabla no entra (debajo de 1180px). */
  hideWhenNarrow?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /**
   * Ancho mínimo antes de que la tabla scrollee en horizontal. Vale en
   * pantallas anchas: debajo de 1180px la tabla lo suelta y se acomoda sola.
   */
  minWidth?: number;
  /** se muestra en lugar del cuerpo cuando no hay filas */
  empty?: ReactNode;
}

/**
 * Tabla de datos. Presentacional: no ordena, no filtra, no pagina.
 * Las filas llegan ya ordenadas y formateadas desde la pantalla.
 *
 * Debajo de 720px cada fila se dibuja como una tarjeta y la cabecera se va
 * (`table.css`): por eso cada celda lleva en `data-label` el nombre de su
 * columna. Los `role` están escritos a mano por lo mismo: al dejar de
 * dibujarse como tabla, el navegador le saca la semántica de tabla, y un lector
 * de pantalla dejaría de anunciar filas y celdas.
 */
export function DataTable<T>({
  columns, rows, rowKey, minWidth = 960, empty,
}: DataTableProps<T>) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className="vz-panel__scroll">
      <table role="table" className="vz-table" style={{ '--vz-table-min': `${minWidth}px` } as CSSProperties}>
        <thead role="rowgroup">
          <tr role="row">
            {columns.map((c) => (
              <th
                key={c.id}
                scope="col"
                role="columnheader"
                className={c.hideWhenNarrow ? 'vz-table__hide-narrow' : undefined}
                style={{ width: c.width, textAlign: c.actions ? 'right' : undefined }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {rows.map((r) => (
            <tr key={rowKey(r)} role="row">
              {columns.map((c) => (
                <td
                  key={c.id}
                  role="cell"
                  data-label={c.header}
                  className={[
                    c.mono ? 'vz-table__num' : '',
                    c.nowrap ? 'vz-table__nowrap' : '',
                    c.primary ? 'vz-table__cell--primary' : '',
                    c.actions ? 'vz-table__cell--actions' : '',
                    c.hideWhenNarrow ? 'vz-table__hide-narrow' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {c.actions ? <div className="vz-table__actions">{c.cell(r)}</div> : c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
