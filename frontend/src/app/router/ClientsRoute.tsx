import { ClientsPage } from '@/features/clients/pages/ClientsPage'
import { ClientActiveCases } from '@/features/cases'

/**
 * La pantalla Clientes, con lo que necesita de `cases`.
 *
 * Al dar de baja un cliente con causas activas, el diálogo muestra cuáles son
 * (HU11, CA-11.2). Esa lista la arma `cases` (`ClientActiveCases`), y
 * `clients` no puede importarla: la flecha va `cases → clients`. `app/` sí
 * puede importar de los dos módulos, así que la junta acá.
 */
export function ClientsRoute() {
    return <ClientsPage renderActiveCases={(clientId) => <ClientActiveCases clientId={clientId} />} />
}