import type { ReactNode } from 'react';

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
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** ancho mínimo antes de que la tabla scrollee en horizontal */
  minWidth?: number;
  /** se muestra en lugar del cuerpo cuando no hay filas */
  empty?: ReactNode;
}

/**
 * Tabla de datos. Presentacional: no ordena, no filtra, no pagina.
 * Las filas llegan ya ordenadas y formateadas desde la pantalla.
 */
export function DataTable<T>({
  columns, rows, rowKey, minWidth = 960, empty,
}: DataTableProps<T>) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className="vz-panel__scroll">
      <table className="vz-table" style={{ minWidth }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.id}
                scope="col"
                style={{ width: c.width, textAlign: c.actions ? 'right' : undefined }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)}>
              {columns.map((c) => (
                <td
                  key={c.id}
                  className={[c.mono ? 'vz-table__num' : '', c.nowrap ? 'vz-table__nowrap' : ''].filter(Boolean).join(' ')}
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
