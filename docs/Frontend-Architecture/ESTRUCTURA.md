# Estructura del frontend — VZ Causas

Este documento explica cómo está organizado el código del frontend: qué hay en cada
carpeta, qué va adentro de cada una y por qué. La idea es que cualquiera del equipo
sepa dónde buscar algo y, sobre todo, dónde poner lo que escribe.

Si tenés una duda del tipo "¿esto dónde va?", saltá a la sección
[Dónde pongo esto](#6-dónde-pongo-esto).

---

## 1. El stack

Lo acordado en el Sprint 0:

| Qué | Con qué |
|---|---|
| Librería de interfaz | React + TypeScript |
| Empaquetador | Vite |
| Ruteo | React Router |
| Datos del servidor | TanStack Query |
| Formularios | Formularios controlados de React (`values` + `onChange`) |
| Validación | Funciones puras propias, una por formulario |
| Estilos | CSS propio con variables (tokens) |

El backend es aparte (Node + NestJS + Prisma + Postgres) y se consume por HTTP.

**Sobre la validación: no hay librería.** Cada formulario tiene en su carpeta
`schemas/` una función pura que recibe los valores y devuelve un objeto con un
mensaje por campo con problema (`validateLogin`, `validateUser`…). Ni `zod` ni
`react-hook-form` **están instalados** (el segundo se desinstaló el 13/11/2026,
H-16 de la auditoría del front: nadie lo usaba). Formularios controlados y
validación a mano, sin mezclar patrones.

---

## 2. Mapa general

```
frontend/
├── public/               archivos que se sirven tal cual (favicon, worker de MSW)
├── tests/                los tests; espeja los nombres de features/ (ver TESTING.md)
└── src/
    ├── app/              el armado de la aplicación
    │   ├── router/       las rutas y sus guardas
    │   ├── access/       quién ve cada sección y quién opera cada acción
    │   ├── layouts/      los marcos de pantalla (con menú, sin menú)
    │   └── providers/    lo que envuelve a toda la app (sesión, datos, avisos)
    ├── features/         un módulo por área funcional del sistema
    │   ├── auth/
    │   ├── users/
    │   ├── clients/
    │   ├── lawyers/
    │   ├── legal-params/
    │   ├── cases/
    │   ├── proceedings/
    │   ├── deadlines/
    │   ├── documents/
    │   ├── dashboard/
    │   └── tools/
    ├── shared/           lo reutilizable por cualquier módulo
    │   ├── api/          el cliente HTTP y el manejo de errores
    │   ├── components/   componentes sin dueño
    │   │   ├── ui/       botones, inputs, tablas, modales
    │   │   ├── forms/    piezas para armar formularios
    │   │   └── feedback/ avisos, carteles de error, estados vacíos (hoy vacía)
    │   ├── hooks/        hooks reutilizables: búsqueda con demora, foco en el error
    │   ├── lib/          utilidades sueltas: fechas, nombres, archivos, borradores
    │   ├── mocks/        datos y servidor simulado para desarrollar sin backend
    │   └── types/        tipos que usan varios módulos (hoy vacía)
    ├── domain/           las reglas del negocio jurídico, sin React (hoy vacía)
    ├── api-contract/     cómo se habla con el backend (envoltorios y paginación)
    └── styles/           los tokens y la hoja de estilos
```

---

## 3. La idea de fondo

La organización es **por funcionalidad, no por tipo de archivo**.

No hay una carpeta `components/` gigante con todos los componentes del sistema ni una
`services/` con todas las llamadas al servidor. En vez de eso, cada área funcional es
una cajita cerrada que tiene adentro todo lo suyo: sus llamadas al backend, sus
componentes, sus pantallas y sus validaciones.

Esto tiene tres ventajas concretas:

1. **Para tocar una funcionalidad, abrís una sola carpeta.** Todo lo de causas está en
   `features/cases/`.
2. **Se puede repartir el trabajo sin pisarse.** Dos personas en dos módulos distintos
   casi no tocan los mismos archivos, y hay menos conflictos al mergear.
3. **Se puede borrar una funcionalidad de una.** Si un módulo se cae del alcance, se
   borra su carpeta y no quedan restos desparramados.

---

## 4. Carpeta por carpeta

### `src/app/` — el armado de la aplicación

Acá vive el andamiaje: lo que existe una sola vez y envuelve a todo lo demás. **No va
lógica de negocio.**

- **`router/`**: el mapa de rutas (`index.tsx`). Qué URL muestra qué pantalla.
  También las guardas: `RequireSession` manda al login a quien no tiene sesión y
  se acuerda de dónde estaba; `RedirectIfSession` rebota a Inicio a quien ya
  entró; y `RequireAccess` muestra `ForbiddenPage` ("Sin acceso") si el perfil
  no puede ver la sección, aunque haya escrito la URL a mano. Las secciones del
  rail que todavía no tienen pantalla caen en la ruta comodín.
- **`access/`**: el único lugar donde se dice quién puede qué. `access.ts`
  tiene dos tablas:
  - `ROUTE_ACCESS`, **quién ve cada sección**, con `canAccess(roles, ruta)`. De
    ahí leen el rail, para esconder los ítems, y `RequireAccess`, para frenar
    la URL. Una sección que no está declarada queda denegada para todos. Desde
    un componente se consulta con `useCanAccess(ruta)`.
  - `ACTION_ACCESS`, **quién opera cada acción**, con `can(roles, acción)`. Es
    para la pantalla que ven todos pero tiene un botón de un solo perfil:
    "Registrar abogado" es sólo del Administrador. Desde un componente se
    consulta con `useCan('lawyers.create')`.

  Así la regla no se repite en cada componente. Lo que no depende del perfil
  sino del dato —sólo el abogado responsable de una causa registra sus actos—
  no va en ninguna de las dos tablas: lo resuelve la pantalla de esa causa.
- **`layouts/`**: los marcos de pantalla. `AppLayout` —rail, barra superior y
  contenido— para el sistema ya logueado; `AuthLayout` para el login, que hoy no
  dibuja nada porque esa pantalla arma su propia composición; y `NotFoundLayout`
  para las rutas desconocidas.
- **`providers/`**: lo que tiene que estar disponible en toda la app:
  `AuthProvider` (la sesión, que se lee con `useAuth` y `useCurrentUser`),
  `QueryProvider` (el cliente de TanStack Query) y `ToastProvider` (los avisos,
  que se disparan con `useToast`).

### `src/features/` — un módulo por área funcional

Cada módulo cubre un área del sistema y **adentro siempre tiene las mismas seis
carpetas**:

| Subcarpeta | Qué va | Ejemplo |
|---|---|---|
| `api/` | Llamadas al backend y los hooks de TanStack Query que las usan | `useCases.ts`, `cases.api.ts` |
| `components/` | Componentes que sólo usa este módulo | `CasesTable.tsx`, `CaseForm.tsx` |
| `pages/` | Las pantallas completas, las que el router monta | `CasesPage.tsx`, `CaseDetailPage.tsx` |
| `schemas/` | La validación de los formularios del módulo, como funciones puras | `case.schema.ts` |
| `types/` | Los tipos de este módulo | `case.ts` |
| `utils/` | Funciones auxiliares del módulo | `deadlineStatus.ts` |

Si una de esas carpetas queda vacía, se deja igual, con un `.gitkeep`: la
estructura tiene que ser predecible.

**Hay un séptimo archivo, y es opcional: `index.ts` en la raíz del módulo.** Es
la cara pública del módulo y sólo lo tiene el que necesita que otro lo use; ver
la regla 1 en [§5](#5-las-tres-reglas-que-sostienen-todo). Hoy lo tienen
`lawyers/`, `clients/`, `legal-params/`, `cases/` y `documents/`, porque el
alta de causa, el registro de actos y los tableros consumen sus datos, y
`deadlines/`, que le da a la barra superior el atajo de la campana. Lo que
publica cada uno está en `frontend/CLAUDE.md`, "Qué publica el `index.ts` de
cada módulo". Si no hace falta, no se crea.

**Los módulos y qué cubre cada uno:**

| Módulo | Qué hace |
|---|---|
| `auth/` | Iniciar y cerrar sesión, renovar la sesión, cambiar contraseña |
| `users/` | Alta, baja, consulta y permisos de los usuarios del sistema |
| `clients/` | Los clientes del estudio |
| `lawyers/` | Los abogados del staff |
| `legal-params/` | Datos maestros del dominio: fueros, estados procesales con sus plazos, y calificaciones legales |
| `cases/` | Causas y amparos: alta, consulta, detalle, modificación y baja, línea de vida, carpeta y documentos en Drive, actos interruptivos, marca de prescripción, carátula y expediente |
| `proceedings/` | Registrar y modificar los actos procesales de cada causa |
| `deadlines/` | Vencimientos, prescripción y alertas. Hoy sólo tiene el atajo de la campana para la corrida diaria, en desarrollo (`deadlines/CAMBIOS.md`) |
| `documents/` | Los modelos formales del estudio. Los documentos de cada causa están en `cases/` (la tarjeta "Documentación" del detalle) |
| `dashboard/` | El tablero de control accionable y los reportes. Su página es Inicio (`/inicio`), la pantalla de entrada después del login |
| `tools/` | Herramientas: accesos directos a sitios externos (`/herramientas`) |

De los once, diez tienen pantallas: `auth/`, `users/`, `lawyers/` y
`legal-params/`; los tres del Sprint 2 —`clients/`, `cases/` y
`proceedings/`—; y los del Sprint 3: `documents/` (los modelos formales),
`dashboard/` (los tableros de Inicio) y `tools/`. El Sprint 4 sumó pantallas a
`cases/`, `proceedings/` y `lawyers/`. Los tests de pantalla de cada sprint se
escriben antes que la página (`TESTING.md` §11). `deadlines/` no tiene
pantallas: tiene sus seis carpetas y sólo `api/` y `types/` con algo, el
atajo de la campana que dispara la corrida diaria de los correos en
desarrollo.

Lo programado sigue el contrato V5 (`docs/Api-Contract/API_CONTRACT_V5.md`).
**Desde el 09/11/2026 el vigente es V6** (`API_CONTRACT_V6.md`), que trae todo
V5 y suma el Sprint 5, todavía sin programar. El Sprint 5 cae en módulos que ya
existen:

- `clients/`: modificar y dar de baja un cliente (HU10, HU11).
- `lawyers/`: dar de baja un abogado y repartir sus causas (HU15).
- `proceedings/`: anular un acto procesal (HU29).
- `documents/`: modificar y dar de baja un modelo formal (HU36, HU37).
- `dashboard/`: el reporte mensual de gestión (HU43), que es de EP-08 como
  los tableros.
- `legal-params/`: HU49 y HU50, ya contratadas desde V3.

Lo que V4, V5 y V6 cambiaron sobre lo que ya estaba hecho está en
`frontend/CLAUDE.md`, en "Cambios de V4 sobre lo que ya estaba hecho", "Cambios
de V5…" y "Cambios de V6…"; lo que trae el Sprint 5, en "Sprint 5 — qué trae
V6".

### `src/shared/` — lo reutilizable

Lo que usa más de un módulo. La regla para que algo entre acá es simple: **si lo
necesitan dos módulos distintos, va a `shared/`; si lo usa uno solo, se queda en su
módulo.** Hay una sola excepción: un **control genérico** —que no sabe nada del
dominio, como un combobox o un grupo de botones para elegir— va a `shared/`
aunque por ahora lo use una sola pantalla, igual que `Select` o `TextInput`.
Una tabla de causas o un formulario de cliente, en cambio, son del módulo.

- **`api/`**: el cliente HTTP (con la URL base, el token de sesión y el manejo de
  errores) y la configuración de TanStack Query.
- **`components/ui/`**: los ladrillos visuales, sin nada de negocio adentro: botón,
  tabla, modal, panel, píldora, migas, barra de medida.
- **`components/forms/`**: piezas para armar formularios: un campo con su rótulo,
  su error y su ayuda, los controles (input, select, combobox…) y `FormModal`.
- **`components/feedback/`**: avisos, mensajes de error, estados de carga y de lista
  vacía. Hoy está vacía: los avisos son `useToast()`, que vive en
  `app/providers/`, y los estados vacíos se escriben con las clases `.vz-empty`.
- **`hooks/`**: hooks reutilizables. Hoy tiene `useDebouncedValue.ts` (la
  búsqueda con demora de los listados), `useFocusFirstError.ts` (lleva al
  primer campo con error al confirmar un formulario) y `useCountdown.ts` (la
  cuenta regresiva de un `429` en el login).
- **`lib/`**: funciones sueltas sin estado. Hoy tiene `dates.ts` (el último
  ingreso, las fechas sin hora del contrato, los instantes y la fecha de hoy),
  `personName.ts` (el nombre de una persona, apellido primero o dentro de una
  frase), `initials.ts` (las iniciales de los avatares), `saveFile.ts` y
  `printFile.ts` (guardar o imprimir un archivo bajado de la API), `drafts.ts`
  (las claves de los borradores en `sessionStorage` y su borrado al cerrar
  sesión) y `focusFirstError.ts` (lo que usa `useFocusFirstError`).
- **`mocks/`**: datos de mentira y un servidor simulado, para poder desarrollar
  pantallas antes de que el backend esté listo.
- **`types/`**: tipos que cruzan módulos. Hoy está vacía. El perfil del
  usuario (`Role`), que sería el candidato natural, vive en
  `features/auth/types/session.ts`, y `features/users/types/user.ts` tiene su
  propia copia. La forma de las respuestas paginadas tampoco vive acá sino en
  `api-contract/`, porque es contrato y no un tipo nuestro.

`SHARED.md` tiene el detalle de cada componente y la tabla "Si necesitás X,
usá Y": antes de crear un componente, buscalo ahí.

### `src/domain/` — las reglas del negocio

Acá van las reglas jurídicas del sistema, escritas como funciones y tipos **sin React
adentro**: nada de componentes, hooks ni llamadas HTTP. Entra sola y se puede probar
sin levantar la interfaz.

**Hoy está vacía.** Las épicas que la iban a poblar —plazos, vencimientos y
prescripción— ya están programadas, pero el cálculo lo hace el backend: el
vencimiento de un acto se pide a `deadline-preview` (D-20) y la prescripción
llega calculada en la causa (D-51). El front sólo lo muestra, con utilidades de
presentación en cada módulo (`cases/utils/deadlineStatus.ts`,
`cases/utils/prescription.ts`). Lo que sigue describe para qué está reservada,
si alguna vez una regla tiene que calcularse del lado del front.

Es la carpeta que en este proyecto pesa más que en un ABM común, porque el negocio
tiene reglas de verdad:

- el cómputo de un plazo según el fuero y el tipo de día (hábil o corrido);
- la prescripción de la acción y cómo un acto interruptivo reinicia su cómputo;
- qué estados procesales corresponden a cada fuero;
- el cálculo de cuánto falta para un vencimiento y desde cuándo está en alerta.

**Por qué separado:** son las reglas que más caro sale equivocar, y las que más van a
cambiar a medida que el estudio corrija detalles. Tenerlas juntas y sin interfaz
alrededor permite probarlas de forma aislada y que no queden desparramadas adentro de
un componente.

### `src/api-contract/` — el contrato con el backend

La forma de lo que viaja entre el front y el back: qué manda cada endpoint y qué
devuelve. Sirve como única fuente de verdad cuando el backend cambia algo, y evita que
cada módulo invente su propia versión de lo mismo.

Hoy tiene `envelopes.ts`, con los envoltorios que el contrato pone alrededor de
toda respuesta exitosa: `ApiItem`, `ApiList`, `Pagination` y `PaginatedQuery`.
La capa `api/` de cada módulo los desenvuelve y entrega los datos pelados, así
el envoltorio no se propaga a las pantallas. La fuente es el contrato de
`docs/Api-Contract/`: `API_CONTRACT_V6.md`, la última versión (09/11/2026),
autocontenida: trae todo lo de los Sprints 1 a 4, sin cambios, y suma el
Sprint 5, marcado **(V6)**. Los puntos abiertos (C-xx) están en su §7,
"Aspectos por definir"; las decisiones (D-xx), en `DECISIONES.md`. V2, V3, V4
y V5 quedan como registro: no son referencia.

La otra fuente de verdad es el prototipo (`docs/prototypes/`): de ahí salen las
pantallas y sus textos. Cuando el contrato y el prototipo no coinciden, se
acuerda con el equipo antes de tocar cualquiera de los dos.

### `src/styles/` — los estilos

La hoja de estilos global y los tokens: colores, tipografías, espaciados, bordes y
sombras, definidos como variables CSS. Todo lo visual sale de ahí, así cambiar un
color de la marca es tocar un solo lugar.

### `public/` — archivos servidos tal cual

El favicon y cualquier archivo que se sirva sin pasar por el empaquetador. Ahí
vive también `mockServiceWorker.js`, el worker que MSW necesita para interceptar
la red en el navegador; lo genera la propia librería y no se edita a mano.

### Dónde está esta documentación

No vive adentro de `frontend/`. Los cuatro documentos del front están en
`docs/Frontend-Architecture/`, en la raíz del repositorio, al lado de los del
backend y del contrato de API:

| Documento | De qué habla |
|---|---|
| `ESTRUCTURA.md` | Este: el mapa de `src/` y las reglas entre carpetas |
| `SHARED.md` | Todo lo de `src/shared/`: componentes, `http`, `ApiError`, estilos |
| `TESTING.md` | Con qué se testea, qué se testea y dónde va cada test |
| `MATRIZ_CA.md` | Qué test cubre cada criterio de aceptación. Se genera con `npm run ca-matrix`: no se edita a mano |

Hay otros pegados al código, que por eso viven adentro de `frontend/`:
`CLAUDE.md` (cómo se trabaja adentro de un módulo y el estado del sprint),
`src/shared/mocks/README.md` (la API simulada y sus divergencias del contrato)
y un `CAMBIOS.md` en la raíz de cada módulo que se aparta del prototipo o del
contrato (hoy `cases`, `clients`, `dashboard`, `deadlines`, `documents`,
`legal-params` y `tools`).

---

## 5. Las tres reglas que sostienen todo

Si se respetan estas tres, la estructura se mantiene sola con el tiempo:

1. **Un módulo no importa las entrañas de otro módulo.** `cases/` no puede
   escribir `@/features/clients/api/clients.api`. Si dos módulos necesitan la
   misma lógica o el mismo componente, eso se muda a `shared/` o a `domain/`.

   **La excepción:** cuando un módulo necesita *el dato* de otro y no su lógica.
   El usuario se vincula a la ficha de un abogado, y más adelante la causa
   también. En ese caso el módulo dueño del dato publica un `index.ts` en su
   raíz con lo mínimo indispensable, y el otro importa **sólo eso**:
   `@/features/lawyers`, nunca `@/features/lawyers/api/...`. Lo que no está en
   ese `index.ts` es asunto interno y puede cambiar sin avisar. El primer caso
   fue `UsersPage` usando `useLawyers`: la alternativa era que cada módulo se
   escribiera su propio `GET /lawyers`, con el mismo endpoint mantenido en
   cuatro lados. En el Sprint 2 `cases/` usa los de `clients/` y
   `legal-params/`, y `proceedings/` los de `cases/` y `legal-params/`. Las
   flechas van en un solo sentido; si aparece una al revés, algo está en el
   módulo equivocado.
2. **`shared/` no sabe que los módulos existen.** Es de una sola mano: los módulos usan
   `shared/`, nunca al revés. Un componente de `shared/ui` no puede saber qué es una
   causa.
3. **`domain/` no sabe nada de React ni del servidor.** Son funciones y tipos puros. Si
   necesitás un hook, va en el módulo o en `shared/hooks`.

Cuando algo no entra en estas reglas, casi siempre es señal de que está en el lugar
equivocado.

---

## 6. Dónde pongo esto

| Lo que estás escribiendo | Va en |
|---|---|
| Una pantalla nueva | `features/<módulo>/pages/` |
| Un componente que usa una sola pantalla | `features/<módulo>/components/` |
| Un componente que ya usa un segundo módulo | `shared/components/` (ver §4) |
| Un control genérico, sin nada del dominio | `shared/components/forms/` |
| La llamada a un endpoint | `features/<módulo>/api/` |
| El manejo de errores del HTTP, igual para todos | `shared/api/` |
| La validación de un formulario | `features/<módulo>/schemas/` |
| El cálculo de un plazo o de la prescripción | `domain/` |
| Formatear una fecha para mostrarla | `shared/lib/dates.ts` |
| El tipo de una causa | `features/cases/types/` |
| Un tipo que usan varios módulos | `shared/types/` (hoy `Role` está en `features/auth/types/`, ver §4) |
| El envoltorio de una respuesta del backend | `api-contract/` |
| Algo de tu módulo que otro módulo va a necesitar | el `index.ts` del módulo |
| Un test de cualquiera de estas cosas | `tests/`, ver `TESTING.md` |
| Una ruta nueva | `app/router/`, y quién la ve en `ROUTE_ACCESS` (`app/access/access.ts`) |
| Un botón que es de un solo perfil, en una pantalla que ven todos | Su acción en `ACTION_ACCESS` (`app/access/access.ts`), y `useCan(...)` en la pantalla |
| Un color o un espaciado nuevo | `styles/` |

---

## 7. Cómo agregar un módulo nuevo

1. Creá la carpeta en `features/` con las seis subcarpetas de siempre.
2. Definí los tipos en `types/` y las validaciones en `schemas/`.
3. Escribí las llamadas al backend en `api/`, con sus hooks de TanStack Query.
4. Armá la pantalla en `pages/` y lo que necesite en `components/`.
5. Registrá la ruta en `app/router/index.tsx`, **adentro** de `<RequireAccess />`,
   y el ítem en el rail de `app/layouts/AppLayout.tsx` si la sección todavía no
   está.
6. Declarala en `ROUTE_ACCESS` (`app/access/access.ts`) con los perfiles que la
   ven. Si falta, la sección queda denegada para todos, administrador incluido,
   y no aparece en el menú. Si la pantalla tiene una acción que opera un solo
   perfil, declarala en `ACTION_ACCESS`, en el mismo archivo.
7. Si otro módulo va a necesitar algo de éste, publicá **eso solo** en un
   `index.ts` en la raíz del módulo (ver la regla 1 de §5).
8. Creá sus carpetas en `tests/unit/` y `tests/components/`, como explica
   `TESTING.md` §11. Los tests se pueden escribir antes que la feature, desde
   los criterios de aceptación de la historia: en ese caso este paso va
   primero.

Si mientras lo hacés necesitás un componente que ya existe en otro módulo, no lo
copies: mudalo a `shared/components/` y que los dos lo usen de ahí.

---

## 8. Nombres

- **Carpetas**: en minúscula y con guiones (`legal-params`).
- **Componentes y pantallas**: `PascalCase.tsx` (`CaseDetailPage.tsx`).
- **Todo lo demás**: `camelCase.ts` (`formatDate.ts`), y cuando el archivo tiene un rol
  fijo se nombra con punto: `case.schema.ts`, `cases.api.ts`.
- **Las carpetas van en inglés, el dominio en castellano.** Es decir: la carpeta se
  llama `cases/`, pero adentro se habla de causa, fuero, SAC y acto procesal, tal como
  los nombra el estudio. El sistema tiene que usar el vocabulario jurídico y no
  términos genéricos de sistemas de gestión.

Equivalencias, para no traducir distinto cada vez:

| Carpeta | Dominio |
|---|---|
| `cases` | causas y amparos, con sus actos interruptivos y sus documentos |
| `proceedings` | actos procesales |
| `deadlines` | plazos, vencimientos y prescripción |
| `lawyers` | abogados |
| `clients` | clientes |
| `legal-params` | fueros, estados procesales, tabla de plazos y calificaciones legales |
| `documents` | modelos formales |

---

## 9. De las épicas del backlog a las carpetas

Cada módulo sale de una épica del Product Backlog, así se puede ir del documento al
código y al revés:

| Épica | Módulo |
|---|---|
| EP-01 Seguridad, autenticación y accesos | `features/auth/`, `features/users/`, guardas en `app/router/` |
| EP-02 Profesionales y clientes | `features/lawyers/`, `features/clients/` |
| EP-03 Parametrización jurídica | `features/legal-params/` |
| EP-04 Causas y expedientes | `features/cases/` |
| EP-05 Actuaciones procesales | `features/proceedings/` |
| EP-06 Plazos, alertas y vencimientos | `features/deadlines/` + reglas en `domain/` |
| EP-07 Documentación e integración cloud | `features/documents/` |
| EP-08 Tablero de control y reportes | `features/dashboard/` |

La pantalla de entrada, la que recibe apenas se inicia sesión, es la página de
`dashboard/`: los tableros de EP-08 ("Mi día" y "Estudio") son el Inicio
(`/inicio`). Hasta el Sprint 2 existía `features/home/`, que le guardaba el
lugar y la ruta; se eliminó al programar los tableros (18/10/2026), porque
quedaba como una página que sólo le pasaba datos a `dashboard/`.
