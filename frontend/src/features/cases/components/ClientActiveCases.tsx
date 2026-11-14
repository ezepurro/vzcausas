import { DetailList, LoadError, LoadingState, Skeleton } from '@/shared/components/ui'
import { useProceduralStates } from '@/features/legal-params'
import { useCases } from '@/features/cases/api/useCases'
import { activeCasesOf } from '@/features/cases/utils/activeCases'
import { caseStateLabel } from '@/features/cases/utils/caseState'

/* Un cliente no tiene cien causas: con la primera página alcanza. */
const LIMIT = 100

export interface ClientActiveCasesProps {
    clientId: number
}

/**
 * Las causas activas de un cliente: por qué no se puede dar de baja (HU11,
 * CA-11.2). La muestra el diálogo "Eliminar cliente" cuando el backend
 * responde `409 CLIENT_HAS_ACTIVE_CASES`, que no trae la lista.
 *
 * Vive en `cases` porque pide causas y estados procesales, y `clients` no
 * puede importar de `cases` (la flecha va `cases → clients`). Lo publica el
 * `index.ts`; la pantalla de clientes lo recibe hecho y lo enchufa el router.
 *
 * Pide las causas del cliente (`GET /cases?clientId=`) y los estados de los
 * tres fueros, porque un cliente puede tener causas de más de uno, y se queda
 * con las que no están en un estado terminal (`activeCasesOf`).
 */
export function ClientActiveCases({ clientId }: ClientActiveCasesProps) {
    const casesQuery = useCases({ clientId, page: 1, limit: LIMIT })
    const criminal = useProceduralStates({ jurisdiction: 'CRIMINAL', page: 1, limit: LIMIT })
    const amparo = useProceduralStates({ jurisdiction: 'AMPARO', page: 1, limit: LIMIT })
    const administrative = useProceduralStates({ jurisdiction: 'ADMINISTRATIVE', page: 1, limit: LIMIT })
    const queries = [casesQuery, criminal, amparo, administrative]

    const failed = queries.find((q) => q.isError)
    if (failed) {
        return (
            <LoadError
                title="No se pudieron cargar sus causas activas"
                error={failed.error}
                onRetry={() => queries.forEach((q) => void q.refetch())}
                retrying={queries.some((q) => q.isFetching)}
            />
        )
    }
    if (queries.some((q) => q.isPending)) {
        /* El esqueleto ocupa el lugar de dos renglones de la lista. */
        return (
            <LoadingState label="Cargando sus causas activas…">
                {[0, 1].map((i) => <Skeleton key={i} height={20} />)}
            </LoadingState>
        )
    }

    const states = [criminal, amparo, administrative].flatMap((q) => q.data?.data ?? [])
    const active = activeCasesOf(casesQuery.data?.data ?? [], states)

    return (
        <DetailList
            items={active.map((c) => ({ label: c.caption, value: caseStateLabel(c.currentState) }))}
        />
    )
}