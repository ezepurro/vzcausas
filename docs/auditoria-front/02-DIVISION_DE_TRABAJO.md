# División de trabajo: dos áreas

Rutas relativas a `frontend/`. Los hallazgos (`H-xx`) son los de
[01-DIAGNOSTICO_INICIAL.md](01-DIAGNOSTICO_INICIAL.md).

La app no se parte por carpetas en "lógica" y "vista": cada pantalla tiene las
dos cosas en el mismo `.tsx`. La división que evita pisarse es **por tipo de
archivo**, con una lista corta de compartidos que se tocan de a uno.

| | A · Técnica y funcional | B · Visual y experiencia |
|---|---|---|
| Pregunta | ¿Hace lo correcto, siempre? | ¿Se entiende, se ve bien y se puede usar en cualquier pantalla y con teclado? |
| Mira | Estado, caché, sesión, permisos, errores, carreras, fechas, contrato, tests, build | Layout, responsive, consistencia, feedback, carga/vacío/error, foco, ARIA, contraste, textos |
| Herramientas | Lectura de código, Vitest, Playwright, pestaña Network, dos pestañas y tres perfiles | Navegador en 6 anchos, teclado, lector de pantalla, capturas |

## Área A — archivos propios

Nadie de B los modifica.

| Grupo | Archivos |
|---|---|
| Arranque y composición | `src/main.tsx`, `src/App.tsx`, `src/app/providers/{AuthContext.ts,AuthProvider.tsx,QueryProvider.tsx,ToastContext.ts}` |
| Rutas y permisos | `src/app/router/{index.tsx,pages.ts,RequireSession.tsx,RequireAccess.tsx,RedirectIfSession.tsx,HomeRedirect.tsx,LowercasePath.tsx,chunkError.ts,useGoBack.ts}`, `src/app/access/*` |
| Kernel de datos | `src/shared/api/*`, `src/api-contract/*` |
| Utilidades | `src/shared/lib/*`, `src/shared/hooks/{useDebouncedValue,useCountdown}.ts` |
| Datos de cada módulo | `src/features/*/api/**`, `src/features/*/types/**`, `src/features/*/schemas/**`, `src/features/*/utils/**`, `src/features/*/index.ts`, `src/features/dashboard/hooks/*` |
| Mocks | `src/shared/mocks/**`, `public/mockServiceWorker.js` |
| Tests y herramientas | `tests/unit/**`, `tests/e2e/**`, `tests/setup/**`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig*.json`, `.oxlintrc.json`, `package.json`, `scripts/*`, `Dockerfile` |

Hallazgos de A: H-01, H-02, H-03 (la parte de datos), H-06, H-09, H-10,
H-11, H-12, H-14, H-16 a H-19, H-21, H-22, H-24, H-27.

## Área B — archivos propios

Nadie de A los modifica.

| Grupo | Archivos |
|---|---|
| CSS | `src/styles/**` (las 13 hojas), `src/app/providers/ToastProvider.css` |
| Componentes de presentación | `src/shared/components/ui/{Avatar,Breadcrumbs,Button,CollapsibleFilters,DetailList,Icon,IconButton,Logo,Meter,PageHeader,Pagination,Panel,Pill,RailUser,SearchInput,Skeleton,Tabs}.tsx`, `src/shared/components/forms/{Field,FieldError,PasswordInput,SegmentedControl}.tsx` |
| Marcos y pantallas sin datos | `src/app/layouts/{AuthLayout,BootScreen,NotFoundLayout,NavigationProgress}.tsx`, `src/app/router/{ForbiddenPage,RouteErrorPage,SectionPlaceholder}.tsx`, `index.html`, `public/favicon.svg`, `public/tools/*` |
| Componentes de módulo sólo de presentación | Los esqueletos (`CaseSkeletons`, `DashboardSkeleton`, `DocumentTemplatesSkeleton`, `ProceduralActFormSkeleton`), todo `src/features/tools/components/*`, `src/features/auth/components/LoginAside.tsx`, `src/features/dashboard/components/*` (reciben los datos hechos), `src/features/cases/components/{CaseHeader,CaseFacts,CaseQualifications,ClientCard,PrescriptionBar,CasePrescriptionBar,CaseSummaryAside}.tsx`, las tablas (`*Table.tsx`) |
| Hooks de interacción | `src/shared/hooks/{useHoverIntent,useFocusFirstError}.ts`, `src/shared/lib/focusFirstError.ts` |

Hallazgos de B: H-04, H-05 (la decisión), H-07, H-08, H-13, H-20, H-23,
H-25, H-26, y H-03 (el control del desplegable).

## Compartidos — se piden antes de tocar

Tienen lógica y presentación en el mismo archivo. **Regla:** el que lo
necesita lo avisa, lo toca, corre los tests y lo libera; no se abren dos
ramas sobre el mismo archivo. Ante la duda, **A tiene prioridad** si el
cambio corrige un bug, y B espera y aplica lo suyo encima.

| Archivo | Lo que le importa a A | Lo que le importa a B | Riesgo |
|---|---|---|---|
| `src/shared/components/ui/Modal.tsx` | Escape y foco con modales apilados (H-06) | Cierre con datos cargados (H-05), tamaño en el teléfono | **Alto**: todos los diálogos |
| `src/shared/components/forms/FormModal.tsx` | Envío, doble clic, foco al error | Pie, botones, estados | **Alto** |
| `src/shared/components/ui/AppShell.tsx` | — | Rail como enlaces, menú del teléfono (H-07) | **Alto**: todas las pantallas |
| `src/app/layouts/AppLayout.tsx` | Permisos del rail, `/reportes` (H-21) | Campana (H-08), barra superior | **Alto** |
| `src/app/providers/ToastProvider.tsx` | Temporizadores | Duración, ARIA, clases (H-04) | Medio: B lo toma entero |
| `src/shared/components/ui/DataTable.tsx` | Paginación, filas vacías | Tarjetas en el teléfono, columnas | **Alto**: 6 tablas |
| `src/shared/components/forms/Combobox.tsx` | Estado interno (3 `useState`), búsqueda del lado del servidor (H-03) | Teclado, ARIA de lista | Medio |
| `src/features/*/pages/*.tsx` (13 páginas) | Hooks, estado, mutaciones, errores | Estructura, textos, estados de carga y vacío | **Alto** en `cases/pages/*`; medio en el resto |
| `src/features/cases/components/{CaseForm,CaseEditForm,LegalQualificationPicker,CaseTimeline,CaseFolderCard,CaseDocumentsCard,CaseFilters}.tsx`, `CaseFile*.tsx`, `CoverPreviewModal.tsx`, los modales de acción | Validación, permisos por causa, descargas | Disposición, responsive, feedback | **Alto** |
| `src/features/proceedings/components/{ProceduralActForm,DeadlinePreviewAside}.tsx` | Vista previa del plazo, parche | Lectura del cómputo | Medio |
| `src/features/{users,clients,lawyers,legal-params,documents}/components/*FormModal.tsx` y `Delete*Modal.tsx` | Validación y errores del servidor | Campos, ayudas | Bajo: un módulo por vez |
| `src/features/auth/pages/LoginPage.tsx`, `components/{LoginForm,ChangePasswordModal,LogoutConfirmModal}.tsx` | Bloqueo por intentos, 429 | Login en el teléfono (H-26) | Medio |
| `tests/components/**` | Los mantiene A | B avisa si cambia un texto o un rol ARIA que un test busca | **Alto**: los tests buscan por texto y por rol |

### Cómo evitar el choque más probable

Los tests de componentes encuentran los elementos **por su texto y su rol**
(`getByRole('button', { name: 'Recargar' })`). Un cambio visual que renombra
un botón, cambia un `<button>` por un `<a>` (H-07) o mueve un título rompe
tests que mantiene A. Por eso:

1. B corre `npx vitest run` antes de dar por cerrada cualquier tanda, no sólo
   mira el navegador.
2. Un cambio de B que rompe un test se resuelve en la misma tanda (se
   actualiza el test con el cambio), avisando a A.
3. A no toca `src/styles/**`. Si una corrección necesita una clase nueva, se
   la pide a B o la agrega B después.

## Orden sugerido para arrancar

Sin dependencias entre sí, se pueden hacer en paralelo desde el primer día:

| A | B |
|---|---|
| Reproducir H-01 (dos pestañas) y H-02 (test rojo) | Capturas de las 14 pantallas en 6 anchos (H-13) |
| Build de producción y E2E completos | Recorrido con teclado y de foco (H-07) |
| Leer `cases/pages/*` y la invalidación de caché de las 29 mutaciones | Estados de carga, vacío y error pantalla por pantalla |
| Los tres perfiles contra la tabla de permisos | Inventario de inconsistencias (botones, avisos, colores fuera de tokens) |

Después, y recién con el plan de la Fase 2 acordado, los compartidos: primero
`Modal.tsx` (H-05 + H-06, una sola intervención entre los dos), después
`AppShell.tsx`/`AppLayout.tsx` (H-07 + H-08 + H-21).

## Decisiones que necesitan al equipo antes del plan

1. **Contrato vigente**: ¿V5 o V6? (H-15). Define contra qué se audita.
2. **Campana de notificaciones** (H-08): ¿se saca de producción o se deja?
3. **Cierre de modales con datos** (H-05): ¿se pide confirmación, se bloquea
   el clic afuera, o se deja?
4. **Permisos** (H-10): ¿el front pasa a leer `permissions` del backend o
   sigue con sus tablas por rol?
5. **Formateador** (H-17): agregar Prettier reescribe casi todos los
   archivos; si se hace, es un commit aparte y **antes** de empezar las
   correcciones, no en el medio.
