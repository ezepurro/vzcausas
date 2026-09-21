import { Button } from './Button';

export interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  /**
   * Cómo se llama lo que se está paginando, en singular y en plural:
   * `['estado', 'estados']`, `['usuario', 'usuarios']`.
   *
   * Va como par y no derivado con una `s` porque el castellano no siempre
   * pluraliza así, y porque el texto lo lee una persona.
   */
  noun: [singular: string, plural: string];
  onChange: (page: number) => void;
}

/**
 * Paginado del pie de un panel.
 *
 * Presentacional: no sabe cuántas páginas hay realmente ni pide datos, sólo
 * avisa a qué página quiere ir el usuario.
 */
export function Pagination({ page, totalPages, totalItems, noun, onChange }: PaginationProps) {
  const [singular, plural] = noun;

  return (
    <div className="vz-pager">
      <span className="vz-pager__status">
        {totalItems === 0
          ? 'Sin resultados'
          : `${totalItems} ${totalItems === 1 ? singular : plural} · página ${page} de ${totalPages}`}
      </span>
      <div className="vz-pager__controls">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
