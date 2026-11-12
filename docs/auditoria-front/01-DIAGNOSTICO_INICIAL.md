# Diagnóstico inicial del frontend (Fase 1)

12/11/2026 · rama `feat/auditoria-front` · sin modificar código.

Las rutas son relativas a `frontend/`. Cada hallazgo dice cómo se comprobó:
**leído** (en el código), **medido** (con un comando o en el navegador),
**corrido** (se ejecutó) o **sin verificar** (hipótesis a confirmar).

## 0. Resumen

El frontend está **mejor armado que el promedio de un proyecto de este
tamaño**: módulos con frontera clara, cero imports cruzados por adentro de
otro módulo, cero `any`, cero `@ts-ignore`, cero `dangerouslySetInnerHTML`,
tipos estrictos, 651 tests y un manejo de sesión pensado con cuidado. No se
encontró ningún problema **CRÍTICO** en el reconocimiento.

Lo que sí hay:

- **3 hallazgos ALTOS**: la sesión no se sincroniza entre pestañas (H-01),
  los desplegables de alta de causa cortan en 100 opciones (H-03) y una
  calificación fuera de esas 100 se muestra como dada de baja (H-28).
- **15 MEDIOS**: un test rojo, avisos que duran 2 s aunque sean errores,
  formularios que se pierden al cerrar un modal, accesibilidad del rail,
  autorización en dos fuentes, páginas de 500–600 líneas, breakpoints sin
  sistema, documentación que se contradice.
- **12 BAJOS**: dependencia sin uso, formato inconsistente, título de pestaña
  fijo, detalles visuales.

| Gravedad | Cantidad |
|---|---|
| CRÍTICO | 0 |
| ALTO | 3 |
| MEDIO | 15 |
| BAJO | 12 |

**Límites de este diagnóstico.** Se leyó completo el núcleo (arranque,
router, sesión, cliente HTTP, caché, shell, modal) y las APIs de causas,
modelos y autenticación. De los módulos de negocio se leyó la estructura, las
APIs y se hicieron búsquedas dirigidas; **no se leyó línea por línea** cada
página ni los 3.750 renglones de CSS. La pasada en el navegador fue con los
mocks, un solo perfil (`fvazquez`, Administrador + Abogado) y un solo ancho
(375 px). No se corrieron los E2E ni el build de producción. Nada de lo
marcado "sin verificar" es todavía un bug.

## 1. Stack

| Capa | Qué | Versión (`package.json`) |
|---|---|---|
| UI | React + TypeScript estricto | 19.2 · TS 6.0 |
| Build | Vite, alias `@` → `src/` | 8.3 |
| Rutas | React Router (data router, pantallas `lazy`) | 8.3 |
| Datos del servidor | TanStack Query | 5.102 |
| HTTP | axios, sólo a través de `src/shared/api/http.ts` | 1.20 |
| Estilos | CSS global propio, clases `vz-*`, tokens `--vz-*`. Sin framework | — |
| Mocks | MSW (service worker), base en memoria | 2.15 |
| Lint | oxlint (sin formateador: no hay Prettier) | 1.81 |
| Tests | Vitest + Testing Library + jsdom; Playwright para E2E | 5.0 · 1.63 |

Sin estado global propio (ni Redux ni Zustand): el estado del servidor vive en
TanStack Query, la sesión y los avisos en dos contextos de React, y el resto
es estado local de cada página. `react-hook-form` está instalado y **nadie lo
importa** (H-16).

Tamaño (`src/`, 39.660 líneas): ~24.100 de aplicación, ~10.700 de mocks
(`src/shared/mocks/`), ~3.750 de CSS (`src/styles/`), ~900 de notas
(`CAMBIOS.md` por módulo).

## 2. Mapa de arquitectura

