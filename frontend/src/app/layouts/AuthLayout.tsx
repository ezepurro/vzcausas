import { Outlet } from 'react-router'

/**
 * Marco de las pantallas que se ven sin sesión: hoy sólo el login.
 *
 * No dibuja nada. La pantalla sin sesión ocupa el alto entero del navegador
 * y arma su propia composición —el login trae su columna institucional y su
 * formulario—, así que un marco alrededor sólo estorbaría.
 *
 * El archivo se conserva porque el router necesita esta rama para colgar las
 * pantallas públicas que vengan después.
 */
export function AuthLayout() {
    return <Outlet />
}
