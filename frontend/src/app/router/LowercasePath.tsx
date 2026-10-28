import { Navigate, Outlet, useLocation } from 'react-router'

/**
 * Lleva la URL a minúsculas: `/Abogados` → `/abogados`. React Router ya
 * matchea sin distinguir mayúsculas; esto deja además la barra de direcciones
 * y el historial con la forma canónica. La query y el `#` no se tocan.
 */
export function LowercasePath() {
    const { pathname, search, hash, state } = useLocation()
    const lower = pathname.toLowerCase()

    if (lower !== pathname) return <Navigate to={{ pathname: lower, search, hash }} state={state} replace />

    return <Outlet />
}
