import type { CSSProperties, ReactNode } from 'react';
import { LoadingState, Skeleton } from './Skeleton';

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
  /**
   * Primera carga: en lugar de las filas dibuja un esqueleto con las mismas
   * columnas, así la tabla no salta cuando llegan los datos.
   */
  loading?: boolean;
  /** lo que oye un lector de pantalla mientras carga: 'Cargando causas…' */
  loadingLabel?: string;
  /**
   * Ya hay filas y se está trayendo otra página u otro filtro: la tabla se
   * atenúa y sigue mostrando las anteriores hasta que lleguen las nuevas.
   */
  busy?: boolean;
}

/** Filas del esqueleto: las suficientes para llenar el panel sin scroll. */
const SKELETON_ROWS = 6;
/** Anchos de las barras, rotados por fila y columna para que no se vea una grilla. */
const SKELETON_WIDTHS = ['72%', '54%', '86%', '62%', '46%', '78%'];

function TableSkeleton<T>({ columns, minWidth, label }: { columns: Column<T>[]; minWidth: number; label: string }) {
  const rows = Array.from({ length: SKELETON_ROWS }, (_, i) => i);
  return (
    <LoadingState label={label}>
      <div className="vz-panel__scroll">
        <table className="vz-table vz-table--skeleton" style={{ '--vz-table-min': `${minWidth}px` } as CSSProperties}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.id} className={c.hideWhenNarrow ? 'vz-table__hide-narrow' : undefined} style={{ width: c.width }}>
                  {!c.actions && <Skeleton onDark width={Math.min(90, 34 + c.header.length * 6)} height={9} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r}>
                {columns.map((c, i) => (
                  <td
                    key={c.id}
                    className={[
                      c.primary ? 'vz-table__cell--primary' : '',
                      c.actions ? 'vz-table__cell--actions' : '',
                      c.hideWhenNarrow ? 'vz-table__hide-narrow' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {c.actions ? (
                      <Skeleton shape="pill" width={96} height={28} />
                    ) : c.primary ? (
                      <div className="vz-skel-stack">
                        <Skeleton width={SKELETON_WIDTHS[(r + i) % SKELETON_WIDTHS.length]} height={13} />
                        <Skeleton width="40%" height={10} />
                      </div>
                    ) : (
                      <Skeleton width={SKELETON_WIDTHS[(r * 2 + i) % SKELETON_WIDTHS.length]} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LoadingState>
  );
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
  columns, rows, rowKey, minWidth = 960, empty, loading = false, loadingLabel = 'Cargando…', busy = false,
}: DataTableProps<T>) {
  if (loading) return <TableSkeleton columns={columns} minWidth={minWidth} label={loadingLabel} />;
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className="vz-panel__scroll" aria-busy={busy || undefined}>
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
