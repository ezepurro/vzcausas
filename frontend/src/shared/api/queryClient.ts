import {MutationCache, QueryClient} from '@tanstack/react-query';
import {isApiError} from './ApiError';
import {reportIfLeftBehind, trackMutationListeners} from './leftBehindErrors';

const MAX_RETRIES = 2;

/**
 * Un error de una operación que quedó en curso cuando se salió de la
 * pantalla se avisa igual (ver `leftBehindErrors.ts`). El de una pantalla que
 * sigue ahí lo avisa ella misma.
 */
const mutationCache = new MutationCache({
    onError: (error, _variables, _context, mutation) =>
        reportIfLeftBehind(error, mutation as Parameters<typeof reportIfLeftBehind>[1]),
});
trackMutationListeners(mutationCache);

export const queryClient = new QueryClient({
    mutationCache,
    defaultOptions: {
        queries: {
        retry: (failureCount, error) => {
            // No es del backend: es un bug nuestro. Reintentar no lo arregla.
            if (!isApiError(error)) return false

            if (error.isNetworkError || error.isServer) {
                return failureCount < MAX_RETRIES
            }
            return false
        },
        /**
       * Durante 1 minuto los datos se consideran frescos: si el usuario
       * va a otra pantalla y vuelve, sale de la cache sin pedir nada.
       * El default es 0, que para un ABM de catalogo es exagerado.
       */
        staleTime: 60_000,
        },
        mutations: {
        /**
         * Nunca reintentar POST/PATCH/DELETE automaticamente: si la respuesta
         * se pierde despues de que el backend ya proceso, un reintento
         * duplicaria el registro. Que el usuario decida si vuelve a intentar.
         */
        retry: false,

},
},
})
