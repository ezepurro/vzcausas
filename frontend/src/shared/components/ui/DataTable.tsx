import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { LoadingState, Skeleton } from './Skeleton';

/** El corte del proyecto debajo del cual toda tabla es ficha (`tokens.css`). */
const CARD_QUERY = '(max-width: 1180px)';

/**
 * Cuánto más ancho que el mínimo tiene que quedar el lugar para volver de
 * ficha a tabla. Al pasar a ficha el panel pierde su borde y el lugar crece
 * 2px: sin este margen, en el límite saltaría de una forma a la otra.
 */
const BACK_TO_TABLE_MARGIN = 4;

/**
 * Si la tabla se dibuja como fichas: con la ventana en 1180px o menos, o si
 * el lugar que tiene es más angosto que su ancho mínimo. Lo segundo pasa entre
 * 1181 y 1360px con las tablas de 1.040px de mínimo (Causas, Usuarios): antes
 * scrolleaban en horizontal (tanda 14 de `docs/auditoria-front`).
 *
 * Se mide antes de dibujar (`useLayoutEffect`), así no se ve la tabla un
 * instante antes de pasar a fichas. Sin `matchMedia` ni `ResizeObserver`
 * (jsdom) queda como tabla.
 */
function useStacked(minWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [stacked, setStacked] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(CARD_QUERY).matches,
  );

  useLayoutEffect(() => {
    const box = ref.current;
    if (!box || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(CARD_QUERY);
    const update = () => {
      const width = box.clientWidth;
      setStacked((was) => media.matches || width < minWidth + (was ? BACK_TO_TABLE_MARGIN : 0));
    };
    update();
    media.addEventListener('change', update);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(box);
    return () => {
      media.removeEventListener('change', update);
      observer?.disconnect();
    };
  }, [minWidth]);

  return { ref, stacked };
}

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
   * La columna que identifica a la fila: carátula, nombre. Cuando cada fila es
   * una ficha, la encabeza a todo el ancho.
   */
  primary?: boolean;
  /** Prescindible: se esconde en la ficha del teléfono (debajo de 721px). */
  hideWhenNarrow?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /**
   * El ancho que necesita la tabla. Si su lugar es más angosto, cada fila pasa
   * a ser una ficha (también con la ventana en 1180px o menos): una tabla no
   * scrollea en horizontal.
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
  const { ref, stacked } = useStacked(minWidth);
  return (
    <LoadingState label={label}>
      <div className="vz-panel__scroll" ref={ref}>
        <table
          className={`vz-table vz-table--skeleton${stacked ? ' vz-table--stacked' : ''}`}
          style={{ '--vz-table-min': `${minWidth}px` } as CSSProperties}
        >
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
 * Hay dos formas y ninguna intermedia: tabla, o una ficha suelta por fila sin
 * cabecera (`table.css`). Es ficha con la ventana en 1180px o menos, o si la
 * tabla no entra en su lugar (`minWidth`).
 * Por eso cada celda lleva en `data-label` el nombre de su
 * columna. Los `role` están escritos a mano por lo mismo: al dejar de
 * dibujarse como tabla, el navegador le saca la semántica de tabla, y un lector
 * de pantalla dejaría de anunciar filas y celdas.
 */
export function DataTable<T>({
  columns, rows, rowKey, minWidth = 960, empty, loading = false, loadingLabel = 'Cargando…', busy = false,
}: DataTableProps<T>) {
  if (loading) return <TableSkeleton columns={columns} minWidth={minWidth} label={loadingLabel} />;
  if (rows.length === 0 && empty) return <>{empty}</>;
  return <Rows columns={columns} rows={rows} rowKey={rowKey} minWidth={minWidth} busy={busy} />;
}

/** La tabla con sus filas. Aparte de `DataTable` para poder medir su lugar con un hook. */
function Rows<T>({ columns, rows, rowKey, minWidth, busy }: Pick<DataTableProps<T>, 'columns' | 'rows' | 'rowKey' | 'busy'> & { minWidth: number }) {
  const { ref, stacked } = useStacked(minWidth);

  return (
    <div className="vz-panel__scroll" aria-busy={busy || undefined} ref={ref}>
      <table
        role="table"
        className={`vz-table${stacked ? ' vz-table--stacked' : ''}`}
        style={{ '--vz-table-min': `${minWidth}px` } as CSSProperties}
      >
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
