import { useHoverIntent } from '@/shared/hooks/useHoverIntent';
import { Button } from './Button';
import { Icon } from './Icon';

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
  /**
   * El usuario apunta a "Siguiente": el mouse quedó encima un momento o tomó
   * el foco (`useHoverIntent`). Recibe la página a la que iría, para que la
   * pantalla la pida de antemano.
   */
  onIntent?: (page: number) => void;
}

/**
 * Paginado del pie de un panel.
 *
 * Presentacional: no sabe cuántas páginas hay realmente ni pide datos, sólo
 * avisa a qué página quiere ir el usuario (o a cuál apunta, con `onIntent`).
 */
export function Pagination({ page, totalPages, totalItems, noun, onChange, onIntent }: PaginationProps) {
  const [singular, plural] = noun;
  const intent = useHoverIntent(onIntent);
  const hasNext = page < totalPages;

  return (
    <div className="vz-pager">
      <span className="vz-pager__status">
        {totalItems === 0 ? (
          'Sin resultados'
        ) : (
          <>
            {/* Sólo los números van en mono: el renglón entero monoespaciado
                competía con la tabla. */}
            <span className="vz-pager__count">{totalItems}</span>
            {` ${totalItems === 1 ? singular : plural} · página `}
            <span className="vz-pager__count">{page}</span>
            {' de '}
            <span className="vz-pager__count">{totalPages}</span>
          </>
        )}
      </span>
      <div className="vz-pager__controls">
        <Button
          variant="secondary"
          size="sm"
          icon={<Icon name="back" size={15} />}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasNext}
          onClick={() => onChange(page + 1)}
          // En la última página no hay qué pedir.
          {...(hasNext && intent(page + 1))}
        >
          {/* La flecha va DESPUÉS del texto, así que entra por los children:
              `icon` siempre se dibuja a la izquierda. */}
          Siguiente
          <Icon name="forward" size={15} />
        </Button>
      </div>
    </div>
  );
}
