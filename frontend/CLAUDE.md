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
   llamada a la API**. El mock implementa V3 entero. Ahí están los usuarios de
   prueba y qué puede cada perfil, qué causa semilla sirve para probar cada
   regla, cómo disparar cada error y cómo agregar un endpoint. El resumen está
   en [Los mocks](#los-mocks), más abajo.
4. `docs/Api-Contract/API_CONTRACT_V3.md` — la fuente de verdad del backend para
   el Sprint 2. Es autocontenido: trae lo del Sprint 1 que sigue vigente y lo
   nuevo. `API_CONTRACT_V2.md` queda como registro del Sprint 1. Si un documento
   y el contrato no coinciden, manda el contrato. **Última revisión:
   09/10/2026** (V3 §7.9): ver [Revisiones del contrato](#revisiones-del-contrato).
   La otra fuente de verdad es el prototipo (`docs/prototypes/`): de ahí salen
   las pantallas y sus textos. Lo que el prototipo muestra y el contrato deja
   fuera del sprint (V3 §8.3) no se programa.
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
  deshabilitado: no existe hasta su sprint. En particular, **no hay endpoint
  para listar los actos de una causa** (HU27, Sprint 3): el panel "Ciclo de
  vida" del detalle no se hace, ni su aviso "Todavía no hay actos procesales".
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
| 8, 9 | Clientes: listado y alta | `clients/` | `/clientes` | **Hecha** |
| — | Calificaciones legales: listado, alta, modificación y baja | `legal-params/` | `/calificaciones-legales` | **Hechos** el listado y el alta. La modificación y la baja no están: la página las deja para otra historia |
| 20 | Causas: listado con búsqueda y filtros | `cases/` | `/causas` | **Hecha** |
| 18 | Registrar causa | `cases/` | `/causas/nueva` | **Hecha** |
| 22 | Detalle de causa: encabezado, prescripción y tarjeta del cliente | `cases/` | `/causas/:caseId` | **Hecha** |
| 26 | Registrar acto procesal | `proceedings/` | `/causas/:caseId/acto` | **Hecha** |
| 13 | Consultar abogado | `lawyers/` | `/abogados` | **Hecha.** `activeCases` es real y la tabla lleva la barra de carga con `Meter` |
| 17, 45, 46 | Estados procesales | `legal-params/` | `/estados-y-plazos` | **Hecha**, con los ajustes de V3 de más abajo |

Las rutas de causas cuelgan de `/causas`, así que heredan su permiso en
`ROUTE_ACCESS` (`/causas/12` → `/causas`). `/calificaciones-legales` ya está
declarada, sólo para `ADMINISTRATOR`, y tiene su ítem en el grupo
"Administración" del rail.

**La barra superior no tiene buscador.** El buscador general —uno solo para
todas las pantallas— quedó postergado (decisión del 07/10/2026). Hasta que se
haga, cada listado lleva el suyo en su panel y busca sólo en ese listado; el de
causas está en `CasesPage`. No se repone el de la barra porque el prototipo lo
muestre.

**A definir con el equipo:** el prototipo del 05/10 muestra Abogados, Estados y
plazos y Calificaciones legales a los tres perfiles, en modo consulta, y deja
sólo Usuarios y Reportes para el administrador. `ROUTE_ACCESS` todavía tiene
`/abogados` y `/estados-y-plazos` sólo para `ADMINISTRATOR`. No lo cambies al
paso: abrir esas pantallas pide además deshabilitar sus botones de escritura.

**Navegación después de guardar** (prototipo actualizado): registrar una causa
lleva a **su detalle** (`/causas/:caseId`), no al listado; registrar un acto
vuelve al detalle de la causa, que ya muestra el estado y el plazo nuevos.

### Qué va en el `index.ts` de cada módulo

Varios módulos necesitan datos de otros. Cada dueño publica **sólo eso** en su
`index.ts` (regla 1 de `ESTRUCTURA.md` §5), y nadie entra a sus carpetas:

| Módulo | Publica | Lo usa |
|---|---|---|
| `lawyers` | `useLawyers` (ya existe) | Registrar causa: "Abogado responsable" |
| `clients` | `useClients`, `useCreateClient`, el formateo del nombre y del DNI, y el modal de alta (ya publicados) | Registrar causa: select de cliente y "Registrar cliente nuevo" |
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
| Renglón chico bajo una etiqueta de la ficha ("8 años desde el 27/02/2021") | `DetailList` con `note` |
| Barra de prescripción, carga de un abogado | `Meter` |
| Iniciales en la tabla de clientes | `Avatar` + `.vz-table__ident` |
| "Estado procesal al que pasa la causa" (elegir o escribir) | `Combobox` |
| "Rol procesal del cliente" | `SegmentedControl` |
| Filtro de estado con grupos por fuero, "Causas nuevas" y "Escritos a mano" | `Select` con `{ group, options }` |
| "Fecha del hecho" de cada calificación elegida | Ya está: un campo de fecha por fila en `LegalQualificationPicker` |
| "Objeto del reclamo" / "Objeto del amparo" con contador `0 / 800` | Ya está en `CaseForm`: `Textarea` dentro de `Field` con `hint` |
| "Solo con plazo por vencer" | `Button pressed={…}` |
| Buscador del listado de causas (y de cualquier listado) | `SearchInput` + `useDebouncedValue` de `@/shared/hooks/useDebouncedValue` |
| Formulario de página con panel al costado | `.vz-split` + `.vz-split__aside` |
| Chip de vencimiento y de estado | `Pill` (`danger` vencido/hoy, `warn` ≤ 5 días, `dot="hollow"` sin plazo) |
| Mostrar una fecha del contrato | `formatDate` de `@/shared/lib/dates` |
| Valor por defecto de un campo de fecha | `todayIsoDate()` de `@/shared/lib/dates` |

Los componentes propios de cada pantalla (la tabla de causas, el selector de
calificaciones del alta, el panel "Cómputo del plazo") van en su módulo.

### Lo que ya está hecho y lo que falta

Por módulo ya están los **tipos**, los **schemas**, las **utilidades** y los
**componentes** presentacionales, con su `index.ts`:

| Módulo | Componentes | Utilidades |
|---|---|---|
| `clients` | `ClientsTable`, `ClientFormModal` | `formatClientName`, `formatDni`, `normalizeDni`, `toCreateClientBody` |
| `legal-params` | `LegalQualificationsTable`, `LegalQualificationFormModal`, `DeleteLegalQualificationModal` | `formatPrescription`, `toPrescriptionMonths`, `splitPrescription`, `shortQualificationName` |
| `cases` | `CasesTable`, `CaseFilters`, `CaseForm`, `LegalQualificationPicker`, `CaseSummaryAside`, `CaseHeader`, `PrescriptionBar`, `ClientCard` | `deadlineStatus`, `prescriptionProgress`, `nearestQualification`, `estimatedExpiry`, `suggestedCaption`, `stateFilterParams` (y `WITHOUT_ACTS`), `changeJurisdiction`, `emptyCaseForm`, `caseStateLabel` |
| `proceedings` | `ProceduralActForm`, `DeadlinePreviewAside` | `stateOptions`, `filterStateOptions`, `findStateByName`, `termText`, `dueDateDetail`, `dueDateTone` |
| `lawyers` | `LawyersTable` con la barra de carga (`Meter`) | — |

**Todo sigue la revisión del 05/10/2026 del contrato** (V3 §7.8): los mocks,
los cinco módulos y sus tests. El detalle de cada cambio está en
[Revisiones del contrato](#revisiones-del-contrato).

También están hechos:

- **Los mocks de todos los endpoints de V3** (ver [Los mocks](#los-mocks)) y
  el test de contrato que los compara con `docs/openapi`.
- **Los permisos por acción**: `ACTION_ACCESS`, `can` y `useCan`, en
  `src/app/access/` (ver [Acceso por perfil](#acceso-por-perfil)).
- **El módulo `clients` completo** (HU-8 y HU-9): `toCreateClientBody`, el
  `api/` (`clients.api`, `clients.keys`, `useClients`, `useCreateClient`),
  `ClientsPage`, la ruta `/clientes` y los dos hooks publicados en su
  `index.ts`. Sus tests se escribieron desde los criterios de aceptación antes
  de programar la feature (ver `TESTING.md` §11) y pasan todos, los E2E
  incluidos. Sirve de modelo para un módulo nuevo, junto con `lawyers`.
- **El módulo `cases` completo** (HU-18, HU-20 y HU-22): `toCreateCaseBody`, el
  `api/` (`cases.api`, `cases.keys`, `useCase`, `useCases`,
  `useCaseCustomStates`, `useCreateCase`) y las tres páginas con sus rutas:
  `CasesPage`, `RegisterCasePage` y `CaseDetailPage`. Los tests del listado
  (HU-20) también se escribieron antes que la página, desde sus criterios.
- **Registrar acto procesal** (HU-26): `RegisterProceduralActPage`, en
  `proceedings/`, con su `api/` (`useRegisterProceduralAct`,
  `useDeadlinePreview`) y su ruta.
- **Calificaciones legales**, listado y alta: `LegalQualificationsPage` y su
  ruta.

**Falta:** la modificación y la baja de calificaciones legales, que el contrato
ya define y `LegalQualificationsPage` deja para otra historia, y lo que está
"a definir con el equipo" más arriba. Qué piezas no llevan test propio, y por
qué, está en `TESTING.md` §5, "Lo que no se testea".

**Lo que tiene que armar cada página**, porque los componentes son
presentacionales y lo reciben hecho:

- **Clientes** (hecha: así quedó `ClientsPage`). El botón "Registrar cliente" va deshabilitado para quien no es
  Secretaría: `useCan('clients.create')`. El DNI se acepta con o sin puntos y
  viaja sin puntos (`normalizeDni`); un teléfono o un correo vacío no viaja. Un
  DNI repetido (`409 CLIENT_DNI_ALREADY_EXISTS`) se muestra en el campo DNI. Al
  registrar, el aviso es "Cliente GÓMEZ, Ariel Fernando registrado.". Sin
  acciones de fila: modificar y eliminar son del Sprint 4.
- **Registrar causa.**
  - *Calificaciones:* `values.legalQualifications` es una lista de
    `{ legalQualificationId, offenseDate }`. Agregar una la suma con
    `offenseDate: ''`; quitarla la saca con su fecha; `onOffenseDateChange`
    cambia la de esa fila. `selectedQualifications` se arma cruzando esa lista
    con las calificaciones de `useLegalQualifications`. Son **opcionales**: una
    causa penal se puede registrar sin ninguna (D-33).
  - *Resumen:* cada renglón de `prescriptions` lleva el nombre corto
    (`shortQualificationName`), el plazo (`formatPrescription`), la fecha del
    hecho y `estimatedExpiry(offenseDate, meses)`. El estado inicial que
    muestra es "Iniciada".
  - *"Para poder registrar":* cliente, carátula y responsable; el SAC es
    opcional, pero si se carga tiene que tener 8 dígitos y no estar repetido;
    en el penal, la fecha del hecho de cada calificación elegida; fuera del
    penal, el objeto del reclamo o del amparo. Los rótulos del prototipo
    cambian según el caso: "N° de SAC: opcional" o "N° de SAC válido y no
    repetido"; "Calificaciones legales: opcionales" o "Fecha del hecho en cada
    calificación legal".
  - *Cuerpo del alta:* `sacNumber` sólo si se cargó; `legalQualifications`
    sólo en el penal y sólo si se eligió alguna; `counterparty` y
    `subjectMatter` sólo en los otros dos fueros; el teléfono del instructor en
    `tribunalPhone` y el interno, aparte, en `instructorExtension`.
- **Causas (listado)** (hecha: así quedó `CasesPage`).
  - *Qué pide:* las causas con `useCases`; los abogados con `useLawyers`; los
    estados con `useProceduralStates`, una vez por fuero, porque ese hook trae
    los de un fuero por vez; y los estados escritos a mano con
    `useCaseCustomStates(fuero)`. Los abogados y los estados se piden con
    `limit: 100`: un desplegable necesita todas las opciones juntas.
  - *Buscador:* propio, en el panel (`aria-label="Buscar causa"`) y con
    demora. Busca por SAC, carátula o cliente.
  - *Grupos del filtro de estado,* en este orden: uno por fuero con sus estados
    (`stateFilterValue(id)`) —sólo el del fuero elegido, si hay uno—; "Causas
    nuevas" con la opción fija "Iniciada" (`WITHOUT_ACTS`); y "Escritos a mano
    en causas" con lo que devuelve `GET /cases/custom-states`
    (`customStateFilterValue`), sólo si devuelve alguno.
  - *Al cambiar el fuero,* el estado elegido se conserva si es "Iniciada", si
    se vuelve a "Todos los fueros" o si es de la tabla del fuero nuevo. Uno
    escrito a mano se suelta: sin preguntarle al servidor no se sabe si alguna
    causa de ese fuero lo tiene.
  - *Cada cambio* de búsqueda o de filtro vuelve a la página 1. "Limpiar
    filtros" saca los cuatro filtros y deja el buscador como está.
  - "Ver detalle" lleva a `/causas/:caseId` y "Registrar causa", a
    `/causas/nueva`. Una causa sin SAC se muestra como "Sin SAC". Sin
    resultados dice "Ninguna causa coincide con los filtros.".
  - *La clave de los estados escritos a mano* (`casesKeys.customStates`) cuelga
    de `casesKeys.lists()` a propósito: registrar un acto invalida los
    listados, y con eso el filtro vuelve a pedir sus opciones.
- **Detalle de causa.** La barra de prescripción muestra
  `nearestQualification(causa)` con su `prescriptionStartsOn` y su
  `prescriptionExpiresOn`, y en `note` dice que el cómputo corre desde la fecha
  del hecho y, si hay varias calificaciones, cuál es la que prescribe primero.
  El instructor lleva dos datos, "Teléfono" e "Interno". "Registrar acto
  procesal" va habilitado sólo para el abogado responsable de la causa; a los
  demás se les muestra deshabilitado, con la nota "Solo el abogado responsable
  (Dra. Malena Ríos) registra actos.".

### Reglas del dominio que aparecen en este sprint

Son las del contrato con su revisión del 05/10/2026, que el código ya sigue
(ver [Revisiones del contrato](#revisiones-del-contrato)).

- **Personas: apellido primero y orden alfabético por apellido** (observación
  de la Sprint Review 1). El cliente trae `lastName` y `firstName` separados; se
  muestra `GÓMEZ, Ariel Fernando`. El orden lo resuelve el backend: la tabla no
  ordena, y ordenar la página en el front mezclaría las páginas.
- **Fechas sin hora** (`startDate`, `offenseDate`, `dueDate`, `clientSince`) viajan como
  `YYYY-MM-DD`. Nunca `new Date('2026-09-15')`: lo toma en UTC y en Córdoba
  muestra el día anterior. Para eso están `formatDate` y `todayIsoDate`.
- **El DNI viaja sin puntos** (`34812905`) y se muestra con puntos
  (`34.812.905`).
- **`prescriptionMonths` viaja en meses**; el formulario lo pide en años más un
  select de meses (0 a 11) y la tabla lo muestra como "6 años y 6 meses".
- **Los estados procesales no tienen posición ni orden** (D-31). El backend los
  lista por fuero y, dentro de cada uno, en el orden en que se registraron. No
  hay columna `#` ni selector de ubicación, y ninguna pantalla los reordena.
- **`activeCases` de estados y calificaciones viene sólo en los `GET`** (D-32).
  El `POST` y el `PATCH` devuelven el recurso sin ese campo, así que lo que
  devuelve una mutación no sirve para pintar la columna "Causas": se invalida
  el listado y se vuelve a pedir.
- **La causa nace en el estado inicial, "Iniciada"** (D-34). `currentState`
  **nunca es `null`**: en una causa recién registrada trae `name: "Iniciada"`,
  `initial: true` y `proceduralStateId: null`. El nombre lo manda el backend;
  el front no pone ningún rótulo propio. "Iniciada" es un estado de sistema:
  no está en la tabla de estados, no se administra, no se ofrece como destino
  de un acto y no aparece en la línea de tiempo. El resumen del alta muestra
  "Iniciada · El estado lo fija el primer acto procesal".
- **El vencimiento es parte del estado actual** (D-35). Ya no existe
  `nextDeadline`: `currentState` trae `proceduralActId`, `dueDate`,
  `businessDaysRemaining` y `manuallyAdjusted`. Con `dueDate` en `null` la
  causa no tiene vencimiento: es el chip "Sin plazo abierto" del prototipo.
- **`businessDaysRemaining`** arma el texto del chip: negativo = "Vencido hace
  N días", `0` = "Vence hoy", positivo = "En N días hábiles".
- **El vencimiento de un acto no se calcula en el front.** Se pide a
  `GET /cases/{caseId}/procedural-acts/deadline-preview` mientras se completa el
  formulario, así lo que se ve es lo que se guarda (D-20).
- **El enumerado nuevo** (`ProceduralRole`) viaja como código; el rótulo lo
  pone el front. Depende del fuero (tabla en V3 §2): al cambiar el fuero, el
  rol vuelve al primero válido. `ProceduralActStatus` **no existe**: el
  contrato lo retiró (D-13).
- **Filtro de estado del listado:** tres clases de opciones, cada una con su
  parámetro, excluyentes entre sí. Estado de la tabla → `proceduralStateId`;
  grupo "Causas nuevas", opción "Iniciada" → `withoutProceduralActs=true`
  (D-29, D-34); grupo "Escritos a mano en causas" → `customState`. "Iniciada"
  es una opción fija: no viene de `GET /cases/custom-states`.
- **El SAC es opcional** (D-33). Si se carga, son 8 dígitos y es único
  (`409 CASE_SAC_ALREADY_EXISTS`, que se muestra en el campo). `sacNumber`
  puede venir en `null`: el prototipo lo muestra como "Sin SAC", y el listado
  ya no se desempata por SAC sino por `id`.
- **Calificaciones legales opcionales** (D-33): una causa penal puede no tener
  ninguna; en ese caso no computa prescripción. Fuera del penal no se mandan.
- **Fecha del hecho** (D-19, D-28): cada calificación **elegida** lleva su
  `offenseDate`, obligatoria y no futura. El cuerpo del alta manda
  `legalQualifications: [{ legalQualificationId, offenseDate }]`; ya no existe
  `legalQualificationIds`.
- **Prescripción:** sólo en el fuero penal y **por calificación**: cada
  elemento de `legalQualifications[]` trae `offenseDate`,
  `prescriptionStartsOn` y `prescriptionExpiresOn`. La causa no tiene
  `prescriptionStartsOn`, y `startDate` no interviene. La barra muestra **la
  calificación que prescribe primero** (menor `prescriptionExpiresOn`), con la
  nota "Calificación que prescribe primero: …"; el porcentaje y el "Restan 5
  años 9 meses" se calculan con las dos fechas de esa calificación. En el
  resumen del alta, cada calificación muestra "8 años desde el 27/02/2021" y su
  vencimiento estimado. Fuera del penal, "No aplica al fuero".
- **Objeto del reclamo / del amparo** (`subjectMatter`, D-27): sólo en
  `ADMINISTRATIVE` y `AMPARO`, **obligatorio** y de hasta 800 caracteres, con
  contador. El rótulo y el placeholder cambian con el fuero. En el penal no se
  manda. También entra en "Para poder registrar".
- **Instructor de la causa** (D-33): `instructorName`, `tribunalPhone` (sólo
  el teléfono, hasta 50 caracteres) e `instructorExtension` (el interno, hasta
  20), los tres opcionales. En el formulario van en una fila: "Instructor de la
  causa", "Teléfono" e "Interno".
- **Estado del acto:** se manda `proceduralStateId` **o** `customState`, nunca
  los dos. Si lo escrito coincide con un estado de la tabla, se manda el id. Los
  estados terminales no se ofrecen, y "Iniciada" tampoco. El **primer acto** de
  una causa puede llevarla a cualquier estado no terminal del fuero, o a uno
  escrito a mano.
- **Fuero administrativo:** el plazo corre desde `notificationDate`, que es
  obligatoria si el estado abre plazo (RN6).
- **Sólo el abogado responsable de la causa registra sus actos** (D-30). No es
  un rol: ni otro abogado ni el administrador pueden. Se compara la ficha del
  usuario con el responsable de la causa
  (`useCurrentUser().lawyer?.id === causa.responsibleLawyer.id`); el backend
  responde `403` a quien no lo es, también en `deadline-preview`. El acto se
  aplica a la causa al registrarse: no hay actos pendientes ni confirmación
  (D-13). A quien no es el responsable el prototipo le muestra el botón
  deshabilitado y la nota "Solo el abogado responsable de la causa (…) registra
  sus actos procesales.".

### Cambios de V3 sobre lo que ya está hecho

Lo que V3 cambió en los recursos del Sprint 1. El mock ya los implementa todos;
en la columna de la derecha, cómo quedó el front.

| Cambio | En el front |
|---|---|
| `GET /lawyers` y `GET /procedural-states` se abren a cualquier usuario autenticado | Otros módulos ya pueden pedir esos datos. Las pantallas siguen siendo sólo de `ADMINISTRATOR` en `ROUTE_ACCESS`. **A definir:** el prototipo del 05/10 muestra Abogados, Estados y plazos y Calificaciones legales a los tres perfiles, en modo consulta |
| `DELETE /procedural-states` ya no responde `409` por tener causas: la baja procede y las causas conservan el estado (D-06) | **Hecho.** `DeleteProceduralStateModal` avisa "Hay N causas en este estado…", como el prototipo |
| `PATCH /procedural-states` no acepta `jurisdiction`: el fuero de un estado no se modifica (D-36, revierte D-07). Se retira `PROCEDURAL_STATE_IN_USE` | **Hecho.** El formulario no ofrece el fuero y `UpdateProceduralStateBody` no tiene el campo; el mock responde `400` si viaja |
| Los estados procesales no tienen `position` (D-31) | **Hecho.** Se sacaron la columna `#`, el selector "¿Dónde va este estado?", `positionOptions.ts` y `useProceduralStateCycle.ts`. El aviso del alta dice "Estado … agregado al ciclo de vida del fuero …" |
| `POST` y `PATCH /procedural-states` devuelven el estado sin `activeCases` (D-32) | **Hecho.** `SavedProceduralState` en `types/proceduralState.ts`; las mutaciones invalidan el listado |
| `activeCases` de abogados y estados deja de valer `0` | Nada que tocar: las tablas ya lo muestran |
| Códigos de error nuevos y `PROCEDURAL_STATE_HAS_DEPENDENCIES` retirado (V3 §7.4) | **Hecho.** `ERROR_CODES` de `src/shared/api/contract.ts` tiene los 29 del catálogo, así que `e.is(...)` ya los acepta. `JURISDICTION_WITHOUT_PROCEDURAL_STATES` no está: el contrato lo retiró. La revisión del 05/10 no agregó códigos |
| `message` y `details` en castellano en todos los endpoints (V3 §5.2, D-23) | Se muestra `e.message` como en el Sprint 1 y no se escriben mensajes propios |

### Revisiones del contrato

Si el contrato vuelve a cambiar, **no se toca de una**: primero se listan los
cambios y se acuerdan, después se aplican al contrato, a los mocks, a los tipos
y a este archivo.

#### Revisión del 09/10/2026 (V3 §7.9)

| Cambio del contrato | Dónde quedó |
|---|---|
| Los códigos de `ProceduralRole` van en castellano: `DEFENSA`, `QUERELLANTE_PARTICULAR`, `RECURRENTE`, `ACTORA`, `DEMANDADA` (D-37) | **Hecho** en `cases/types/case.ts`, en los mocks (`contract.ts`, `fixtures.ts`, `responses.ts`) y en los tests. Los rótulos de pantalla no cambian |

#### Revisión del 05/10/2026 (V3 §7.8)

Decisiones del equipo sobre el propio V3. **El mock las implementa todas, y el
front también:**

| Cambio del contrato | Dónde quedó |
|---|---|
| Los estados procesales no tienen `position` (D-31) | **Hecho** en `legal-params` y en `proceedings/utils/stateOptions.ts`, que respeta el orden en que llegan |
| `activeCases` sólo en los `GET` de estados y calificaciones (D-32) | **Hecho.** `SavedProceduralState` y `CreatedLegalQualification` son los tipos de lo que devuelven `POST` y `PATCH` |
| Sólo el abogado responsable registra actos (D-30) | **Hecho.** `isResponsibleLawyer` (`cases/utils/responsibleLawyer.ts`) lo decide en el detalle de la causa y en `RegisterProceduralActPage`. No es un permiso por rol, así que no va en `ACTION_ACCESS` |
| La causa nace en "Iniciada": `currentState` no es anulable y suma `initial` (D-34) | **Hecho.** `CurrentState` en `cases/types/case.ts`; `caseStateLabel` devuelve el nombre que manda el backend |
| El filtro "Sin acto procesal" pasa a llamarse "Iniciada" (D-34) | **Hecho.** `CasesPage` arma la opción con `INITIAL_STATE_LABEL`. Quedan tres comentarios que todavía dicen "Sin acto procesal": el encabezado de `cases/utils/stateFilter.ts`, la prop `stateOptions` de `CaseFilters` y uno de `CaseSummaryAside` |
| Se retira `nextDeadline`: el vencimiento va en `currentState` (D-35) | **Hecho.** `deadlineStatus` lee `dueDate` y `businessDaysRemaining` del estado actual |
| `sacNumber` opcional y anulable (D-33) | **Hecho.** `validateCase` sólo lo revisa si se cargó, y `sacLabel` (`cases/utils/sac.ts`) muestra "Sin SAC" |
| `legalQualifications` opcional en el penal (D-33) | **Hecho.** `validateCase` sólo exige la fecha del hecho de las que se eligieron |
| El interno del instructor va aparte del teléfono (D-33) | **Hecho.** `tribunalPhone` e `instructorExtension`, con sus dos campos en `CaseForm`. El teléfono se llama `tribunalPhone` en el contrato; antes figuraba como `instructorPhone` |
| El resultado de un acto (`resultingState`) lleva sólo `proceduralStateId`, `name` y `custom` | **Hecho.** `ResultingState` es el del acto y `CurrentState`, que lo extiende, el de la causa |

Los tests de `cases` y `proceedings` ya siguen esta revisión, igual que el
código que prueban.

#### Revisión del 01/10/2026 (V3 §7.7)

Por la actualización del prototipo. Está aplicada entera en `cases` y
`proceedings`; parte de lo que fijó ya fue reemplazado por la revisión del
05/10, y se indica:

| Cambio del contrato | Dónde quedó |
|---|---|
| La causa nace sin estado: `currentState` puede venir en `null` (D-09) | **Reemplazado por D-34**: la causa nace en "Iniciada" |
| Filtro "Sin acto procesal" → `withoutProceduralActs=true` (D-29) | `CaseListParams` y `stateFilterParams`, con el valor `WITHOUT_ACTS`. El parámetro sigue; la opción ahora se llama "Iniciada" |
| `legalQualifications: [{ legalQualificationId, offenseDate }]`, con la fecha del hecho obligatoria (D-19, D-28) | `CreateCaseBody`, `CaseFormValues`, `validateCase` (que además devuelve `offenseDates`, el error de cada fila) y `LegalQualificationPicker`. Vigente; lo que pasó a ser opcional es tener calificaciones (D-33) |
| La prescripción es por calificación: `offenseDate`, `prescriptionStartsOn`, `prescriptionExpiresOn`. La causa ya no tiene `prescriptionStartsOn` | `CaseLegalQualification`; `estimatedExpiry` cuenta desde la fecha del hecho. Vigente |
| `subjectMatter` obligatorio fuera del penal, hasta 800 (D-27) | `Case`, `CreateCaseBody`, `validateCase` (`SUBJECT_MATTER_MAX`) y `CaseForm`, con su contador. Vigente |
| No existe `ProceduralActStatus` ni el flujo de confirmación (D-13) | Se sacó de `proceedings/types` y `ProceduralActForm` ya no muestra la nota de RN13. Vigente; quién registra cambió con D-30 |

### Los mocks

**El mock implementa V3 entero**, con la revisión del 05/10/2026: los
endpoints del Sprint 1 con sus cambios y los del Sprint 2 (calificaciones
legales, clientes, causas, registro de acto y `deadline-preview`). Una pantalla
nueva ya tiene contra qué desarrollarse y contra qué testearse. Lo que hay que
saber:

- **Permisos**, según la tabla del contrato (V3 §4): leer está abierto a
  cualquiera con sesión, salvo `/users`. Registrar un cliente pide `SECRETARY`
  (`gestion`); escribir abogados, estados y calificaciones, `ADMINISTRATOR`
  (`fvazquez`). Registrar una causa, cualquiera.
- **Los actos no se rigen por un rol** (D-30): los registra, y previsualiza su
  vencimiento, sólo el abogado responsable de la causa. `mrios` lleva la 1 y la
  17; `fvazquez`, la 4, la 6 y la 20; `mferreyra`, la 7. Con cualquier otro
  usuario el mock responde `403`, aunque sea abogado o administrador.
- **Datos semilla:** 23 causas, 23 clientes vigentes, 8 calificaciones
  vigentes. Las causas 1 a 6 son las del prototipo; el resto cubre cada regla:
  en el estado inicial "Iniciada" (7, 11, 22 y 23), sin SAC ni calificaciones
  (23), estado escrito a mano (8), en estado terminal (9, 10 y 21), con una
  calificación dada de baja (13), con el vencimiento ajustado a mano (8 y 16).
  La tabla completa está en el comentario de `CASE_SEEDS`, en `fixtures.ts`.
- **Los vencimientos son relativos a hoy.** Los actos recientes de las
  semillas se ubican "N días hábiles atrás", así el listado se ve como el
  prototipo cualquier día. Un test que afirme algo sobre vencimientos o sobre
  "hoy" tiene que fijar el día: `TESTING.md`, "Tests que dependen del día".
- **Lo calculado no se guarda.** `activeCases`, el estado actual de una causa
  y su vencimiento salen de los actos en cada lectura. Registrar un acto no
  "actualiza la causa": la próxima lectura ya la devuelve cambiada, y por eso
  la mutación del acto tiene que invalidar las claves de la causa. "Iniciada"
  tampoco se guarda: una causa está en ese estado mientras no tenga actos.
- **El detalle está en el README de los mocks**: cómo disparar cada error
  (qué usuario, qué causa, qué dato) y las decisiones que el mock tomó donde
  el contrato no dice nada. Que el mock no invente ni olvide endpoints lo revisa
  `tests/unit/contract/endpoints.test.ts` contra `docs/openapi`.
- **Si falta un endpoint**, se agrega en `src/shared/mocks/handlers.ts`
  (handler y su entrada en `ROUTES`), y el contrato en `docs/openapi` (el test de `tests/unit/contract/` falla si divergen).
  Sin handler, la pantalla falla contra el mock y sus tests también
  (`onUnhandledRequest: 'error'`).
- **El mock sigue además al esquema de la base** (`backend/prisma/schema.prisma`)
  donde el contrato no entra en detalle: por ejemplo, el nombre de un estado
  procesal es único entre los vigentes, así que el de uno dado de baja se
  puede volver a usar.

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

En estados procesales y calificaciones legales, lo que devuelven el `POST` y el
`PATCH` **no trae `activeCases`** (V3 D-32): no lo uses para sembrar ni para
reemplazar `detail(id)`. Alcanza con invalidar `lists()`, y el dato llega con
el próximo `GET`.

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
- **El texto del buscador va con demora.** El `SearchInput` muestra `search`
  al instante, y al hook se le pasa
  `const debouncedSearch = useDebouncedValue(search.trim())` (de
  `@/shared/hooks/useDebouncedValue`): si no, sale un pedido por tecla. Los
  selects, las pestañas y el paginado no llevan demora. Ver `ClientsPage`.
- **Un solo estado por modo.** Por ejemplo, "qué modal está abierto y con qué
  registro" es un estado, no dos booleanos que se pueden contradecir.
- **Errores del servidor** (siempre llegan como `ApiError`):
  - para ramificar, `e.is('CODIGO')` o los getters (`isConflict`,
    `isBusinessRule`, `isNotFound`…). **Nunca compares `e.message`.**
  - para marcar campos, `e.fieldError('campo')` en los `400`. Un conflicto que
    es de un campo (usuario repetido, matrícula repetida, SAC repetido, DNI
    repetido) se muestra **en ese campo**, no en un aviso suelto.
  - para mostrar, `e.message`: el backend lo manda en castellano (V3 D-23).
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
   roles que la ven, tal como los fija el contrato para sus endpoints. Si la
   pantalla tiene una acción que opera un solo perfil, declararla en
   `ACTION_ACCESS`, en el mismo archivo.
4. Si el mock no tiene el endpoint, agregarlo en `src/shared/mocks/`.
5. Si otro módulo necesita algo de éste, publicarlo en su `index.ts`.

### Acceso por perfil

Hay dos tablas en `src/app/access/access.ts`, y entre las dos son la única
fuente de quién puede qué.

**`ROUTE_ACCESS`: quién ve cada sección.** De ahí leen el rail (esconde los
ítems y los grupos que quedan vacíos) y `RequireAccess` (muestra "Sin acceso"
si alguien escribe la URL a mano).

- **Lo que no está declarado queda denegado para todos**, administrador
  incluido. Si una pantalla nueva no aparece en el menú, casi seguro falta
  acá.
- Las subrutas heredan el permiso de su sección: `/causas/8/acto` → `/causas`.
- Para preguntar por una ruta desde un componente, `useCanAccess(ruta)` de
  `@/app/access/useCanAccess`.

**`ACTION_ACCESS`: quién opera cada acción.** Es para lo que `ROUTE_ACCESS` no
puede decir: una pantalla que ven todos, con un botón que es de un solo perfil.

```ts
export const ACTION_ACCESS: Record<Action, readonly Role[]> = {
    'clients.create': SECRETARY,              // V3 D-05
    'legalQualifications.create': ADMIN,      // V3 D-04
}
```

```tsx
const canCreate = useCan('clients.create')   // de @/app/access/useCan

<Button disabled={!canCreate} onClick={openCreate}>Registrar cliente</Button>
```

- El botón va **deshabilitado**, no escondido: es lo que hace el prototipo.
- Una acción nueva se suma a `Action` y a `ACTION_ACCESS`, con el rol que fija
  la tabla de permisos del contrato (V3 §4). Hoy hay dos: registrar un cliente
  y registrar una calificación legal.
- **No** escribas `roles.includes('SECRETARY')` en un componente: la regla
  tiene que seguir viviendo en un solo lugar.
- Con varios roles alcanza con que uno habilite: quien es Secretaría y abogada
  a la vez puede registrar clientes.

**Lo que no es un permiso por rol no va en ninguna de las dos tablas.**
"Registrar acto procesal" depende de la causa: sólo su abogado responsable
(D-30). Se resuelve en la pantalla, comparando la ficha del usuario con el
responsable de esa causa.

Todo esto es comodidad, no seguridad: quien autoriza es el backend (responde
`403`). Lo que se deshabilita acá es para no ofrecerle a nadie algo que no
puede usar.

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
8. Página, ruta, ítem del menú si falta, la ruta en `ROUTE_ACCESS` y sus
   acciones en `ACTION_ACCESS`.
9. Lo que otro módulo necesite, en el `index.ts`.
10. Tests según `TESTING.md` §11.
11. Lint y build.
