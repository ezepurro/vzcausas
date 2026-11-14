# Plan B — Visual y experiencia de usuario

**Lo ejecuta:** el compañero. **El otro plan:**
[05-PLAN_A_TECNICO.md](05-PLAN_A_TECNICO.md), de Luciano con Claude.

12/11/2026 · rama `feat/auditoria-front` · **propuesta: nada de esto se
programa hasta acordarlo.** Los `H-xx` están en el
[diagnóstico](01-DIAGNOSTICO_INICIAL.md) y en los
[resultados de la ola 1](04-OLA1_RESULTADOS.md); el detalle de cada tarea, en
[03-PLAN.md](03-PLAN.md). Este documento dice **qué es de este plan, en qué
orden y qué archivos son suyos**.

Rutas relativas a `frontend/`. Para correr la app sin backend:
`VITE_USE_MOCKS=true` en `.env.local`; los usuarios de prueba están en
`src/shared/mocks/README.md`. **Con los mocks no abras dos pestañas**: la
segunda cierra la sesión de las dos (H-31).

## Archivos de este plan

Sólo este plan los modifica:

- `src/styles/**` (menos el bloque "combobox" de `controls.css`, que es del plan A) y `src/app/providers/ToastProvider.{tsx,css}`
- `src/shared/components/ui/*` (menos `Modal.tsx`)
- `src/shared/components/forms/{Field,FieldError,PasswordInput,SegmentedControl}.tsx`
- `src/app/layouts/*` (incluido `AppLayout.tsx`), `src/app/router/{ForbiddenPage,RouteErrorPage,SectionPlaceholder}.tsx`, `index.html`, `public/*`
- `src/features/dashboard/components/*`, `src/features/tools/components/*`, los esqueletos y las tablas (`*Table.tsx`, `*Skeleton*.tsx`) de cada módulo
- `src/features/auth/pages/LoginPage.tsx` y `src/features/auth/components/*`
- `src/features/{users,clients,lawyers,legal-params,documents}/pages/*` y sus `components/*`

**No toca** `src/features/cases/pages/*`, `CaseForm`, `CaseEditForm`,
`LegalQualificationPicker`, `src/features/proceedings/pages/*`, `Modal.tsx`
ni nada de `api/`, `utils/`, `schemas/`, `types/`: son del plan A. Si un
arreglo visual necesita un cambio ahí, se pide.

## Primero: terminar la revisión (sin tocar código)

La ola 1 sólo **midió** desbordes con un script. Falta mirar:

| # | Qué | Cómo | Entrega |
|---|---|---|---|
| 1 | Las 13 pantallas y **todos los modales** en 320, 390, 768, 1024, 1366 y 1440 px | Capturas, con los perfiles `fvazquez`, `gestion`, `mrios` y `supervision` | Lista de defectos con gravedad, en un `07-REVISION_VISUAL.md` |
| 2 | Recorrido completo con teclado: orden, foco visible, Escape, trampas | A mano, pantalla por pantalla | Misma lista |
| 3 | Estados de carga, vacío y error de cada pantalla | Con `VITE_MOCK_LATENCY` alto y los errores que explica el README del mock | Misma lista |
| 4 | Consistencia: rótulos de botones, textos de confirmación, avisos, 28 colores escritos a mano fuera de `tokens.css`, contraste | Lectura y capturas | Misma lista |
| 5 | Lector de pantalla en login, alta de causa y registro de acto | NVDA o el del sistema | Misma lista |

Lo que salga de ahí completa la tabla de abajo.

## Tareas ya conocidas, en orden

| # | Tarea | Hallazgo | Archivos | Depende de |
|---|---|---|---|---|
| 1 | **T-35 · La tabla de Causas a 1366 px** hace scroll horizontal (55 px) | H-32 | `src/styles/table.css`, `cases.css`; `cases/components/CasesTable.tsx` | — |
| 2 | **T-20 · Avisos**: los de error no se van solos (o duran más), pausa con el mouse encima, temporizadores cancelados, un solo anuncio para lector de pantalla, clases `vz-toast*` | H-04 | `ToastProvider.tsx`, `ToastProvider.css` → `src/styles/feedback.css` | Hay tests que esperan que el aviso desaparezca: se actualizan en la misma tanda |
| 3 | **T-21 + T-22 · Rail y campana**: ítems como enlaces, menú del teléfono con el fondo inerte y el foco adentro; la campana sólo si hace algo | H-07, H-08 | `ui/AppShell.tsx`, `layouts/AppLayout.tsx`, `styles/shell.css` | Decisión 2. Los tests de `AppLayout` buscan botones: se actualizan en la misma tanda |
| 4 | **T-31 · Controles de menos de 32 px** en el teléfono | H-25 | `controls.css`, `cases.css` | — |
| 5 | **T-36 · Filtros de Inicio** con 4 px de scroll en el teléfono | H-33 | `dashboard.css` | — |
| 6 | **T-32 · La marca en el login del teléfono** | H-26 | `login.css`, `LoginPage.tsx` | — |
| 7 | **T-30 · Cortes de pantalla**: dejar los que existen (640, 720, 860, 1023, 1180) listados en un comentario de `tokens.css`, y arreglar lo que falle en la revisión | H-13 | `src/styles/*` | La revisión |
| 8 | **T-34 · Fuentes**: `<link>` y `preconnect` en `index.html`, fuera del `@import` | H-23 | `index.html`, `styles/index.css` | — |
| 9 | **T-33 · Título de la pestaña por pantalla** | H-20 | Un hook nuevo en `shared/hooks/` y una línea en cada página | **Al final**: toca páginas del plan A; se coordina el momento |

## Lo que este plan recibe del plan A

- **Modales** (`Modal.tsx`): el plan A cambia cómo se cierran (T-13). Cuando
  esté, revisarlos en el teléfono: alto, scroll interno, teclado abierto.
- **Selector con filtro** (`SearchSelect`): es nuevo y del plan A. Revisar
  cómo se ve a 320 px y adentro de un modal cuando esté conectado.

## Antes de dar por cerrada cada tanda

`npm run lint`, `npx tsc -b` y `npx vitest run`, además de mirar el
navegador. Los tests encuentran los elementos **por su texto y su rol**: un
botón renombrado o un `<button>` que pasa a `<a>` rompe tests. El que lo
rompe lo arregla en la misma tanda y avisa.

## Decisiones del equipo que frenan tareas de este plan

- **Campana de notificaciones** (H-08): ¿se saca de producción? Frena T-22.
- **Cierre de un modal con datos cargados** (H-05): ¿confirmar, no cerrar con
  clic afuera, o dejar? La opinión es de este plan; la implementa el A.
- **Prettier**: si se agrega, es antes de empezar y reescribe casi todos los
  archivos de los dos planes.