```
index.html ── pantalla de carga estática (vz-boot)
   │
src/main.tsx ── si VITE_USE_MOCKS=true: import() dinámico de MSW, y recién después renderiza
   │
src/App.tsx
   QueryProvider ─ queryClient único (shared/api/queryClient.ts): staleTime 60 s, reintenta sólo red y 5xx
     ToastProvider ─ avisos (useToast)
       AuthProvider ─ sesión, renovación de token, sincronización de roles
         RouterProvider (app/router/index.tsx)
           LowercasePath
           ├─ RedirectIfSession → AuthLayout → /login
           └─ RequireSession
               ├─ AppLayout (rail + barra superior)
               │    └─ RequireAccess (ROUTE_ACCESS por rol)
               │         └─ 13 pantallas lazy (app/router/pages.ts)
               └─ * → NotFoundLayout
```

### Capas y reglas entre carpetas

| Carpeta | Rol | Puede importar de |
|---|---|---|
| `src/app/` | Composición: proveedores, router, guardas, marcos, permisos (`access/`) | `features/*` (páginas y sesión), `shared/` |
| `src/features/<módulo>/` | Un módulo de negocio. Adentro: `api/`, `components/`, `pages/`, `schemas/`, `types/`, `utils/`, `index.ts` | `shared/`, `app/providers` (contextos), y **sólo el `index.ts`** de otro módulo |
| `src/shared/` | Kernel: `api/` (HTTP, errores, caché), `components/{ui,forms}`, `hooks/`, `lib/`, `mocks/` | Nada de `features/` (con una excepción, abajo) |
| `src/styles/` | CSS global: tokens, base, shell, controles, tabla, feedback, y una hoja por pantalla grande | — |
| `src/api-contract/` | `envelopes.ts`: `ApiItem<T>`, `ApiList<T>` | — |

Comprobado con búsqueda: ningún módulo importa de las carpetas internas de
otro (**medido**). La regla se cumple.

Excepciones a la regla, las dos deliberadas y comentadas en el código:

- `app/access/access.ts:1` y `app/providers/AuthProvider.tsx:11-21` importan
  tipos y utilidades de `features/auth/` por ruta interna (`auth` no publica
  `index.ts`).
- `features/auth/utils/sessionStorage.ts:1` importa `TOKEN_KEY` de
  `shared/api/http.ts`, y `http.ts:309` lee el token de `localStorage`
  directo: el kernel conoce la clave de la sesión.

### Dependencias entre módulos (por `index.ts`)

```
proceedings → cases, legal-params
cases       → clients, legal-params, lawyers, documents
dashboard   → cases, legal-params
documents   → legal-params
users       → lawyers
app/layouts → auth (modales), deadlines (campana)
```

Una sola dirección, sin ciclos. `legal-params` y `lawyers` son las hojas de
las que más módulos dependen: cambiar lo que publican repercute en casi todo.

### Flujo de un dato

`página` → hook de `api/` (`useQuery`/`useMutation`) → función de `*.api.ts`
(saca el envoltorio `{ data }`) → `http` (axios) → interceptor de pedido pone
`Authorization` → respuesta, o interceptor de error que arma un `ApiError`
(`shared/api/ApiError.ts`) con `status`, `code`, `message`, `details`.

Cada mutación resuelve su caché (`invalidateQueries` por clave de
`*.keys.ts`). La página traduce `details` a errores de campo con el
`toFormErrors` de su módulo. Los formularios son controlados (`values` +
`onChange`), validados por funciones de `schemas/` — no hay librería de
formularios ni de esquemas.

### Sesión y autenticación

- Login → `accessToken` (15 min) + cookie de renovación `HttpOnly` (7 días).
- El token y el usuario se guardan en `localStorage` (`vz.token`,
  `vz.session`; `features/auth/utils/sessionStorage.ts:131`).
- Un `401 UNAUTHENTICATED` en cualquier pedido renueva **una sola vez**
  (`http.ts:206`, `renewOnce`) y reintenta; si no puede, cierra sesión.
- Entre pestañas, la renovación va adentro de un `navigator.locks`
  (`features/auth/utils/renewalLock.ts`) porque el backend rota la cookie y
  revoca la sesión si ve una usada dos veces.
- Un `403 FORBIDDEN` dispara una renovación para traer los roles actuales
  (`AuthProvider.tsx:221`).
- Al abrir la app con sesión guardada se renueva antes de mostrar nada
  (`AuthProvider.tsx:258`, "Verificando la sesión").
