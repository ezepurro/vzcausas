import { Navigate } from 'react-router'
import { useHomeRoute } from '../access/useHomeRoute'

/** La raíz (`/`) lleva a la pantalla de entrada de cada usuario. */
export function HomeRedirect() {
    return <Navigate to={useHomeRoute()} replace />
}