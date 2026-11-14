import type { ComponentType } from 'react'

/**
 * Las pantallas que se cargan recién cuando hacen falta.
 *
 * Cada una es un archivo aparte en el build: el primer ingreso (el login y el
 * marco) no descarga el código de todas las demás. El router las usa con
 * `lazy` (React Router espera el archivo con la pantalla anterior a la vista,
 * sin dejarla en blanco), y el rail las adelanta al apuntar a su sección
 * (`preloadSection`).
 *
 * Vite guarda cada `import()` ya hecho: pedir la misma pantalla dos veces no
 * la descarga dos veces, así que adelantarla y después navegar no cuesta nada.
 *
 * Quedan fuera, cargadas desde el principio, el login, los marcos y las
 * guardas: son lo primero que se ve y son chicos.
 */

/** Lo que espera `lazy` de React Router: la pantalla como `Component`. */
type LazyPage = () => Promise<{ Component: ComponentType }>

function page<M>(load: () => Promise<M>, pick: (module: M) => ComponentType): LazyPage {
    return async () => ({ Component: pick(await load()) })
}

export const PAGES = {
    home: page(() => import('@/features/dashboard/pages/HomePage'), (m) => m.HomePage),
    clients: page(() => import('@/app/router/ClientsRoute'), (m) => m.ClientsRoute),
    proceduralStates: page(
        () => import('@/features/legal-params/pages/ProceduralStatesPage'),
        (m) => m.ProceduralStatesPage,
    ),
    legalQualifications: page(
        () => import('@/features/legal-params/pages/LegalQualificationsPage'),
        (m) => m.LegalQualificationsPage,
    ),
    users: page(() => import('@/features/users/pages/UsersPage'), (m) => m.UsersPage),
    lawyers: page(() => import('@/features/lawyers/pages/LawyersPage'), (m) => m.LawyersPage),
    cases: page(() => import('@/features/cases/pages/CasesPage'), (m) => m.CasesPage),
    registerCase: page(() => import('@/features/cases/pages/RegisterCasePage'), (m) => m.RegisterCasePage),
    caseDetail: page(() => import('@/features/cases/pages/CaseDetailPage'), (m) => m.CaseDetailPage),
    registerProceduralAct: page(
        () => import('@/features/proceedings/pages/RegisterProceduralActPage'),
        (m) => m.RegisterProceduralActPage,
    ),
    generateCaseFile: page(
        () => import('@/features/cases/pages/GenerateCaseFilePage'),
        (m) => m.GenerateCaseFilePage,
    ),
    tools: page(() => import('@/features/tools/pages/ToolsPage'), (m) => m.ToolsPage),
    documentTemplates: page(
        () => import('@/features/documents/pages/DocumentTemplatesPage'),
        (m) => m.DocumentTemplatesPage,
    ),
} satisfies Record<string, LazyPage>

/**
 * Qué pantallas adelantar al apuntar a cada ítem del rail (su `id`, que es la
 * ruta). Causas suma el detalle: desde el listado es a donde casi siempre se va.
 */
export const SECTION_PAGES: Record<string, LazyPage[]> = {
    '/inicio': [PAGES.home],
    '/causas': [PAGES.cases, PAGES.caseDetail],
    '/causas/nueva': [PAGES.registerCase],
    '/clientes': [PAGES.clients],
    '/modelos': [PAGES.documentTemplates],
    '/herramientas': [PAGES.tools],
    '/usuarios': [PAGES.users],
    '/abogados': [PAGES.lawyers],
    '/estados-y-plazos': [PAGES.proceduralStates],
    '/calificaciones-legales': [PAGES.legalQualifications],
}

/**
 * Descarga de antemano el código de una sección. Si falla, no pasa nada: al
 * navegar se vuelve a intentar, y ahí el router muestra el error.
 */
export function preloadSection(route: string): void {
    for (const load of SECTION_PAGES[route] ?? []) {
        load().catch(() => {})
    }
}
