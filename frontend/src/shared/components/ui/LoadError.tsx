import { isApiError } from '@/shared/api/ApiError';
import { Button } from './Button';

export interface LoadErrorProps {
  /** Qué no se pudo cargar: "No se pudieron cargar las causas". */
  title: string;
  /** El error de la consulta: su mensaje se muestra debajo del título. */
  error: unknown;
  /** Vuelve a pedir lo que falló: el `refetch` de la consulta. */
  onRetry: () => void;
  /** Se está volviendo a pedir: el botón espera. */
  retrying?: boolean;
}

/**
 * Lo que se ve en lugar de un listado o una pantalla que no se pudo cargar.
 *
 * Antes cada pantalla armaba este bloque a mano, sin forma de volver a
 * intentar y sin que un lector de pantalla se enterara (tanda 14 de
 * `docs/auditoria-front`). Ahora el título y el mensaje son un `alert` y
 * "Reintentar" vuelve a pedir.
 */
export function LoadError({ title, error, onRetry, retrying = false }: LoadErrorProps) {
  return (
    <div className="vz-empty">
      <div role="alert" className="vz-empty__message">
        <div className="vz-empty__title">{title}</div>
        <div className="vz-empty__text">{isApiError(error) ? error.message : 'Ocurrió un error inesperado.'}</div>
      </div>
      {isTransient(error) && (
        <Button variant="secondary" size="sm" className="vz-empty__action" onClick={onRetry} disabled={retrying}>
          {retrying ? 'Reintentando…' : 'Reintentar'}
        </Button>
      )}
    </div>
  );
}

/**
 * Si volver a pedir puede dar otra cosa: sin red, un error del servidor o
 * demasiados pedidos. Un `404` (la causa no existe o se dio de baja), un `403`
 * o un `400` van a responder lo mismo: no se ofrece "Reintentar".
 */
function isTransient(error: unknown): boolean {
  if (!isApiError(error)) return true;
  return error.isNetworkError || error.isServer || error.status === 429;
}
