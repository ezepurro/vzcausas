# CLAUDE.md — Frontend de VZ Causas

Sistema de gestión para un estudio jurídico. Este archivo dice **cómo se trabaja
adentro de un módulo** (`src/features/<módulo>/`) y **qué se programa en el
sprint en curso**. El resto ya está documentado: no lo repito, leelo.

## Antes de escribir código, leé

1. `docs/Frontend-Architecture/ESTRUCTURA.md` — el mapa general, las tres reglas entre
   carpetas, los nombres y qué épica corresponde a qué módulo.
2. `docs/Frontend-Architecture/SHARED.md` — todos los componentes compartidos, el
   cliente HTTP y `ApiError`. Tiene la tabla "Si necesitás X, usá Y" y su propia
   guía para Claude al final.
3. `frontend/src/shared/mocks/README.md` — **antes de escribir cualquier
   llamada a la API**. Tiene las divergencias del contrato, cómo disparar cada
   error y cómo agregar un endpoint.
4. `docs/Api-Contract/API_CONTRACT_V3.md` — la fuente de verdad del backend para
   el Sprint 2. Es autocontenido: trae lo del Sprint 1 que sigue vigente y lo
   nuevo. `API_CONTRACT_V2.md` queda como registro del Sprint 1. Si un documento
   y el contrato no coinciden, manda el contrato (salvo lo que dice
   [Decisiones del equipo](#decisiones-del-equipo-que-el-contrato-todavía-no-refleja)).
5. `docs/Frontend-Architecture/TESTING.md` — dónde va cada test y qué mínimo
   tiene que tener una feature.

## Reglas que no se negocian

- **No inventes endpoints.** Si lo que te piden necesita un endpoint que no está
  en el contrato, frená y preguntá. V3 cubre `auth`, `users`, `lawyers`,
  `procedural-states`, `legal-qualifications`, `clients`, `cases` y
  `cases/{caseId}/procedural-acts`, y nada más.
- **No programes lo que el contrato deja afuera del sprint.** V3 §8.3 lista lo
  que el prototipo muestra pero es de otra historia (ciclo de vida, documentación,
  Drive, adjuntos, modificar y dar de baja una causa, etc.). No se dibuja ni
  deshabilitado: no existe hasta su sprint.
- **No traigas código de otros proyectos** (componentes, estilos, hooks). Este
  proyecto tiene su propio sistema de diseño en `shared/` y `styles/`.
- **No mezcles patrones.** Si ya existe una forma de hacer algo, seguila.
- **No uses `react-hook-form` ni instales `zod`.** `react-hook-form` está
  instalado pero nadie lo usa, y `zod` no está instalado. Es una decisión
  pendiente del equipo. Hasta entonces, formularios controlados como
  `FormModal` (`values` + `onChange`).
- **Si el build o el lint fallan por algo que no tocaste, avisá.** No lo
  arregles al paso.
- **Código en inglés** (archivos, tipos, funciones, props, clases CSS).
  **Textos de pantalla y comentarios en castellano**, con el vocabulario del
  estudio: causa, fuero, SAC, carátula, acto procesal. Ver `ESTRUCTURA.md` §8 y
  `docs/TRADUCCION_DOMINIO.md`.
- **Imports siempre con el alias `@`**, nunca con `../../..` para salir del
  módulo.

## Stack instalado

React 19 + TypeScript + Vite · React Router · TanStack Query · axios (sólo a
través de `http`) · MSW (sólo para los mocks) · CSS global con clases `vz-*` y
tokens `var(--vz-*)` · lint con **oxlint**.

---

## Sprint 2 — qué se programa y dónde

Alcance según V3 (D-01): HU 8, 9, 13, 17, 18, 20, 22, 26, 45 y 46, más el ABMC
de calificaciones legales.

| HU | Pantalla | Módulo | Ruta | Estado |
|---|---|---|---|---|
| 8, 9 | Clientes: listado y alta | `clients/` | `/clientes` | Nueva |
| — | Calificaciones legales: listado, alta, modificación y baja | `legal-params/` | `/calificaciones-legales` | Nueva |
| 20 | Causas: listado con filtros | `cases/` | `/causas` | Nueva |
| 18 | Registrar causa | `cases/` | `/causas/nueva` | Nueva |
| 22 | Detalle de causa: encabezado, prescripción y tarjeta del cliente | `cases/` | `/causas/:caseId` | Nueva |
| 26 | Registrar acto procesal | `proceedings/` | `/causas/:caseId/acto` | Nueva |
| 13 | Consultar abogado | `lawyers/` | `/abogados` | Existe. V3: `activeCases` ya es real, y va la barra de carga con `Meter` |
| 17, 45, 46 | Estados procesales | `legal-params/` | `/estados-y-plazos` | Existe. Ajustes de V3, abajo |

Las rutas de causas cuelgan de `/causas`, así que heredan su permiso en
`ROUTE_ACCESS` (`/causas/12` → `/causas`). Falta declarar
`/calificaciones-legales` y agregar su ítem al grupo "Administración" del rail
(`AppLayout`, ícono `qualifications`).

### Qué va en el `index.ts` de cada módulo

Varios módulos necesitan datos de otros. Cada dueño publica **sólo eso** en su
`index.ts` (regla 1 de `ESTRUCTURA.md` §5), y nadie entra a sus carpetas:

| Módulo | Publica | Lo usa |
|---|---|---|
| `lawyers` | `useLawyers` (ya existe) | Registrar causa: "Abogado responsable" |
| `clients` | `useClients`, el formateo del nombre y del DNI, y el modal de alta | Registrar causa: select de cliente y "Registrar cliente nuevo" |
| `legal-params` | `useLegalQualifications`, el formateo de la prescripción, el modal de alta, y `useProceduralStates` | Registrar causa (calificaciones) y Registrar acto (estados del fuero) |
| `cases` | `useCase`, las claves de caché, el encabezado de la causa y la barra de prescripción | Registrar acto: el acto muestra la causa y, al registrarse, invalida sus claves porque la causa cambia de estado |

Las dependencias van en una sola dirección: `proceedings → cases → clients,
legal-params, lawyers`. Si aparece una flecha para el otro lado, algo está en
el módulo equivocado.

### Componentes de `shared` para este sprint

Ya están hechos y documentados en `SHARED.md`. Usalos antes de escribir nada
parecido:

| Para | Usar |
|---|---|
| Migas "Causas / 13284571 / Registrar acto procesal" | `Breadcrumbs` |
| Tarjeta Cliente, Resumen del alta, Cómputo del plazo | `Panel` + `.vz-panel__body` + `DetailList` |
| Barra de prescripción, carga de un abogado | `Meter` |
| Iniciales en la tabla de clientes | `Avatar` + `.vz-table__ident` |
| "Estado procesal al que pasa la causa" (elegir o escribir) | `Combobox` |
| "Rol procesal del cliente" | `SegmentedControl` |
| Filtro de estado con grupos por fuero y "Escritos a mano" | `Select` con `{ group, options }` |
| "Solo con plazo por vencer" | `Button pressed={…}` |
| Formulario de página con panel al costado | `.vz-split` + `.vz-split__aside` |
| Chip de vencimiento y de estado | `Pill` (`danger` vencido/hoy, `warn` ≤ 5 días, `dot="hollow"` sin plazo) |
| Mostrar una fecha del contrato | `formatDate` de `@/shared/lib/dates` |
| Valor por defecto de un campo de fecha | `todayIsoDate()` de `@/shared/lib/dates` |

Los componentes propios de cada pantalla (la tabla de causas, el selector de
calificaciones del alta, el panel "Cómputo del plazo") van en su módulo.

### Lo que ya está hecho y lo que falta

Por módulo ya están los **tipos** (del contrato V3), los **schemas**, las
**utilidades** y los **componentes** presentacionales, con su `index.ts`:

| Módulo | Componentes | Utilidades |
|---|---|---|
| `clients` | `ClientsTable`, `ClientFormModal` | `formatClientName`, `formatDni`, `normalizeDni` |
| `legal-params` | `LegalQualificationsTable`, `LegalQualificationFormModal`, `DeleteLegalQualificationModal` | `formatPrescription`, `toPrescriptionMonths`, `splitPrescription`, `shortQualificationName` |
| `cases` | `CasesTable`, `CaseFilters`, `CaseForm`, `LegalQualificationPicker`, `CaseSummaryAside`, `CaseHeader`, `PrescriptionBar`, `ClientCard` | `deadlineStatus`, `prescriptionProgress`, `nearestQualification`, `estimatedExpiry`, `suggestedCaption`, `stateFilterParams`, `changeJurisdiction`, `emptyCaseForm` |
| `proceedings` | `ProceduralActForm`, `DeadlinePreviewAside` | `stateOptions`, `filterStateOptions`, `findStateByName`, `termText`, `dueDateDetail`, `dueDateTone` |
| `lawyers` | `LawyersTable` con la barra de carga (`Meter`) | — |

**Falta**, en este orden: los endpoints en los mocks, `api/` (funciones,
claves y hooks) de cada módulo, las funciones de formulario a cuerpo
(`toCreate…Body`), las `pages/`, las rutas y el acceso, sumar los hooks a cada
`index.ts`, y los tests.

### Reglas del dominio que aparecen en este sprint

- **Personas: apellido primero y orden alfabético por apellido** (observación
  de la Sprint Review 1). El cliente trae `lastName` y `firstName` separados; se
  muestra `GÓMEZ, Ariel Fernando`. El orden lo resuelve el backend: la tabla no
  ordena, y ordenar la página en el front mezclaría las páginas.
- **Fechas sin hora** (`startDate`, `dueDate`, `clientSince`) viajan como
  `YYYY-MM-DD`. Nunca `new Date('2026-09-15')`: lo toma en UTC y en Córdoba
  muestra el día anterior. Para eso están `formatDate` y `todayIsoDate`.
- **El DNI viaja sin puntos** (`34812905`) y se muestra con puntos
  (`34.812.905`).
- **`prescriptionMonths` viaja en meses**; el formulario lo pide en años más un
  select de meses (0 a 11) y la tabla lo muestra como "6 años y 6 meses".
- **El vencimiento de un acto no se calcula en el front.** Se pide a
  `GET /cases/{caseId}/procedural-acts/deadline-preview` mientras se completa el
  formulario, así lo que se ve es lo que se guarda (D-20).
- **`businessDaysRemaining`** arma el texto del chip: negativo = "Vencido hace
  N días", `0` = "Vence hoy", positivo = "En N días hábiles"; `nextDeadline` en
  `null` = "Sin plazo abierto".
- **Los enumerados nuevos** (`ProceduralRole`, `ProceduralActStatus`) viajan
  como código; el rótulo lo pone el front. `ProceduralRole` depende del fuero
  (tabla en V3 §2): al cambiar el fuero, el rol vuelve al primero válido.
- **Estado del acto:** se manda `proceduralStateId` **o** `customState`, nunca
  los dos. Si lo escrito coincide con un estado de la tabla, se manda el id. Los
  estados terminales no se ofrecen.
- **Fuero administrativo:** el plazo corre desde `notificationDate`, que es
  obligatoria si el estado abre plazo (RN6).
- **Secretaría (usuario sin ficha de abogado):** el acto queda
  `PENDING_CONFIRMATION` y la causa no cambia (RN13). La pantalla lo avisa antes
  de guardar; quién tiene ficha sale de `useCurrentUser().lawyer`.
- **Prescripción:** sólo en el fuero penal. El porcentaje transcurrido y el
  "Restan 5 años 9 meses" se calculan con `prescriptionStartsOn` y
  `prescriptionExpiresOn`. Fuera del penal, "No aplica al fuero".

### Cambios de V3 sobre lo que ya está hecho

- **`GET /lawyers` y `GET /procedural-states` se abren a cualquier usuario
  autenticado.** Las pantallas de administración siguen siendo sólo de
  `ADMINISTRATOR` en `ROUTE_ACCESS`; lo que cambia es que otros módulos pueden
  pedir esos datos.
- **`PATCH /procedural-states`** acepta `jurisdiction`, si ninguna causa usa el
  estado.
- **`DELETE /procedural-states`** ya no responde `409` por tener causas; se
  retira `PROCEDURAL_STATE_HAS_DEPENDENCIES` y aparece `PROCEDURAL_STATE_IN_USE`.
- **`activeCases`** de abogados y estados deja de valer siempre `0`.
- **Códigos de error nuevos** (V3 §7.4). `e.is(...)` sólo acepta los que están
  en `ERROR_CODES` de `src/shared/api/contract.ts`, que hoy tiene los 22 de V2:
  hay que agregar los nuevos ahí antes de usarlos.

### Decisiones del equipo que el contrato todavía no refleja

- **El backend manda `message` en castellano, también en los endpoints nuevos.**
  V3 §5.2 y D-23 dicen que viene en inglés y que el front arma el texto a partir
  del `code`. El equipo decidió lo contrario: se sigue mostrando `e.message`
  como en el Sprint 1, y no se escriben mensajes propios. Hay que corregir el
  contrato.

### Antes de la primera pantalla

**Los mocks todavía no tienen los endpoints del Sprint 2.** Sin handler, la
pantalla falla contra el mock y sus tests también (`onUnhandledRequest:
'error'`). Por cada recurso nuevo: fixtures, handler y su entrada en `ROUTES` de
`src/shared/mocks/handlers.ts`, siguiendo el README de los mocks.

---

## Anatomía de un módulo

Las seis carpetas existen siempre, aunque estén vacías (con `.gitkeep`):

```
features/users/
├── types/        user.ts
├── api/          users.api.ts · users.keys.ts · useUsers.ts
│                 useCreateUser.ts · useUpdateUser.ts · useDeleteUser.ts
├── schemas/      user.schema.ts
├── utils/        buildUserPatch.ts · toCreateUserBody.ts · roles.ts · lawyerLink.ts
├── components/   UsersTable.tsx · UserFormModal.tsx · DeleteUserModal.tsx
└── pages/        UsersPage.tsx
```

El ejemplo es `users` porque tiene el ABM completo. En otro módulo, **creá sólo
los hooks de los endpoints que existan y que la pantalla use**: `lawyers`, por
ejemplo, tiene `useLawyers` y `useCreateLawyer`, y no tiene hooks de
modificación ni de baja porque esas historias son de otro sprint. `clients`, en
este sprint, tiene alta y consulta, y nada más.

Dependencias permitidas dentro del módulo, en una sola dirección:

```
pages, components  →  api, schemas, utils, types
api, schemas, utils  →  types
types  →  (nada)
```

Hacia afuera: el módulo puede usar `shared/`, `domain/` y el `index.ts` de otro
módulo. **Nunca importa las carpetas internas de otro módulo ni
`@/shared/mocks`.**

### `types/` — las formas de los datos

Un archivo por entidad, sacado del contrato. Separá las formas, porque no es lo
mismo lo que llega que lo que se manda:

| Tipo | Qué es |
|---|---|
| `User` | El recurso tal como viene dentro de `data` |
| `CreateUserBody` | El cuerpo del `POST` (sin `id`, sin campos que genera el backend) |
| `UpdateUserBody` | El cuerpo del `PATCH`: todo opcional |
| `UserFormValues` | Los valores del formulario. Sólo `string` y `boolean`, porque es lo que admite `FormValues` de `FormModal`. Nunca `undefined` |
| `UserListParams` | Los parámetros del listado: página, límite y filtros |

Los valores cerrados (roles, fueros, rol procesal) van como unión de literales
**y** como arreglo tipado con esa unión, así el arreglo deja de compilar si la
unión cambia.

**No copies los tipos de `shared/mocks/contract.ts`**: los mocks son sólo para
desarrollo. Escribilos en el módulo a partir del contrato.

### `api/` — todo lo que habla con el servidor

**`<plural>.api.ts`** — una función por endpoint.
- Siempre con `http` de `@/shared/api/http`. Nunca `fetch` ni `axios` directo.
- **Sacá el envoltorio del contrato**: para un recurso devolvé `data`; para una
  colección, `{ data, pagination }`. Ni los hooks ni las páginas tienen que
  saber que existe axios ni que la respuesta viene envuelta.
- Un filtro vacío no viaja: `search: params.search?.trim() || undefined`.
- No sabe de React, de caché ni de pantallas.

**`<plural>.keys.ts`** — las claves de caché, en jerarquía:

```
all       → ['users']
lists()   → ['users', 'list']
list(p)   → ['users', 'list', p]        p = página, límite y filtros
details() → ['users', 'detail']
detail(id)→ ['users', 'detail', id]
```

Los listados son paginados y filtrables: **los parámetros van en la clave**, si
no, dos páginas distintas pisan la misma entrada de caché. Nadie escribe una
clave a mano fuera de este archivo.

**Un hook por archivo**, y el archivo se llama igual que el hook
(`useUsers.ts` exporta `useUsers`).
- Consultas: `useQuery`. Los listados usan `placeholderData: keepPreviousData`,
  así la tabla no parpadea al cambiar de página o de filtro. La consulta por id
  lleva `enabled` para no salir con un id inválido.
- Mutaciones: `useMutation`, y **son responsables de dejar la caché bien**
  después de escribir. No se delega a la página:

| Mutación | Detalle | Listados |
|---|---|---|
| Alta | Sembrar `detail(id)` con lo que devolvió el servidor | Invalidar `lists()` |
| Edición | Reemplazar `detail(id)` con lo que devolvió el servidor | Invalidar `lists()` |
| Baja | **Remover** `detail(id)` (invalidarlo dispara un GET que da 404) | Invalidar `lists()` |

Invalidá `lists()` y no `list(p)`: una alta o una baja cambia todas las
páginas, no sólo la que está en pantalla. Si la escritura cambia **otro**
recurso —registrar un acto cambia la causa—, invalidá también las claves de
ese recurso, que su módulo publica en el `index.ts`.

Si hay baja **en lote**, usá `Promise.allSettled` y devolvé `{ deleted, failed }`:
una baja puede fallar sola (`409` si tiene dependencias, `422` si viola una
regla) y no tiene que cancelar las demás.

El `queryClient` ya está configurado (no reintenta mutaciones, `staleTime`
60 s). No crees otro.

**Acá no van mocks.** Los mocks son compartidos y viven en `shared/mocks/`. Si
tu módulo necesita un endpoint que el mock no tiene, se agrega ahí, siguiendo
su README.

### `schemas/` — validación de los formularios

`<entidad>.schema.ts`. Mientras no se decida lo de `zod`, son **funciones
puras** que reciben los valores del formulario y devuelven un error por campo:
`Partial<Record<keyof UserFormValues, string>>`. Así, el día que entre `zod`,
cambia el interior del archivo y no dónde está.

Las restricciones salen de la tabla del cuerpo de cada endpoint en el contrato
(largos, formatos: SAC de 8 dígitos, DNI de 7 u 8, matrícula `1-28114`).

Es la primera barrera, no la única: el backend también valida y devuelve sus
errores campo por campo en los `400` (ver `pages/`).

### `utils/` — transformaciones del módulo

Funciones puras, sin React y sin HTTP:

- **De formulario a cuerpo de alta** (`toCreateUserBody`): recorta espacios y
  convierte `''` en "no se mandó".
- **De formulario a cuerpo de edición** (`buildUserPatch`): compara con el
  original y devuelve **sólo lo que cambió**, recortando antes de comparar. Si
  no cambió nada, no se manda: el contrato responde `400` a un `PATCH` vacío.
- **Mapas de presentación** que usa más de una pantalla del módulo, por ejemplo
  código → rótulo, o estado → tono de `Pill`.

**Las reglas jurídicas no van acá.** Cómputo de plazos, prescripción, actos
interruptivos, estados por fuero: todo eso va en `src/domain/`, sin React. En
este sprint casi todo lo calcula el backend (vencimientos, `businessDaysRemaining`,
`prescriptionExpiresOn`); lo que quede del lado del front, como el porcentaje
de prescripción transcurrida, es presentación.

### `components/` — piezas del módulo

Tablas, formularios y modales de este módulo, aunque los use una sola pantalla
(así lo fija `ESTRUCTURA.md`). **Antes de crear uno, buscá en `SHARED.md`**, en
la tabla "Si necesitás X, usá Y". Si algo de `shared` casi sirve, se extiende
ahí; no se duplica.

Los componentes son presentacionales: reciben los valores y los errores ya
calculados y avisan con callbacks. No validan ni guardan (ver `UserFormModal`).

### `pages/` — una pantalla por ruta

La página **orquesta**: llama a los hooks, guarda el estado de la pantalla
(página actual, filtros, qué modal está abierto) y arma todo con componentes.
No llama al servidor directo.

- **Patrón de listado:** `PageHeader` → `Panel` con los filtros en `actions` →
  `DataTable` → `FormModal` para alta, edición y confirmación de baja.
- **Patrón de formulario de página** (Registrar causa, Registrar acto):
  `Breadcrumbs` → encabezado → `.vz-split` con el formulario en un `Panel` y el
  panel lateral en `.vz-split__aside`.
- **La paginación y los filtros viven en la página** y se pasan al hook como
  parámetros; `DataTable` no pagina ni filtra. Al cambiar un filtro se vuelve a
  la página 1.
- **Un solo estado por modo.** Por ejemplo, "qué modal está abierto y con qué
  registro" es un estado, no dos booleanos que se pueden contradecir.
- **Errores del servidor** (siempre llegan como `ApiError`):
  - para ramificar, `e.is('CODIGO')` o los getters (`isConflict`,
    `isBusinessRule`, `isNotFound`…). **Nunca compares `e.message`.**
  - para marcar campos, `e.fieldError('campo')` en los `400`. Un conflicto que
    es de un campo (usuario repetido, matrícula repetida, SAC repetido, DNI
    repetido) se muestra **en ese campo**, no en un aviso suelto.
  - para mostrar, `e.message`: el backend lo manda en castellano (ver
    [Decisiones del equipo](#decisiones-del-equipo-que-el-contrato-todavía-no-refleja)).
    No escribas mensajes de error genéricos propios.
- **Avisos:** `useToast()` de `@/app/providers/ToastContext`.
  `success` para lo que se creó o se guardó, `info` para una baja (salió bien,
  pero no es un logro), `error` para lo que falló.
- **Estados de la consulta:** cargando, error (con `e.message`) y vacío, con
  las clases `.vz-empty`, como en `UsersPage`.

---

## Enchufar un módulo nuevo

1. Registrar las páginas en `src/app/router/index.tsx`, **adentro** de
   `<RequireAccess />`.
2. Si falta, agregar el ítem en `src/app/layouts/AppLayout.tsx`.
3. **Declarar la ruta en `ROUTE_ACCESS`** (`src/app/access/access.ts`) con los
   roles que la ven, tal como los fija el contrato para sus endpoints.
4. Si el mock no tiene el endpoint, agregarlo en `src/shared/mocks/`.
5. Si otro módulo necesita algo de éste, publicarlo en su `index.ts`.

### Acceso por perfil

`ROUTE_ACCESS` es la única fuente de quién ve qué: de ahí leen el rail (esconde
los ítems y los grupos que quedan vacíos) y `RequireAccess` (muestra "Sin
acceso" si alguien escribe la URL a mano).

- **Lo que no está declarado queda denegado para todos**, administrador
  incluido. Si una pantalla nueva no aparece en el menú, casi seguro falta
  acá.
- Las subrutas heredan el permiso de su sección: `/causas/8/acto` → `/causas`.
- Para esconder o deshabilitar un botón suelto dentro de una pantalla,
  `useCanAccess(ruta)` de `@/app/access/useCanAccess`. **No** escribas
  `roles.includes('ADMINISTRATOR')` en un componente: la regla tiene que
  seguir viviendo en un solo lugar. Caso de este sprint: "Registrar cliente" y
  "Registrar calificación nueva" son sólo de `ADMINISTRATOR` (V3 D-05), aunque
  las pantallas donde aparecen las vea cualquiera.
- Es comodidad, no seguridad: quien autoriza es el backend (responde `403`).
  Lo que se esconde acá es para no mostrarle a nadie algo que no puede usar.

## Verificar

- `npm run lint` (oxlint) y `npm run build` desde `frontend/`. El build también
  chequea los tipos de los tests.
- `npm test` y, antes de un PR, `npm run test:e2e` (ver `TESTING.md`).
- Para desarrollar sin backend: `VITE_USE_MOCKS=true` en `.env.local`. Los
  usuarios de prueba y sus contraseñas están en el README de los mocks.

## Checklist de un módulo

1. Tipos a partir del contrato.
2. El endpoint en los mocks, si no está.
3. `.api.ts`, sacando el envoltorio `{ data }`.
4. `.keys.ts` con los parámetros del listado en la clave.
5. Hooks, uno por archivo, con la caché resuelta en cada mutación.
6. Validación en `schemas/` y transformaciones en `utils/`.
7. Componentes del módulo, después de revisar `SHARED.md`.
8. Página, ruta, ítem del menú si falta, y la ruta en `ROUTE_ACCESS`.
9. Lo que otro módulo necesite, en el `index.ts`.
10. Tests según `TESTING.md` §7.
11. Lint y build.
