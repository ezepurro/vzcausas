import { createBrowserRouter } from 'react-router'
import { AppLayout } from '@/app/layouts/AppLayout'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { NotFoundLayout } from '@/app/layouts/NotFoundLayout'
import { RequireSession } from '@/app/router/RequireSession'
import { RedirectIfSession } from '@/app/router/RedirectIfSession'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RequireAccess } from '@/app/router/RequireAccess'
import { HomeRedirect } from '@/app/router/HomeRedirect'
import { LowercasePath } from '@/app/router/LowercasePath'
import { PAGES } from '@/app/router/pages'
import { RouteErrorPage } from '@/app/router/RouteErrorPage'
import { BootScreen } from '@/app/layouts/BootScreen'

/* Las pantallas van con `lazy`: cada una se descarga la primera vez que se
   entra (o antes, al apuntar a su sección del rail). Mientras llega, queda a
   la vista la pantalla anterior. Ver `pages.ts`. */

export const router = createBrowserRouter([
    {
        // Antes que todo: `/Abogados` pasa a `/abogados` (ver LowercasePath).
        element: <LowercasePath />,
        // Último recurso, sin rail: un error en los marcos, las guardas o el login.
        errorElement: <RouteErrorPage fullPage />,
        // Al abrir la app en una pantalla que todavía no se descargó: sin esto, queda en blanco.
        hydrateFallbackElement: <BootScreen label="Cargando" />,
        children: [
            {
                // Sin sesión: sólo el login. Con sesión, la guarda rebota a Inicio.
                element: <RedirectIfSession />,
                children: [
                    {
                        element: <AuthLayout />,
                        children: [{ path: '/login', element: <LoginPage /> }],
                    },
                ],
            },
            {
                // Con sesión: todo lo que vive adentro del rail.
                element: <RequireSession />,
                children: [
                    {
                        element: <AppLayout />,
                        children: [
                            { index: true, element: <HomeRedirect /> },
                            {
                                element: <RequireAccess />,
                                /* Una pantalla que no se pudo descargar o que falló al
                                   dibujarse: el error ocupa el lugar de la pantalla y el
                                   rail sigue a la vista (`RouteErrorPage`). */
                                errorElement: <RouteErrorPage />,
                                children: [
                                    { path: 'inicio', lazy: PAGES.home },
                                    { path: 'clientes', lazy: PAGES.clients},
                                    { path: 'estados-y-plazos', lazy: PAGES.proceduralStates },
                                    { path: 'calificaciones-legales', lazy: PAGES.legalQualifications },
                                    { path: 'usuarios', lazy: PAGES.users },
                                    { path: 'abogados', lazy: PAGES.lawyers },
                                    { path : 'causas', lazy: PAGES.cases},
                                    { path: 'causas/nueva', lazy: PAGES.registerCase },
                                    { path: 'causas/:caseId', lazy: PAGES.caseDetail },
                                    { path: 'causas/:caseId/acto', lazy: PAGES.registerProceduralAct },
                                    // Modificar un acto (HU28): la misma pantalla, con el acto elegido en la línea de vida.
                                    { path: 'causas/:caseId/acto/:actId', lazy: PAGES.registerProceduralAct },
                                    { path: 'causas/:caseId/expediente', lazy: PAGES.generateCaseFile },
                                    { path: 'herramientas', lazy: PAGES.tools },
                                    { path: 'modelos', lazy: PAGES.documentTemplates },


                                ],
                            },
                        ],
                    },
                    // Cualquier ruta desconocida, incluidas las secciones del rail que
                    // todavía no tienen pantalla. Va a sangre, sin el rail, pero sigue
                    // detrás de la guarda: sin sesión no se ve nada que no sea el login.
                    { path: '*', element: <NotFoundLayout /> },
                ],
            },
        ],
    },
])
