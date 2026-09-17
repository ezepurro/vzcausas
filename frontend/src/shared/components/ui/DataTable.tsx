import type { ReactNode } from 'react';

export interface Columna<T> {
  /** clave estable de la columna */
  id: string;
  encabezado: string;
  /** contenido de la celda, ya formateado por la pantalla */
  celda: (fila: T) => ReactNode;
  /** tipografía monoespaciada: SAC, fechas, matrículas, importes */
  mono?: boolean;
  /** no parte el contenido en dos renglones */
  nowrap?: boolean;
  /** alinea a la derecha; usalo para la columna de acciones */
  acciones?: boolean;
  ancho?: string;
}

export interface DataTableProps<T> {
  columnas: Columna<T>[];
  filas: T[];
  claveFila: (fila: T) => string;
  /** ancho mínimo antes de que la tabla scrollee en horizontal */
  anchoMinimo?: number;
  /** se muestra en lugar del cuerpo cuando no hay filas */
  vacio?: ReactNode;
}

/**
 * Tabla de datos. Presentacional: no ordena, no filtra, no pagina.
 * Las filas llegan ya ordenadas y formateadas desde la pantalla.
 */
export function DataTable<T>({
  columnas, filas, claveFila, anchoMinimo = 960, vacio,
}: DataTableProps<T>) {
  if (filas.length === 0 && vacio) return <>{vacio}</>;

  return (
    <div className="vz-panel__scroll">
      <table className="vz-table" style={{ minWidth: anchoMinimo }}>
        <thead>
          <tr>
            {columnas.map((c) => (
              <th
                key={c.id}
                scope="col"
                style={{ width: c.ancho, textAlign: c.acciones ? 'right' : undefined }}
              >
                {c.encabezado}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={claveFila(f)}>
              {columnas.map((c) => (
                <td
                  key={c.id}
                  className={[c.mono ? 'vz-table__num' : '', c.nowrap ? 'vz-table__nowrap' : ''].filter(Boolean).join(' ')}
                >
                  {c.acciones ? <div className="vz-table__actions">{c.celda(f)}</div> : c.celda(f)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