- Cerrar sesión borra el almacenamiento y **toda** la caché
  (`AuthProvider.tsx:99`).
- Los permisos son dos tablas por rol en `app/access/access.ts`:
  `ROUTE_ACCESS` (qué pantallas) y `ACTION_ACCESS` (qué acciones).

## 3. Módulos y funcionalidades

| Módulo | Ruta | Qué hace | Líneas aprox. | Tests |
|---|---|---|---|---|
| `auth` | `/login` | Login, cambiar contraseña, cerrar sesión | 1.160 | componentes + unit |
| `dashboard` | `/inicio` | Tableros "Mi día" (abogado) y "Estudio" (administrador): vencimientos, agenda del mes, alertas de prescripción, carga del equipo | 1.340 | 3 archivos |
| `cases` | `/causas`, `/causas/nueva`, `/causas/:caseId`, `/causas/:caseId/expediente` | Listado con filtros, alta, detalle (prescripción, línea de vida, carpeta de Drive, documentos, acto interruptivo, marcar prescripta, modificar, dar de baja), generar expediente PDF | **8.770** | 14 archivos de componentes + unit |
| `proceedings` | `/causas/:caseId/acto[/:actId]` | Registrar y modificar acto procesal, con vista previa del plazo | 1.600 | sí |
| `clients` | `/clientes` | Listado y alta | 770 | sí |
| `lawyers` | `/abogados` | Listado, alta y modificación | 830 | sí |
| `users` | `/usuarios` | ABM de usuarios | 1.420 | sí |
| `legal-params` | `/estados-y-plazos`, `/calificaciones-legales` | ABM de estados procesales y de calificaciones legales | 2.190 | sí |
| `documents` | `/modelos` | Modelos formales por fuero: alta con archivo y descarga | 950 | sí |
| `tools` | `/herramientas` | Accesos directos a sitios externos (catálogo fijo) | 430 | unit |
| `deadlines` | — | Sin pantallas: sólo el atajo de desarrollo de la campana | 56 | — |

`cases` es más de un tercio del código de aplicación y donde se cruzan casi todas las
reglas de negocio.

### Flujos principales

1. **Entrar**: `/login` → según roles, `/inicio` o `/causas` (`homeRoute`,
   `access.ts:48`). Si la sesión venció, se vuelve a la pantalla en la que se
   estaba (`RequireSession`).
