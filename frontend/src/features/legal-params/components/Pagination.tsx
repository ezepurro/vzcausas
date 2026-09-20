import { Button, Icon } from '@/shared/components/ui';

export interface PaginationProps {
    page: number;
    totalPages: number;
    totalItems: number;
    onChange: (page: number) => void;
}

/**
 * Paginado de la tabla de estados procesales.
 *
 * Vive en el módulo y no en `shared` porque hoy lo usa una sola pantalla. El
 * texto dice "estados" a propósito: cuando un segundo módulo lo necesite, se
 * muda a `shared/components/ui` y ahí se parametriza la etiqueta. Copiarlo
 * sería la opción equivocada.
 *
 * Presentacional: no sabe cuántas páginas hay realmente ni pide datos, sólo
 * avisa a qué página quiere ir el usuario.
 */
export function Pagination({ page, totalPages, totalItems, onChange }: PaginationProps) {
    return (
        <div className="vz-pager">
            <span className="vz-pager__status">
                {totalItems === 0 ? (
                    'Sin resultados'
                ) : (
                    <>
                        <span className="vz-pager__count">{totalItems}</span>
                        {totalItems === 1 ? ' estado · página ' : ' estados · página '}
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
                    disabled={page >= totalPages}
                    onClick={() => onChange(page + 1)}
                >
                    {/* La flecha va DESPUÉS del texto, así que entra por los
                        children: `icon` siempre se dibuja a la izquierda. */}
                    Siguiente
                    <Icon name="forward" size={15} />
                </Button>
            </div>
        </div>
    );
}