2. **Registrar causa**: `/causas/nueva` → cliente (o "Registrar cliente
   nuevo" en un modal), fuero, datos del fuero, calificaciones, responsable,
   carpeta → detalle de la causa. Tiene borrador en `sessionStorage`
   (`features/cases/utils/caseDraft.ts`).
3. **Mover una causa**: detalle → "Registrar acto procesal" (sólo el
   responsable) → vista previa del plazo desde el servidor → vuelve al detalle
   con estado y plazo nuevos (`refreshCaseAfterAct`).
4. **Prescripción**: barra en el detalle, acto interruptivo, "Marcar
   prescripta" por causa o por calificación.
5. **Expediente**: detalle → "Generar expediente" → elegir y ordenar
   documentos de Drive → PDF → descargar o imprimir. Única pantalla con aviso
   de salida (`useBlocker`, `GenerateCaseFilePage.tsx:331`).
6. **ABM de catálogos**: tabla paginada + modal de alta/modificación + modal
   de baja, el mismo patrón en usuarios, abogados, clientes, estados y
   calificaciones.

## 4. Resultado de las verificaciones automáticas

| Qué | Comando | Resultado (12/11/2026) |
|---|---|---|
| Lint | `npm run lint` | 0 errores, 1 warning: `react(only-export-components)` en `src/shared/components/ui/Icon.tsx:2` (conocido) |
| Tipos | `npx tsc -b` | Limpio |
| Unitarios y componentes | `npx vitest run` | **650 pasan, 1 falla** de 651 (102 archivos, 57 s). Ver H-02 |
| E2E | `npm run test:e2e` | **No se corrieron** |
| Build de producción | `npm run build` | **No se corrió**; el `dist/` local es viejo. El tamaño del bundle queda sin medir |
| Consola en el navegador | 14 rutas con mocks | Sin errores ni warnings de React |
| Desborde horizontal a 375 px | script en el navegador, 14 rutas | 0 px en todas |

## 5. Hallazgos

### ALTO

**H-01 · La sesión no se sincroniza entre pestañas.** *(leído; falta
reproducir)*
`AuthProvider` lee `localStorage` una sola vez al montarse
(`src/app/providers/AuthProvider.tsx:42`) y no escucha el evento `storage`
(búsqueda en todo `src/`: no hay ningún `addEventListener('storage'`). Pero
el cliente HTTP lee el token de `localStorage` **en cada pedido**
(`src/shared/api/http.ts:309`). Dos consecuencias:

- Cerrar sesión en la pestaña A no saca a la pestaña B: sigue mostrando
  datos de la caché hasta el próximo pedido que vuelva con 401.
- Si en A sale un usuario y entra otro, B conserva el rail, los permisos y la
  caché del primero, pero sus pedidos viajan con el token del segundo: una
  pantalla de un usuario operando con la identidad de otro. En una máquina
  compartida del estudio es un escenario real.

`tests/components/auth/sessionSync.test.tsx` existe pero no menciona
`storage`: cubre otra cosa. Área: A. Archivos: `AuthProvider.tsx`,
`sessionStorage.ts`.

**H-03 · Los desplegables cortan en 100 opciones, sin aviso.** *(leído)*
El alta de causa pide clientes, abogados y calificaciones con
`limit: OPTIONS_LIMIT` = 100 (`src/features/cases/pages/RegisterCasePage.tsx:86`
y `:134-136`); lo mismo "Modificar causa" (`api/useCaseEdit.ts:22`), los
filtros del listado (`pages/CasesPage.tsx:35`), los estados del acto
(`src/features/proceedings/pages/RegisterProceduralActPage.tsx:52`) y la
ficha del abogado en Usuarios (`src/features/users/pages/UsersPage.tsx:101`).
Cuando el estudio pase los 100 clientes, **el cliente 101 no se puede elegir
al registrar una causa** y nada lo avisa. Para abogados y estados el tope es
lejano; para clientes, no. Falta confirmar si `GET /clients` acepta `search`
para resolverlo con un buscador del lado del servidor sin tocar el contrato.
Área: A (datos) con B (el control). Archivos: los cinco citados.

### MEDIO

**H-02 · Un test rojo.** *(corrido)*
`tests/components/app/RouteErrorPage.test.tsx:109` espera "No se pudo cargar
esta pantalla" y recibe "Sin conexión… Esperando conexión…". La pantalla lee
`navigator.onLine` (`src/app/router/RouteErrorPage.tsx:72`) y el test no lo
fija. Causa sin confirmar: puede ser el entorno de esta corrida o un test
anterior del archivo que deja el valor cambiado. Hay que correrlo aislado y
tres veces antes de decidir. Área: A.

**H-04 · Los avisos duran 2 segundos, también los de error.** *(leído)*
`src/app/providers/ToastProvider.tsx:15`: un `setTimeout` fijo de 2000 ms
para todos los tipos, sin pausa al pasar el mouse ni al enfocar. Un error del
servidor con un mensaje de dos renglones no se llega a leer. Además: el
temporizador no se cancela si el aviso se cierra a mano; cada aviso es
`role="alert"` adentro de una región `aria-live="polite"` (`:21-23`, doble
anuncio en lector de pantalla); y sus clases (`toast`, `toasts`) y su CSS
(`ToastProvider.css`, al lado del componente) son lo único del proyecto fuera
de la convención `vz-*` / `src/styles/`. Área: B (con A por el temporizador).

**H-05 · Un modal con datos cargados se cierra sin preguntar.** *(leído;
falta probar)*
`Modal` se cierra con Escape (`src/shared/components/ui/Modal.tsx:64`) y con
un clic en el fondo (`:140`), y `FormModal` le pasa `onCancel` directo. Un
alta de usuario o de cliente a medio llenar se pierde con un clic afuera. Lo
mismo en páginas: sólo "Generar expediente" avisa al salir
(`GenerateCaseFilePage.tsx:331`) y sólo el alta de causa guarda borrador;
"Registrar acto procesal" no tiene ninguna de las dos. Área: B (decisión de
UX) + A (implementación).

**H-06 · Modales apilados comparten Escape y trampa de foco.** *(leído; sin
verificar)*
Cada `Modal` registra su `keydown` en `document` (`Modal.tsx:101`). Con dos
abiertos (por ejemplo "Modificar causa" y, encima, el alta de una
calificación), un Escape cierra los dos y las dos trampas de foco compiten.
Hay que confirmar en qué pantallas se apilan de verdad. Área: A.

**H-07 · El rail no es navegación para el teclado ni para el navegador.**
*(leído)*
Los ítems son `<button>` que llaman a `navigate`
(`src/shared/components/ui/AppShell.tsx`, bloque `vz-rail__item`): no se
pueden abrir en otra pestaña ni copiar como enlace, y un lector de pantalla
no los anuncia como enlaces. En el teléfono, el menú abierto no atrapa el
foco ni deja inerte el fondo (sólo bloquea el scroll): con Tab se llega a lo
que está detrás del velo (`.vz-scrim`, `:108`). Área: B.

**H-08 · La campana de "Notificaciones" está a la vista de todos y no hace
nada.** *(leído y visto)*
`src/app/layouts/AppLayout.tsx:169-172`: en producción `onClick` es
`undefined`. Es un control muerto en la barra superior de todas las
pantallas, y el contrato deja las notificaciones afuera (ya anotado en
`frontend/CLAUDE.md`, "Problemas conocidos" 3). Es decisión del equipo, no un
arreglo técnico. Área: B.

**H-09 · Un `403` cualquiera renueva la sesión.** *(leído)*
`http.ts:251` avisa en cada `FORBIDDEN` y `AuthProvider.tsx:221` responde
con una renovación (que rota la cookie). El contrato usa el mismo código para
"no tenés el rol" y "no sos el responsable" (lo dice el comentario de
`AuthProvider.tsx:217`), así que un abogado que intenta operar una causa
ajena renueva su sesión cada vez. Funciona, pero multiplica el uso del
mecanismo más delicado del sistema. Para inspección profunda, sin tocar por
ahora. Área: A.

**H-10 · La autorización tiene dos fuentes.** *(leído)*
El backend manda `permissions` en la renovación
(`src/features/auth/types/session.ts:101`; en el mock llegan
`procedural-state:manage`, `user:manage`, …) y el front no los usa: decide con
sus propias tablas por rol (`src/app/access/access.ts:10` y `:66`). Si el
backend cambia qué puede un rol, el front no se entera. Hay que decidir cuál
manda. Área: A.

**H-11 · Timeout de 15 s para subir y bajar archivos.** *(leído; sin
verificar)*
El tope global (`http.ts:153`) vale para la subida de un modelo
(`src/features/documents/api/documentTemplates.api.ts:25`) y las descargas
(`src/features/cases/api/cases.api.ts:124`, `:161`). Sólo el expediente lo
amplía (`:134`). Un archivo pesado con conexión lenta se corta con "El
servidor tardó demasiado". Falta medir con el backend real. Área: A.

**H-12 · Páginas que hacen de todo.** *(medido por tamaño; falta leer)*
`RegisterCasePage.tsx` (599 líneas, 9 `useState`), `CaseDetailPage.tsx`
(527), `CaseForm.tsx` (511), `CaseFileDocumentsPanel.tsx` (407),
`UsersPage.tsx` (394), `ProceduralStatesPage.tsx` (364),
`LegalQualificationsPage.tsx` (320). Las cinco páginas de ABM repiten el
mismo armado (lista + filtros + modal + baja + avisos) y hay **10 archivos
`to…FormErrors.ts`** casi con la misma forma. `useCaseEdit` ya mostró el
camino (un hook que orquesta y dos pantallas que lo comparten). Hay que leer
antes de proponer: extraer por extraer no es un beneficio. Área: A.

**H-13 · Breakpoints sin sistema.** *(medido)*
En `src/styles/`: 720 px (13 veces), 1180 (4), 1023 (3), 860 (2), 640 (1); y
en JavaScript, 1024 (`AppShell.tsx:46`). No son tokens (CSS no deja usar
variables en `@media`, pero tampoco están listados en un solo lugar del
código). **No hay ningún corte por debajo de 640 px**: 375 px anduvo bien en
las 14 rutas; **320 px no se probó**. Tampoco 768, 1024, 1366 ni 1440. Área:
B.

**H-14 · Una fecha de negocio calculada en el front.** *(leído; sin
verificar)*
`estimatedExpiry` (`src/features/cases/utils/prescription.ts:199-202`) suma
meses con `new Date(año, mes + meses, día)` para el resumen del alta
(`RegisterCasePage.tsx:270`). Con un hecho del día 29, 30 o 31, JavaScript
desborda al mes siguiente y puede no coincidir con lo que después calcula el
backend. Es sólo una estimación en pantalla, pero el principio del proyecto
es "el backend calcula, el cliente muestra". Falta comparar contra
`summarizePrescription` del backend. Área: A.

**H-15 · Documentación que se contradice.** *(leído)*
Detalle en el [README](README.md), "Documentación desactualizada". Lo más
importante: el `CLAUDE.md` raíz dice que el contrato vigente es V5 y el del
front, V6. Área: ninguna de las dos; lo resuelve el equipo.

### BAJO

| Id | Qué | Evidencia | Área |
|---|---|---|---|
| H-16 | `react-hook-form` instalado y sin uso | `package.json`; ninguna importación en `src/` (el `CLAUDE.md` del front lo da como decisión pendiente) | A |
| H-17 | Sin formateador: conviven 2 y 4 espacios, con y sin `;`, comillas simples y dobles | `src/App.tsx` (dobles, imports relativos) contra el resto; `Modal.tsx` y `AppShell.tsx` con `;` | A |
| H-18 | Imports relativos que la regla del alias prohíbe; imports comentados | `src/shared/components/forms/FieldError.tsx:1`, `FormModal.tsx:2`, `src/App.tsx:2-5`; `src/main.tsx:3-4` | A |
| H-19 | Carpetas vacías con `.gitkeep` | `src/domain/`, `src/shared/types/`, `src/shared/components/feedback/`, y varias en `features/{clients,deadlines,tools,dashboard}` | A |
| H-20 | El título de la pestaña es siempre "VZ Causas" | Ningún `document.title` en `src/`; con cinco pestañas abiertas no se distinguen | B |
| H-21 | `/reportes` en `ROUTE_ACCESS` y en el rail (oculto), sin ruta | `access.ts:23`, `AppLayout.tsx:67`. Es HU43, del Sprint 5 | A |
| H-22 | `useUpdateLawyer` invalida toda la caché | `src/features/lawyers/api/useUpdateLawyer.ts:31`. Deliberado (CA-14.2), pero vuelve a pedir todo lo que esté en pantalla | A |
| H-23 | Fuentes de Google por `@import` dentro del CSS | `src/styles/index.css`: pedido encadenado y bloqueante, sin `preconnect`, y dependencia de un tercero para dibujar texto | B (perf) |
| H-24 | Los mocks salen en el build | `dist/assets/browser-*.js` (import dinámico de `main.tsx:21`) y `public/mockServiceWorker.js`. No se cargan sin `VITE_USE_MOCKS`, pero se publican. Sin medir en un build nuevo | A |
| H-25 | Controles de menos de 32 px de alto en el teléfono | Medido a 375 px: 7 en el detalle, en el alta y en "Generar expediente"; 3 en Inicio y en el acto | B |
| H-26 | El login en el teléfono no muestra la marca | Visto a 375 px: sólo título y formulario; `LoginAside` desaparece entera | B |
| H-27 | `saveFile` libera la URL del archivo en el mismo tick | `src/shared/lib/saveFile.ts:18` (`setTimeout(…, 0)`). En Chrome anda; sin probar en Firefox ni Safari | A |

Otros dos puntos para tener a mano, que no son hallazgos sino decisiones ya
tomadas: el token de acceso en `localStorage` (cualquier script inyectado lo
lee; lo acota que dura 15 minutos, que la cookie de renovación es `HttpOnly`
y que no hay `dangerouslySetInnerHTML` ni `innerHTML` en `src/`), y el
secreto `VITE_INTERNAL_TRIGGER_SECRET` de la campana
(`src/features/deadlines/api/deadlines.api.ts`), que se lee sólo en `DEV`
para que Vite lo descarte del build — **hay que confirmarlo buscando el
valor en un `dist/` recién generado**.

## 6. Lo que está bien y no hay que romper

- Frontera entre módulos por `index.ts`, sin excepciones.
- Renovación única con candado entre pestañas (`http.ts:206`,
  `renewalLock.ts`). Es la pieza más delicada: quien la toque tiene que leer
  antes `AuthProvider.tsx` entero y `tests/components/auth/tokenRenewal.test.tsx`.
- Mutaciones sin reintento (`queryClient.ts:31`): evita registros duplicados.
- Fechas sin hora tratadas como texto (`shared/lib/dates.ts`), nunca
  `new Date('YYYY-MM-DD')`.
- `Modal`: foco al abrir, devolución al cerrar, trampa de Tab, bloqueo de
  scroll, y no se cierra al soltar una selección de texto sobre el fondo.
- Pantallas `lazy` con precarga al apuntar al rail (`pages.ts:78`).
- Tablas que en el teléfono pasan a tarjetas (visto en `/causas`).
- `prefers-reduced-motion` respetado en 7 lugares.
- Enlaces externos sólo en 4 archivos, todos identificados.

## 7. Archivos sensibles

Un cambio acá repercute en toda la aplicación. **Un solo dueño por vez** y
tests corridos completos después de tocarlos.

| Archivo | Por qué |
|---|---|
| `src/shared/api/http.ts` | Todo pedido pasa por acá; renovación, 401, 403, errores |
| `src/app/providers/AuthProvider.tsx` | Sesión, candado, sincronización de roles |
| `src/features/auth/utils/sessionStorage.ts` | Qué se guarda y cómo se valida |
| `src/shared/api/queryClient.ts` | Reintentos y frescura de toda la caché |
| `src/app/access/access.ts` | Permisos de rutas y acciones; lo leen el rail, las guardas y las páginas |
| `src/app/router/index.tsx`, `pages.ts` | Árbol de rutas y carga diferida |
| `src/shared/components/ui/Modal.tsx`, `forms/FormModal.tsx` | Todos los diálogos |
| `src/shared/components/ui/AppShell.tsx`, `src/app/layouts/AppLayout.tsx` | El marco de todas las pantallas |
| `src/shared/components/ui/DataTable.tsx` | Todas las tablas y su versión de teléfono |
| `src/styles/tokens.css`, `base.css`, `controls.css`, `table.css`, `shell.css`, `feedback.css` | CSS global: una regla cambia todas las pantallas |
| `src/features/cases/api/cases.keys.ts`, `refreshCaseAfterAct.ts` | De estas claves cuelga la invalidación de causas, línea de vida y filtros |
| `src/features/cases/types/case.ts` (441 líneas) | Tipos que consumen `proceedings` y `dashboard` |
| `src/features/*/index.ts` | La superficie pública de cada módulo |
| `src/shared/mocks/handlers.ts` (3.904), `db.ts`, `fixtures.ts` | Los tests de componentes y los E2E dependen de las semillas: cambiar una causa semilla rompe tests de otros |
| `index.html` | La pantalla de carga duplica colores y duraciones de `tokens.css` y `BootScreen.tsx`; un test verifica que coincidan |

## 8. Inventario de lo que falta auditar

Ordenado por lo que más puede esconder. ☐ = sin empezar.

**Técnica y funcional**

- ☐ Reproducir H-01 con dos pestañas y dos usuarios.
- ☐ Correr `RouteErrorPage.test.tsx` aislado (H-02) y los E2E completos.
- ☐ Build de producción: tamaño por chunk, qué entra de mocks, y buscar el
  secreto de la campana en `dist/`.
- ☐ `cases`: leer completas `RegisterCasePage`, `CaseDetailPage`,
  `GenerateCaseFilePage`, `useCaseEdit`, `caseDraft` (¿el borrador se limpia
  al registrar? ¿qué pasa con dos pestañas en el alta?).
- ☐ Invalidación de caché mutación por mutación: qué queda viejo después de
  cada alta, modificación y baja (29 hooks de mutación).
- ☐ Carreras: doble clic en "Guardar", respuesta que llega después de salir
  de la pantalla, sondeo de la carpeta (`useCase.ts:25`) al cambiar de causa.
- ☐ Paginación en los bordes: borrar la última fila de la última página,
  filtros que dejan la página fuera de rango.
- ☐ Errores: cada pantalla con 500, sin red, 404 de una causa dada de baja,
  429 con `Retry-After`.
- ☐ Los tres perfiles (`gestion`, `mrios`, `supervision`): qué ve y qué
  puede cada uno contra la tabla de permisos del contrato.
- ☐ Fechas: H-14, la agenda del mes del tablero en cambio de mes y de año,
  "Hoy"/"Ayer" de `formatLastLogin`.
- ☐ `npm audit` (no se corrió).
- ☐ Contra el backend real, no sólo el mock: al menos login, renovación,
  subida de modelo y expediente.

**Visual y experiencia**

- ☐ Las 14 pantallas en 320, 390, 768, 1024, 1366 y 1440 px, con capturas.
- ☐ Todos los modales en el teléfono (alto, scroll interno, teclado abierto).
- ☐ Recorrido completo sólo con teclado: orden de foco, foco visible
  (`:focus-visible` aparece en 5 hojas; falta ver que alcance a todo),
  Escape, trampas.
- ☐ Contraste de los tokens (`tokens.css`) en texto atenuado, chips y botones
  deshabilitados.
- ☐ Estados de carga, vacío y error de cada pantalla, uno por uno.
- ☐ Consistencia: rótulos de botones, textos de confirmación, formato de
  avisos, 28 colores escritos a mano fuera de `tokens.css`.
- ☐ Formularios: errores por campo, foco al primer error, campos de fecha
  (siguen el idioma del navegador: conocido, `frontend/CLAUDE.md` punto 6).
- ☐ Lector de pantalla en los flujos 1 a 3.

## 9. Agregado de la segunda pasada (12/11/2026)

A pedido se revisaron los selectores de "Registrar causa" y "Modificar
causa". El detalle y la evidencia están en [03-PLAN.md](03-PLAN.md), §0.

| Id | Gravedad | Qué | Evidencia | Área |
|---|---|---|---|---|
| H-28 | ALTO | Una calificación legal que no entra en las primeras 100 por nombre se muestra como "Calificación dada de baja" y bloquea el alta; le pasa a una recién registrada que cae después de la 100, y a una causa existente al abrir "Modificar causa" *(leído; falta reproducir)* | `src/features/cases/pages/RegisterCasePage.tsx:208-214`, `:317`; `src/features/cases/api/useCaseEdit.ts:94-109` | A |
| H-29 | MEDIO | Cliente y calificaciones se eligen en un `<select>` nativo: no se puede escribir para filtrar *(leído)* | `src/features/cases/components/CaseForm.tsx:236`; `LegalQualificationPicker.tsx` | B + A |
| H-30 | MEDIO | "Modificar causa" no ofrece "Registrar calificación nueva" *(leído)* | `src/features/cases/components/CaseEditForm.tsx:218-227` | A |

Registrar un cliente desde "Modificar causa" **no es un hallazgo**: el
cliente de una causa no se modifica por contrato (D-111).

## 10. Correcciones después de la ola 1 (12/11/2026)

La ola 1 reprodujo varios hallazgos y corrigió otros. El detalle está en
[04-OLA1_RESULTADOS.md](04-OLA1_RESULTADOS.md); donde este documento y ese no
coinciden, **manda ese**. Lo principal: H-28 ocurre sólo en el alta (en
"Modificar causa" no); H-02 es un test intermitente; H-06 hoy no tiene dónde
ocurrir; y se suman H-31, H-32 y H-33. Con eso el conteo queda en 0 críticos,
3 altos, 16 medios y 14 bajos.
