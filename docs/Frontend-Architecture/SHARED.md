# Shared — Componentes y recursos reutilizables

## Propósito

`src/shared` contiene lo que usan todas las features: el sistema de componentes
extraído del prototipo (rail, paneles, tablas, formularios, modales) y la capa
de acceso HTTP. Nada de acá conoce una pantalla concreta.

Dos reglas que valen para toda la carpeta:

1. **Todos los componentes son presentacionales.** No rutean, no validan, no
   piden datos, no ordenan ni filtran. Reciben datos ya formateados y avisan con
   callbacks. El estado vive en la pantalla.
2. **El código está en inglés** (`variant`, `size`, `title`, `onChange`, `rows`):
   nombres de props, tipos, variables, funciones y clases CSS. Lo que queda en
   castellano es lo que lee el usuario —textos de la interfaz, rutas, labels— y
   los comentarios.

Los estilos **no** viven acá: son CSS global en `src/styles/` (clases `vz-*`).
Los componentes sólo escriben `className`.

---

## Mapa de carpetas

```text
shared/
├── api/                      http, errores y cliente de react-query
│   ├── ApiError.ts
│   ├── contract.ts           forma de los errores (codigos + cuerpos)
│   ├── http.ts
│   └── queryClient.ts
├── components/
│   ├── index.ts              barrel: reexporta ui + forms
│   ├── ui/                   18 componentes + index.ts
│   ├── forms/                Field.tsx, Combobox.tsx, SegmentedControl.tsx, FormModal.tsx + index.ts
│   └── feedback/             VACÍA (sólo .gitkeep)
├── hooks/                    useDebouncedValue.ts (búsqueda con demora)
├── lib/                      dates.ts (fechas para mostrar), initials.ts (iniciales de avatar)
├── mocks/                    la API del contrato, simulada (ver su README)
│   ├── contract.ts           tipos del contrato
│   ├── fixtures.ts           datos semilla
│   ├── responses.ts          una respuesta por cada código documentado
│   ├── calendar.ts           fechas sin hora y cómputo de días hábiles
│   ├── db.ts                 base en memoria + resetMockDb()
│   ├── handlers.ts           servidor falso: resolveRequest()
│   ├── msw-handlers.ts       capa MSW (navegador y Node)
│   ├── browser.ts            startMocks() — service worker
│   ├── server.ts             setupServer — tests en Node
│   └── index.ts              barrel
└── types/                    VACÍA (sólo .gitkeep)
```

`types/` y `components/feedback/` siguen vacías. Si una feature necesita algo
de ahí, es un archivo nuevo, no algo que haya que buscar. `lib/` dejó de
estarlo: tiene `dates.ts` e `initials.ts`. `hooks/` también: tiene
`useDebouncedValue.ts` (ver [Hooks](#hooks)).

`mocks/` implementa `docs/Api-Contract/API_CONTRACT_V5.md` (con su revisión
del 27/10/2026) sobre **MSW**, que intercepta la red de verdad (los pedidos se
ven en la pestaña Network). Se enciende con `await startMocks()` de
`@/shared/mocks/browser`. Están **todos los endpoints del contrato**, incluidos
los del Sprint 4: modificar y dar de baja una causa, la carátula, modificar un
acto procesal, los documentos de la causa y el expediente. Lo que conviene
saber antes de usarlo:

- **Quién puede qué** sale de la tabla de permisos del contrato (V5 §4,
  "Autorización"): leer está abierto a cualquier usuario autenticado, salvo
  `/users` (`ADMINISTRATOR`), los modelos formales (`ADMINISTRATOR` o
  `LAWYER`) y los tableros (cada uno el suyo). Escribir abogados y usuarios es
  de `ADMINISTRATOR`; clientes, estados, calificaciones y causas —también
  modificarlas y darlas de baja— de cualquier perfil. Descargar un documento de
  la causa que no es un expediente pide `LAWYER` o `SECRETARY` (D-103).
- **Los actos procesales no se rigen por un rol** (D-30): los registra y los
  modifica sólo el abogado responsable actual de la causa. Con cualquier otro
  usuario, abogado o administrador, el mock responde `403`. Lo mismo vale para
  los actos interruptivos.
- **Una causa dada de baja no existe para el cliente** (D-97): ella y todo lo
  que cuelga de ella responden `404 CASE_NOT_FOUND`, sale de listados y
  tableros, y su SAC se puede volver a usar.
- **Nada se escribe a mano si se puede contar.** `activeCases`, el estado
  actual de una causa y su vencimiento se calculan en cada lectura a partir de
  las causas y los actos de la base. Una causa sin actos está en el estado
  inicial, "Iniciada", que tampoco se guarda (D-34).
- **El mock sigue también al esquema de la base** (`backend/prisma/schema.prisma`)
  en lo que el contrato no detalla: largos, datos opcionales y unicidad.
- **Los vencimientos de las semillas son relativos a hoy.** Los actos
  recientes se ubican "N días hábiles atrás", así el listado muestra una causa
  que vence hoy, otra vencida hace dos días y otra a tres días, igual que el
  prototipo, cualquier día que se abra. Un test que afirme algo sobre
  vencimientos tiene que fijar el día (ver `TESTING.md`).
- **El detalle está en `mocks/README.md`**: los usuarios de prueba, qué causa
  semilla sirve para probar cada regla, cómo disparar cada error y las
  decisiones que el mock tomó donde el contrato no dice nada. **Leerlo antes
  de escribir una llamada a la API.**

## Cómo importar

El alias `@` apunta a `src/` (declarado en `vite.config.ts` y `tsconfig.app.json`).

```tsx
import { Panel, DataTable, Button, Pill } from '@/shared/components/ui';
import { FormModal, Field, TextInput } from '@/shared/components/forms';
// o ambos juntos:
import { Panel, FormModal } from '@/shared/components';

import { http } from '@/shared/api/http';
import { ApiError, isApiError } from '@/shared/api/ApiError';
```

- `components/ui/index.ts` y `components/forms/index.ts` son los barrels reales;
  `components/index.ts` sólo hace `export * from './ui'` y `'./forms'`.
- **`api/`, `lib/` y `hooks/` no tienen barrel**: se importan archivo por
  archivo (`@/shared/lib/dates`, `@/shared/hooks/useDebouncedValue`).
- El código existente (`AppLayout`, `UsersPage`, `LawyersPage`…) importa desde
  `@/shared/components/ui`. Seguir ese patrón.

---

## Índice rápido

| Recurso | Tipo | Ubicación | Uso |
| --- | --- | --- | --- |
| `AppShell` | Component | `components/ui/AppShell.tsx` | Marco app: rail + topbar + página |
| `Logo` | Component | `components/ui/Logo.tsx` | Monograma VZ del rail |
| `RailUser` | Component | `components/ui/RailUser.tsx` | Pie del rail: usuario y sesión |
| `PageHeader` | Component | `components/ui/PageHeader.tsx` | Título de pantalla + acciones |
| `Panel` | Component | `components/ui/Panel.tsx` | Tarjeta con cabecera/pie |
| `DataTable` | Component | `components/ui/DataTable.tsx` | Tabla de datos |
| `Pagination` | Component | `components/ui/Pagination.tsx` | Paginado del pie de un panel |
| `Tabs` | Component | `components/ui/Tabs.tsx` | Pestañas |
| `Button` | Component | `components/ui/Button.tsx` | Acciones |
| `IconButton` | Component | `components/ui/IconButton.tsx` | Acción sólo icono (40px) |
| `Icon` / `ICONS` | Component + const | `components/ui/Icon.tsx` | Set de iconos SVG |
| `Pill` | Component | `components/ui/Pill.tsx` | Estado / semáforo de plazos |
| `SearchInput` | Component | `components/ui/SearchInput.tsx` | Buscador de un listado, en los filtros de su panel |
| `Modal` | Component | `components/ui/Modal.tsx` | Diálogo genérico |
| `Avatar` | Component | `components/ui/Avatar.tsx` | Iniciales de una persona en una tabla |
| `Breadcrumbs` | Component | `components/ui/Breadcrumbs.tsx` | Migas: "Causas / 13284571 / Registrar acto" |
| `DetailList` | Component | `components/ui/DetailList.tsx` | Pares etiqueta–valor de una ficha |
| `Meter` | Component | `components/ui/Meter.tsx` | Barra de cuánto se ocupó: prescripción, carga |
| `LoadingState` / `Skeleton` | Components | `components/ui/Skeleton.tsx` | Esqueleto de carga de una pantalla o un panel |
| `FormModal` | Component | `components/forms/FormModal.tsx` | Alta / edición / baja declarativa |
| `Field` | Component | `components/forms/Field.tsx` | Label + control + nota + error |
| `TextInput` `Select` `Textarea` `Checkbox` | Components | `components/forms/Field.tsx` | Controles sueltos |
| `FormSection` | Component | `components/forms/Field.tsx` | Separador dentro del form |
| `PasswordInput` | Component | `components/forms/PasswordInput.tsx` | Contraseña con un ojo para mostrarla u ocultarla |
| `Combobox` | Component | `components/forms/Combobox.tsx` | Texto libre con lista para elegir |
| `SegmentedControl` | Component | `components/forms/SegmentedControl.tsx` | Elegir una entre pocas opciones a la vista |
| `http` | Axios instance | `api/http.ts` | Todas las llamadas al backend |
| `ApiError` / `isApiError` | Class + guard | `api/ApiError.ts` | Errores normalizados: `status`, `code`, `details` |
| `ERROR_CODES` / `ErrorCode` | Const + type | `api/contract.ts` | Códigos de error del contrato |
| `queryClient` | QueryClient | `api/queryClient.ts` | Config de react-query |
| `setRenewHandler` / `setUnauthenticatedHandler` | Funciones | `api/http.ts` | Los enchufa `AuthProvider`: cómo renovar y qué hacer al quedar afuera |
| `TOKEN_KEY` | Const | `api/http.ts` | Clave del token en `localStorage`: `'vz.token'` |
| `formatLastLogin` | Función | `lib/dates.ts` | `Hoy 08:12`, `Ayer 18:20` o `08/09/2026` |
| `formatDate` | Función | `lib/dates.ts` | Fecha sin hora del contrato: `2026-09-15` → `15/09/2026` |
| `todayIsoDate` | Función | `lib/dates.ts` | Hoy como `YYYY-MM-DD`, para los `<input type="date">` |
| `parseDateOnly` | Función | `lib/dates.ts` | `YYYY-MM-DD` → `Date` local, para hacer cuentas sin que la fecha se corra |
| `initials` | Función | `lib/initials.ts` | Iniciales de un nombre, para los avatares |
| `startMocks` | Función | `mocks/browser.ts` | Enciende la API simulada (async) |
| `configureMocks` | Función | `mocks/browser.ts` · `mocks/server.ts` | Demora, logs y passthrough del mock |
| `server` | SetupServer | `mocks/server.ts` | Los mismos handlers para tests en Node |
| `resolveRequest` | Función | `mocks/handlers.ts` | Servidor falso puro, sin MSW |
| `RESPONSES` / `ERRORS` | Const | `mocks/responses.ts` | Fixtures por endpoint y código |
| `resetMockDb` | Función | `mocks/db.ts` | Vuelve los datos del mock al estado inicial (y recalcula las fechas relativas a hoy) |
| `toCase` / `toClient` / `toLawyer` … | Funciones | `mocks/db.ts` | El recurso del contrato a partir de lo guardado, con lo embebido y lo calculado |
| `INITIAL_STATE_NAME` | Const | `mocks/fixtures.ts` | "Iniciada": el nombre del estado inicial de toda causa, para un test que lo afirme |
| `addBusinessDays` / `businessDaysUntil` / `computeDueDate` | Funciones | `mocks/calendar.ts` | El cómputo de plazos del contrato (V5 §4, "Cómputo de días"), para armar expectativas en un test |

---

## Si necesitás X, usá Y

| Necesidad | Usar | Nota |
| --- | --- | --- |
| Pantalla de listado | `PageHeader` + `Panel` + `DataTable` | Patrón estándar del producto |
| Botón | `Button` | `variant` + `size`, nunca `<button>` suelto |
| Botón de fila / acción compacta | `Button variant="ghost" size="sm"` o `IconButton` | En columna con `actions: true` |
| Estado / plazo / semáforo | `Pill` | `tone`: warn = por vencer, danger = vencido |
| Diálogo con formulario | `FormModal` | Declarás los campos como datos |
| Diálogo libre / confirmación con contenido propio | `Modal` | `FormModal` sin `fields` también sirve |
| Campo dentro de un form propio | `Field` + `TextInput`/`Select`/`Textarea`/`Checkbox` | |
| Agrupar campos | `FormSection` | Dentro de `.vz-form-grid` |
| Llevar al primer campo con error al confirmar | `const focusErrors = useFocusFirstError(ref, errors)` de `@/shared/hooks/useFocusFirstError`, y `focusErrors()` al principio del `submit` | Centra el primer `.vz-field--error` del contenedor y le da foco, también si el error llega del servidor. `FormModal` ya lo hace solo |
| Filtros sobre una tabla | `Panel actions={...}` | Se renderiza en `.vz-filters` |
| Paginar una tabla | `Pagination` | Va en `Panel footer={...}` |
| Buscador de un listado | `SearchInput` + `useDebouncedValue` de `@/shared/hooks/useDebouncedValue` | El input muestra el texto al instante; a la consulta va el valor demorado, así no sale un pedido por tecla |
| Mostrar un último ingreso | `formatLastLogin` de `@/shared/lib/dates` | Para que la fecha no se formatee distinto en cada feature |
| Mostrar una fecha sin hora (`startDate`, `dueDate`) | `formatDate` de `@/shared/lib/dates` | **Nunca** `new Date('2026-09-15')`: la corre un día |
| Valor por defecto de un campo de fecha | `todayIsoDate()` de `@/shared/lib/dates` | No `toISOString()`, que después de las 21 ya dice mañana |
| Primera columna de una persona en una tabla | `Avatar` + `.vz-table__ident` | Usuarios, clientes |
| Ubicar al usuario en una pantalla interna | `Breadcrumbs` | Arriba del título, en lugar del `eyebrow` |
| Ficha de datos (cliente, resumen, cómputo) | `Panel` + `.vz-panel__body` + `DetailList` | Un `null` se muestra como `—` |
| Aclarar de dónde sale un dato de una ficha | `DetailList` con `note` | "8 años desde el 27/02/2021", debajo de la etiqueta |
| Contador de caracteres de un texto largo | `Field` con `hint` | `hint="23 / 800"`, a la derecha de la etiqueta |
| Barra de proporción | `Meter` | `tone`: warn = cerca del límite |
| Formulario de página con panel al costado | `.vz-split` + `.vz-split__aside` | Registrar causa, Registrar acto |
| Filtro con opciones agrupadas | `Select` con `{ group, options }` | Se dibuja como `<optgroup>` |
| Botón que se prende y se apaga | `Button pressed={…}` | "Solo con plazo por vencer" |
| Elegir de una lista o escribir otra cosa | `Combobox` | La pantalla filtra las opciones |
| Campo de contraseña que se pueda ver | `PasswordInput` | Dentro de un `Field`, igual que `TextInput` |
| Elegir una entre 2 a 4 opciones cortas | `SegmentedControl` | Más opciones, `Select` |
| Buscador | `SearchInput` | En `Panel actions` (ahí toma 280px de mínimo). La topbar no lleva buscador: el general quedó postergado |
| Iconos | `Icon name="..."` | Sólo los nombres de `ICONS` |
| Estado vacío de tabla | `DataTable empty={...}` con clases `.vz-empty` | **No hay componente**, ver Observaciones |
| Avisos / toasts | `useToast()` de `@/app/providers/ToastContext` | **Vive fuera de shared** |
| Deshabilitar un botón que es de un solo perfil | `useCan('lawyers.create')` de `@/app/access/useCan` | **Vive fuera de shared.** Nunca `roles.includes(...)` en un componente |
| Marcar un campo como opcional | `Field` sin `required` | No hay marca de "(opcional)": el asterisco señala lo obligatorio |
| Cache y fetching | `queryClient` ya configurado en `QueryProvider` | No crear otro `QueryClient` |
| Llamar al backend | `http` | Nunca `fetch` ni `axios` directo |
| Trabajar sin backend levantado | `await startMocks()` de `@/shared/mocks/browser` | `VITE_USE_MOCKS=true`; ver `mocks/README.md` |
| Mockear sólo una parte de la API | `startMocks({ passthrough: ['/lawyers'] })` | El resto sale al backend real |
| Datos de prueba para un test | `RESPONSES` / `resolveRequest` de `@/shared/mocks` | No hace falta instalar el adapter |
| Manejar errores de API | `isApiError(e)` + `e.is(codigo)` / getters | Nunca comparar `e.message` |
| Marcar campos inválidos en un form | `e.details` / `e.fieldError('username')` | Sólo en los `400 VALIDATION_ERROR` |
| Tabla mientras carga por primera vez | `DataTable loading loadingLabel="Cargando causas…"` | Dibuja el esqueleto con las mismas columnas. Pasale `query.isPending` |
| Tabla mientras trae otra página u otro filtro | `DataTable busy` | Se atenúa y deja las filas anteriores. Pasale `query.isPlaceholderData` |
| Pantalla o panel mientras carga | `LoadingState` + `Skeleton` | El esqueleto de cada pantalla va en su módulo (`CaseSkeletons`, `DashboardSkeleton`…) |
| Alerts inline | **No existen** | Definirlas en la feature |

---

## UI Components

### AppShell

**Path:** `components/ui/AppShell.tsx`
**Propósito:** estructura de la app con sesión: rail oscuro, barra superior y página.

**Props:** `groups: RailGroup[]`, `active: string`, `onNavigate(id)`, `brand`,
`railAction?`, `railFooter?`, `topBar?`, `children`.
`RailGroup = { label, items: RailItem[] }`, `RailItem = { id, label, icon: IconName }`.

**Notas:** no sabe de rutas; la traducción ruta↔ítem la hace
`@/app/layouts/AppLayout.tsx`, que ya lo monta con los 9 ítems del sistema.
**Una pantalla nueva no necesita tocar AppShell**: se agrega la ruta al router y,
si falta, el ítem en `AppLayout`.

**Pantallas angostas:** debajo de 1024px el rail no ocupa lugar. Queda fuera de
la pantalla y se abre encima de la página con el botón de menú que AppShell
pone en la barra superior; se cierra con su botón, tocando el fondo, con Escape
o al elegir cualquier cosa del rail. AppShell guarda ese estado y el CSS
(`shell.css`) decide si el rail está fijo o es deslizable: quien lo monta no
tiene que hacer nada.

### PageHeader

**Path:** `components/ui/PageHeader.tsx`
**Props:** `eyebrow?` (mayúsculas, suele ser el grupo del rail), `title`, `sub?`, `actions?`.

```tsx
<PageHeader
  eyebrow="Trabajo diario"
  title="Clientes"
  sub="Un mismo cliente puede tener varias causas abiertas."
  actions={<Button icon={<Icon name="plus" />} size="md">Registrar cliente</Button>}
/>
```

### Panel

**Path:** `components/ui/Panel.tsx`
**Props:** `title?`, `sub?`, `actions?` (van en la barra de filtros de la cabecera),
`footer?`, `children`.
**Notas:** la cabecera sólo se dibuja si hay `title` o `actions`. Es el contenedor
natural de `DataTable`.

### DataTable

**Path:** `components/ui/DataTable.tsx`
**Props:** `columns: Column<T>[]`, `rows: T[]`, `rowKey(row) => string`,
`minWidth?` (default 960), `empty?`, `loading?`, `loadingLabel?` (default
`'Cargando…'`), `busy?`.
**`Column<T>`:** `id`, `header`, `cell(row) => ReactNode`, `mono?` (tipografía
monoespaciada: SAC, fechas, importes), `nowrap?`, `actions?` (alinea a la derecha),
`width?`, `primary?`, `hideWhenNarrow?`.

**Pantallas angostas:** la tabla se adapta sola, pero cada pantalla le dice qué
importa. Debajo de 1180px suelta `minWidth` y esconde las columnas marcadas
`hideWhenNarrow` (lo prescindible: fuero, responsable, último acceso). Debajo
de 720px cada fila es una tarjeta: la columna `primary` —la que identifica a la
fila— va arriba a todo el ancho, las acciones abajo, y el resto de a dos con el
nombre de su columna encima. **Toda tabla nueva marca su columna `primary`.**

```tsx
<DataTable
  columns={[
    { id: 'name', header: 'Cliente', cell: (c) => `${c.lastName}, ${c.firstName}` },
    { id: 'dni', header: 'DNI', cell: (c) => formatDni(c.dni), mono: true },
    { id: 'acc', header: '', actions: true,
      cell: (c) => <Button variant="ghost" size="sm" onClick={() => edit(c)}>Modificar</Button> },
  ]}
  rows={clients}
  rowKey={(c) => String(c.id)}
  empty={<div className="vz-empty"><div className="vz-empty__title">Sin clientes</div></div>}
/>
```

**Notas:** genérica en `T`. No ordena, no filtra, no pagina: eso lo resuelve la
pantalla antes de pasar `rows`. Si no se pasa `empty`, con 0 filas dibuja la
tabla vacía igual.

**Carga:** con `loading` dibuja un esqueleto de seis filas con las mismas
columnas (`primary`, `actions` y `hideWhenNarrow` incluidas), dentro de un
`LoadingState` que anuncia `loadingLabel`. Con `busy` la tabla sigue mostrando
sus filas y se atenúa, a los 200 ms, como el esqueleto. Las páginas de listado
le pasan `loading={query.isPending}` y `busy={query.isPlaceholderData}` y
dejan su propia rama sólo para el error.

### Pagination

**Path:** `components/ui/Pagination.tsx`
**Props:** `page`, `totalPages`, `totalItems`, `noun: [singular, plural]`,
`onChange(page)`.
**Notas:** va en el `footer` del `Panel` que envuelve la tabla, no adentro de la
tabla. Presentacional como el resto: no sabe cuántas páginas hay de verdad ni
pide datos, sólo avisa a qué página quiere ir el usuario; el estado y el
refetch son de la pantalla. El `noun` va como par y no derivado con una `s`
porque el castellano no siempre pluraliza así. Con `totalItems` en 0 muestra
"Sin resultados".

```tsx
<Panel
  title="Usuarios"
  footer={
    <Pagination
      page={pagination?.page ?? 1}
      totalPages={pagination?.totalPages ?? 1}
      totalItems={pagination?.totalItems ?? 0}
      noun={['usuario', 'usuarios']}
      onChange={setPage}
    />
  }
>
  <DataTable … />
</Panel>
```

### Button

**Path:** `components/ui/Button.tsx` — extiende `ButtonHTMLAttributes`.
**Props:** `variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'ghost-danger'`
(default `primary`; `ghost-danger` es el destructivo callado de las filas de una
tabla, que sólo se pone rojo al apuntarlo),
`size?: 'lg' | 'md' | 'sm'` (default `lg` = 40px), `block?`, `icon?: ReactNode`,
`pressed?: boolean`.
**Notas:** `type` por defecto es `"button"`; para enviar un `<form>` hay que pasar
`type="submit"` explícito. `pressed` lo convierte en un botón que se prende y se
apaga ("Solo con plazo por vencer"): pone `aria-pressed` y lo pinta de verde
mientras está prendido (en `secondary` y `ghost`). No cambia solo: avisa con
`onClick` y la pantalla guarda el estado. Sin la prop, es un botón común.

### IconButton

**Path:** `components/ui/IconButton.tsx`
**Props:** `name: IconName`, `label: string` (obligatoria: es el `aria-label`
y el `title`), más los atributos de `<button>`. Cuadrado de 40px.

### Icon / ICONS

**Path:** `components/ui/Icon.tsx`
**Props:** `name: IconName`, `size?` (default 17), `className?`.
**Nombres disponibles:** `home`, `cases`, `deadlines`, `clients`, `templates`,
`users`, `lawyers`, `timeLimits`, `qualifications`, `reports`, `search`, `notifications`,
`password`, `eye`, `eyeOff`, `logout`, `plus`, `alert`, `download`, `back`, `forward`.
**Notas:** el color sale de `currentColor`. Si falta un icono, se agrega un path a
`ICONS` (viewBox 24×24, trazo 1.7) — no crear otro componente de icono.

### Pill

**Path:** `components/ui/Pill.tsx`
**Props:** `tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'primary'` (default `neutral`),
`dot?: boolean | 'hollow'`, `children`.
**Convención del producto:** `ok` = al día, `warn` = plazo por vencer,
`danger` = vencido o prescripta.

### Tabs

**Path:** `components/ui/Tabs.tsx`
**Props:** `tabs: { id: T; label: string }[]`, `active: T`, `onChange(id)`.
Genérico en `T extends string`. No guarda estado.

### SearchInput

**Path:** `components/ui/SearchInput.tsx`
**Props:** las de un `<input>` (`InputHTMLAttributes`). No tiene interfaz propia ni
props extra; renderiza icono + `<input type="search">`. No debounce, no busca:
la demora la pone la página con [`useDebouncedValue`](#usedebouncedvalue).

### Modal

**Path:** `components/ui/Modal.tsx`
**Props:** `title`, `sub?`, `width?: 'sm' | 'md' | 'lg'` (default `md`), `footer?`
(la botonera), `onClose()`, `children`.
**Notas:** cierra con **Escape** y con click en el fondo, pero sólo si el gesto
*empezó* ahí: si no, seleccionar texto adentro del formulario y soltar el botón
afuera cerraría el modal con todo lo escrito. **Atrapa el foco**: al abrir lo
lleva a la tarjeta, el tabulador da vueltas adentro (en los dos sentidos) y al
cerrar lo devuelve a donde estaba. Es `role="dialog"` con `aria-modal` y
`aria-labelledby` apuntando al título. Lo que no tiene es portal: se renderiza
donde se lo monte. Mientras está abierto, **bloquea el scroll de la página de
atrás** (`body` en `overflow: hidden`) y lo devuelve como estaba al cerrarse,
así que dos modales apilados no se desbloquean entre sí.

### Avatar

**Path:** `components/ui/Avatar.tsx`
**Props:** `name`, `initials?` (si falta se derivan de `name` con `initials()` de
`lib/initials`).
**Notas:** es el círculo de la primera columna de las tablas de personas. Va
junto al nombre dentro de `.vz-table__ident`. Es decorativo (`aria-hidden`):
el nombre ya está escrito al lado. El avatar del rail es otro: lo dibuja
`RailUser`.

```tsx
cell: (c) => (
  <div className="vz-table__ident">
    <Avatar name={c.fullName} />
    <span className="vz-table__primary">{c.fullName}</span>
  </div>
)
```

### Breadcrumbs

**Path:** `components/ui/Breadcrumbs.tsx`
**Props:** `items: BreadcrumbItem[]`, con `BreadcrumbItem = { label, onClick? }`;
`onBack?: () => void`.
**Notas:** van arriba del título en las pantallas que cuelgan de otra (Registrar
causa, Detalle, Registrar acto). No sabe de rutas: cada paso avisa con `onClick`
y la pantalla navega. El último es la pantalla actual: siempre se muestra como
texto con `aria-current="page"`, aunque traiga `onClick`. Un paso sin `onClick`
también queda como texto (el SAC en Registrar causa, por ejemplo).

Con `onBack`, una flecha redonda y chica va antes de las migas
(`.vz-crumbs__back`, `aria-label="Volver"`). Las migas llevan siempre a la
sección; la flecha, a donde estaba el usuario: se arma con `useGoBack(respaldo)`
de `@/app/router/useGoBack`, que vuelve a la pantalla anterior de la aplicación
o, si se entró por la URL, va al respaldo. La llevan las pantallas que cuelgan
de otra; las secciones del rail no.

```tsx
const goBack = useGoBack(`/causas/${causa.id}`)

<Breadcrumbs
  items={[
    { label: 'Causas', onClick: () => navigate('/causas') },
    { label: causa.sacNumber, onClick: () => navigate(`/causas/${causa.id}`) },
    { label: 'Registrar acto procesal' },
  ]}
  onBack={goBack}
/>
```

### DetailList

**Path:** `components/ui/DetailList.tsx`
**Props:** `items: DetailItem[]`, con
`DetailItem = { label, note?: ReactNode, value: ReactNode, mono? }`.
**Notas:** un renglón por dato, etiqueta apagada a la izquierda y valor en
negrita a la derecha. Es un `<dl>`: el lector de pantalla anuncia cada valor con
su etiqueta. Un `value` en `null`, `undefined` o `''` se muestra como `—`; el
`0` se muestra, porque es un dato. Los valores llegan formateados por la
pantalla (`formatDate`, el DNI con puntos). Para una ficha, va adentro de un
`Panel` con `.vz-panel__body`.

`note` agrega un segundo renglón, chico y apagado, **debajo de la etiqueta**:
de dónde sale el dato. Es la prescripción de cada calificación en el "Resumen
del alta" ("8 años desde el 27/02/2021" bajo "Robo calificado"). Para una
aclaración **debajo del valor**, el `value` puede traer un
`<span className="vz-details__note">`: es el "El estado lo fija el primer acto
procesal" bajo el estado inicial de la causa, "Iniciada".

```tsx
<Panel title="Cliente">
  <div className="vz-panel__body">
    <DetailList
      items={[
        { label: 'DNI', value: formatDni(client.dni), mono: true },
        { label: 'Teléfono', value: client.phone },
        { label: 'Cliente desde', value: formatDate(client.clientSince), mono: true },
      ]}
    />
  </div>
</Panel>
```

### Meter

**Path:** `components/ui/Meter.tsx`
**Props:** `value`, `max?` (default 100), `label` (obligatoria: qué mide, para
el lector de pantalla), `valueText?` (cómo leer el valor: `'27 %'`),
`tone?: 'primary' | 'warn' | 'danger'` (default `primary`).
**Notas:** barra de cuánto de algo ya se ocupó: la prescripción transcurrida de
una causa, la carga de causas de un abogado contra el máximo del estudio. Es
`role="meter"`, no `progressbar`: no mide una tarea que termina. El valor se
recorta a `0…max`, así una prescripción cumplida llena la barra sin
desbordarla. El tono lo decide la pantalla (`warn` = cerca del límite, como el
bronce del prototipo pasado el 70 %).

### LoadingState / Skeleton

**Path:** `components/ui/Skeleton.tsx` · estilos en `styles/skeleton.css`
**`Skeleton` props:** `width?`, `height?` (número en px o medida CSS),
`shape?: 'line' | 'circle' | 'pill' | 'block'` (default `line`), `onDark?`
(sobre la banda oscura de los tableros o la cabecera de una tabla).
**`LoadingState` props:** `label` (obligatoria: lo que oye un lector de
pantalla, `'Cargando causa…'`), `children` (el esqueleto), `delayMs?`
(default 200), `className?`.

```tsx
if (query.isPending) return (
  <LoadingState label="Cargando causa…">
    <div className="vz-skel-card">
      <Skeleton width="40%" height={14} />
      <Skeleton width="80%" />
    </div>
  </LoadingState>
)
```

**Notas:**

- Todo `Skeleton` va dentro de un `LoadingState`. Es un `role="status"` con el
  texto de carga escondido a la vista; el esqueleto queda `aria-hidden`.
- **Espera 200 ms antes de verse**, así una respuesta rápida no lo hace
  parpadear. Mientras espera ya ocupa su lugar, invisible, y la página no salta.
- **No lleva texto.** Un título real adentro del esqueleto lo encontraría un
  test con `findByText` antes de que lleguen los datos.
- Clases para armarlo: `.vz-skel-card` (marco de tarjeta, `--roomy` para las
  grandes), `.vz-skel-card__foot`, `.vz-skel-stack` (renglones apilados),
  `.vz-skel-row` (piezas en fila, `--ruled` con filete) y `.vz-skel-grow`.
  Si existe la clase de la pieza de verdad (`.vz-case-head`, `.vz-timeline`,
  `.vz-dash-band`), usala: el esqueleto queda igual de grande.
- Con `prefers-reduced-motion` el brillo se apaga.

### Logo / RailUser

- `Logo` — `components/ui/Logo.tsx`. Prop `markOnly?` para dejar sólo el monograma.
  Pensado para fondo oscuro (`--vz-rail`).
- `RailUser` — `components/ui/RailUser.tsx`. Props `name`, `profile`, `initials?`
  (si falta se derivan del nombre con `initials()` de `lib/initials`),
  `onChangePassword()`, `onLogout()`.
  Va en `AppShell.railFooter`; ya está montado en `AppLayout`.

---

## Forms

Composición real:

```text
FormModal
└── Modal (ui)
    ├── Button ×2 (footer: cancel + confirm)
    └── .vz-form-grid
        ├── FormSection        (type: 'section')
        ├── Checkbox           (type: 'check')
        └── Field
            ├── TextInput      (type: 'text' | 'pass' | 'date', default)
            ├── Select         (type: 'select')
            └── Textarea       (type: 'area')
```

**Cuándo usar cada uno:**
- Alta, edición o confirmación de baja en un diálogo → `FormModal`.
- Formulario en la página (no en modal) → `Field` + controles sueltos dentro de un
  `<div className="vz-form-grid">`.
- Formulario de página con un panel al costado que se va completando (Registrar
  causa, Registrar acto procesal) → `.vz-split`: el formulario en un `Panel`
  con `.vz-panel__body`, y el panel lateral en un `<aside className="vz-split__aside">`.
  El lateral acompaña el scroll y, debajo de 1180px, pasa abajo del formulario.
- Un control suelto (filtro sobre una tabla) → `TextInput` / `Select` sin `Field`.

```tsx
<div className="vz-split">
  <Panel title="Datos del acto procesal" footer={botonera}>
    <div className="vz-panel__body vz-form-grid">…campos…</div>
  </Panel>
  <aside className="vz-split__aside">
    <Panel title="Cómputo del plazo">
      <div className="vz-panel__body"><DetailList items={…} /></div>
    </Panel>
  </aside>
</div>
```

### FormModal

**Path:** `components/forms/FormModal.tsx`
**Props:** `title`, `sub?`, `note?` (aclaración destacada arriba), `tone?: 'normal' | 'danger'`,
`width?: 'sm' | 'md' | 'lg'`, `fields?: FieldSpec[]`, `values: FormValues`,
`onChange(k, v)`, `okLabel?` (default `'Confirmar'`), `cancelLabel?` (default
`'Cancelar'`), `okDisabled?`, `onConfirm()`, `onCancel()`, `children?`.

**`FieldSpec`:** `k?` (clave del valor; no hace falta en `'section'`), `label`,
`type?: 'text' | 'pass' | 'select' | 'date' | 'area' | 'check' | 'section'`,
`width?: 'half' | 'full'`, `required?`, `mono?`, `placeholder?`, `note?`,
`error?` (mensaje de error **del campo**; lo decide la pantalla, igual que en
`Field`: oculta la `note` y pinta el control en rojo),
`options?: SelectOption[]` (ver `Select`: cadena suelta o par valor/etiqueta),
`when?: (values) => boolean` (campo condicional).

**`FormValues` = `Record<string, string | boolean>`** — sólo texto y booleanos.
Fechas y números se manejan como string.

```tsx
<FormModal
  title="Registrar cliente"
  fields={[
    { k: 'lastName', label: 'Apellido', required: true, width: 'half', error: errors.lastName },
    { k: 'firstName', label: 'Nombres', required: true, width: 'half', error: errors.firstName },
    { k: 'dni', label: 'DNI', required: true, mono: true, width: 'half', placeholder: '00.000.000' },
    { k: 'phone', label: 'Teléfono', mono: true, width: 'half' },
    { k: 'email', label: 'Correo electrónico', width: 'half' },
  ]}
  values={values}
  onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
  okLabel="Registrar cliente"
  okDisabled={saving}
  onConfirm={create}
  onCancel={close}
/>
```

**Notas:** no valida ni guarda — `okDisabled` y `onConfirm` los decide la
pantalla. `tone="danger"` pinta el confirmar en rojo y la nota en fondo de peligro:
es el modo "confirmar baja". El `children` se agrega debajo de los campos.

### Field y controles

**Path:** `components/forms/Field.tsx`
- `Field` — props `label`, `required?` (sólo el asterisco), `note?`, `hint?`, `error?`,
  `width?: 'half' | 'full'` (default `full` = ocupa las 2 columnas), `htmlFor?`, `children`.
  Con `error` oculta la `note` y pinta el control en rojo. `hint` es un dato
  chico a la derecha de la etiqueta, en monoespaciada: el contador de un texto
  largo (`hint="23 / 800"` en el objeto del reclamo). Lo calcula la pantalla;
  `Field` sólo lo ubica. Sin `hint`, la etiqueta se dibuja como siempre.
- `TextInput` — props de `<input>` + `mono?`.
- `Select` — props de `<select>` + `options: SelectOption[]`, con
  `SelectOption = string | { value: string; label: string }`. Una cadena suelta
  es el caso en que el valor y la etiqueta son lo mismo; el par separa el código
  que viaja del texto que se lee —`CRIMINAL` en la API, "Penal" en pantalla—,
  igual que `Tabs` separa `id` de `label`. `options` también acepta **grupos**,
  `SelectOptionGroup = { group: string; options: SelectOption[] }`, que se
  dibujan como `<optgroup>`: es el filtro de estado procesal de Causas, con los
  estados de cada fuero y los "Escritos a mano en causas". Se pueden mezclar con
  opciones sueltas (la de "Todos…" arriba). `FieldSpec.options` de `FormModal`
  sigue sin grupos.
- `Textarea` — props de `<textarea>`.
- `PasswordInput` — `components/forms/PasswordInput.tsx`. Props de `TextInput`
  salvo `type`: un ojo a la derecha muestra u oculta la contraseña. Ese estado
  vive adentro del componente, porque no es un dato del formulario, y arranca
  oculta. El nombre del botón ("Mostrar contraseña" / "Ocultar contraseña") es
  texto oculto y no `aria-label`, para no chocar con la etiqueta "Contraseña"
  del campo cuando un test la busca. Lo usa el login.
- `Checkbox` — props de `<input>` + `label: ReactNode`. Se dibuja como tarjeta clicable.
- `FormSection` — prop `label`. Separador de sección; ocupa las 2 columnas.

```tsx
<Select
  aria-label="Filtrar por estado procesal"
  options={[
    { value: '', label: 'Todos los estados procesales' },
    { group: 'Penal', options: penalStates },
    { group: 'Escritos a mano en causas', options: customStates },
  ]}
  value={stateFilter}
  onChange={(e) => changeState(e.target.value)}
/>
```

### Combobox

**Path:** `components/forms/Combobox.tsx`
**Props:** `id?` (para el `htmlFor` de `Field`), `value` (el texto escrito),
`onChange(text)`, `onSelect(option)`, `options: ComboboxOption[]`,
`placeholder?`, `emptyText?`, `disabled?`, `mono?`.
`ComboboxOption = { value, label, description? }`.
**Notas:** campo de texto con lista que **también acepta lo que se escriba**
aunque no esté en la lista: el "Estado procesal al que pasa la causa" del acto,
que se elige de la tabla del fuero o se escribe a mano. Si sólo se puede elegir,
va un `Select`.
- **No filtra.** La pantalla recibe cada tecla en `onChange`, decide qué
  opciones corresponden y las pasa en `options`. Elegir de la lista avisa con
  `onSelect`. Si el texto final coincide con una opción es asunto de la pantalla
  (el contrato pide mandar el `proceduralStateId` en ese caso).
- Teclado del patrón combobox de ARIA: flechas recorren la lista (y la abren),
  Enter elige, Escape cierra sin cerrar el modal de atrás. El foco se queda en
  el campo; la opción marcada va en `aria-activedescendant`.
- Muestra un tilde en la opción cuyo `label` coincide con el texto escrito.
- Sin opciones, la lista sólo se abre si hay `emptyText`.
- Usa `.vz-input`, así que adentro de un `Field` con `error` se pinta en rojo
  igual que los demás controles.

```tsx
<Field label="Estado procesal al que pasa la causa" htmlFor="state" error={errors.state}>
  <Combobox
    id="state"
    value={stateText}
    onChange={setStateText}
    onSelect={(o) => { setStateText(o.label); setStateId(o.value); }}
    options={states.filter((s) => s.label.toLowerCase().includes(stateText.toLowerCase()))}
    emptyText="Escribí el estado procesal."
  />
</Field>
```

### SegmentedControl

**Path:** `components/forms/SegmentedControl.tsx`
**Props:** `options: SelectOption[]`, `value`, `onChange(value)`, `aria-label?` o
`aria-labelledby?`, `disabled?`.
**Notas:** elegir una entre pocas opciones cortas, todas a la vista: el "Rol
procesal del cliente" del alta de causa. Es un `radiogroup` de botones: el
tabulador entra por la opción elegida (una sola parada) y las flechas cambian
la elección. **Necesita nombre**: un grupo no se enlaza con `<label htmlFor>`,
así que se pasa `aria-label` o el id de la etiqueta en `aria-labelledby`. Para
más de cuatro opciones o textos largos, `Select`.

```tsx
<SegmentedControl
  aria-label="Rol procesal del cliente"
  options={[{ value: 'DEFENSA', label: 'Defensa' }, { value: 'QUERELLANTE_PARTICULAR', label: 'Querellante particular' }]}
  value={role}
  onChange={setRole}
/>
```

---

## Hooks

### useDebouncedValue

**Path:** `hooks/useDebouncedValue.ts`
**Firma:** `useDebouncedValue<T>(value: T, delay = 200): T`

Devuelve `value`, pero recién cuando lleva `delay` milisegundos sin cambiar.
Es para el buscador de un listado: como la búsqueda va en la clave de caché,
sin demora sale un pedido por cada tecla.

```tsx
const [search, setSearch] = useState('')
const debouncedSearch = useDebouncedValue(search.trim())

const query = useClients({
    page,
    limit: LIMIT,
    search: debouncedSearch === '' ? undefined : debouncedSearch,
})

<SearchInput value={search} onChange={(e) => changeSearch(e.target.value)} />
```

- El input usa `search`, así muestra cada letra al instante; a la consulta va
  `debouncedSearch`. La variable se llama así en todas las páginas.
- Sólo para texto que se tipea. Un select, una pestaña o el paginado no llevan
  demora: tienen que responder al toque.
- Lo usan Clientes, Abogados, Usuarios y Estados y plazos. Su test está en
  `tests/components/shared/useDebouncedValue.test.ts`.

---

## API

### http

**Path:** `api/http.ts` — instancia de axios.
`baseURL = import.meta.env.VITE_API_URL ?? '/api'`, `timeout` 15 s,
`Content-Type: application/json`.

- **Interceptor de request:** agrega `Authorization: Bearer <token>`. El token
  sale de `localStorage`, de la clave `TOKEN_KEY` (`'vz.token'`), que este
  archivo exporta para que tenga un solo dueño: quien lo **escribe** es
  `features/auth/utils/sessionStorage.ts`; acá sólo se lee.
- **Interceptor de respuesta:** todo error sale convertido en `ApiError`. Un `catch`
  nunca ve un `AxiosError`.
- **Parseo del error:** lee la forma que fija el contrato (§5.2),
  `{ error: { code, message, details } }`, más el `{ statusCode, error, message }`
  del `401` de `/auth/login`, que es la única excepción. Queda una red de
  seguridad para un `message` suelto en la raíz; **no es un formato soportado**:
  si aparece, hay que corregir el backend.

#### Renovación de la sesión

El interceptor de respuesta hace algo más que normalizar el error: cuando llega
un `401` con el código **`UNAUTHENTICATED`** —"tu token no sirve"— intenta
renovar la sesión y reintenta el pedido. Se compara el *código* y no el `401`
pelado a propósito: `INVALID_CREDENTIALS` también es 401, pero significa "te
equivocaste al entrar", y no tiene que disparar nada; si no, cada intento
fallido de login trataría de renovar una sesión que no existe.

`shared/api` no sabe cómo se renueva ni qué significa quedarse afuera. Eso lo
enchufa `AuthProvider` al montarse, con dos funciones que este archivo exporta:

| Export | Qué es |
| --- | --- |
| `setRenewHandler(fn)` | Cómo renovar. `fn` devuelve `true` si consiguió un token nuevo |
| `setUnauthenticatedHandler(fn)` | Qué hacer cuando ya no hay forma de seguir: cerrar la sesión |
| `TOKEN_KEY` | La clave del token en `localStorage` |

Tres detalles que conviene conocer antes de tocar esto:

- **Se renueva una sola vez aunque fallen cinco pedidos a la vez.** Si una
  pantalla dispara cinco y los cinco vuelven con el token vencido, los cinco
  esperan la misma renovación. No es un lujo: el backend rota el token de
  renovación en cada uso y, si le llega uno ya usado, da la sesión por robada y
  la revoca entera.
- **`/auth/refresh` y `/auth/logout` no se renuevan.** El primero *es* la
  renovación, y renovarla giraría para siempre; en el segundo la persona se
  está yendo, y gastar la última renovación para después cerrar la sesión no
  tiene sentido.
- **Un pedido se reintenta una vez y no más.** Si vuelve a fallar, se llama al
  handler de "sin sesión" y el error se propaga igual.

Desde una feature no hay que hacer nada de esto: se llama a `http` y, si la
sesión se puede salvar, se salva sola.

### contract

**Path:** `api/contract.ts` — la forma de los errores según el contrato.
Exporta `ERROR_CODES` / `ErrorCode` (41 códigos: el catálogo de V5 §5.3 —con
los del Sprint 4, `DOCUMENT_NOT_FOUND`, `CASE_FOLDER_NOT_AVAILABLE` y
`DOCUMENT_NOT_CONVERTIBLE`— más `LAWYER_ALREADY_LINKED`, que V5 no lista; sin
`PROCEDURAL_STATE_HAS_DEPENDENCIES` ni `PROCEDURAL_STATE_IN_USE`, que el
contrato retiró),
`isErrorCode()`, `ErrorBody` y `LoginErrorBody`.
Vive en `api/` y no en `mocks/` porque es contrato de producción; los mocks
lo reexportan desde acá.

### ApiError / isApiError

**Path:** `api/ApiError.ts`

| Campo | Tipo | Qué trae |
| --- | --- | --- |
| `status` | `number` | Código HTTP; `0` = el request nunca llegó |
| `message` | `string` | El mensaje del contrato, en español y listo para mostrar |
| `code` | `string \| null` | El código del contrato: `USER_NOT_FOUND`, etc. `null` si la respuesta no trae |
| `details` | `Record<string,string> \| null` | Errores campo → mensaje de los `400 VALIDATION_ERROR` |

**Métodos:** `is(code)` (compara contra un `ErrorCode`, con autocompletado),
`fieldError(campo)`, `hasFieldErrors`, `detailList` (lista `"campo: mensaje"`).
**Getters:** `isConflict` (409), `isNotFound` (404), `isValidation` (**400**),
`isBusinessRule` (**422**), `isAuth` (401/403), `isServer` (≥500),
`isNetworkError` (`status === 0`).

> `isValidation` es **sólo 400**. El contrato separa "datos inválidos" (400) de
> "violación de una regla de negocio" (422), que es `isBusinessRule`.

```tsx
try {
  await http.post('/users', datos)
} catch (e) {
  if (!isApiError(e)) throw e

  // Dos 409 distintos, sin mirar el texto del mensaje.
  if (e.is('USERNAME_ALREADY_EXISTS')) return setError('username', e.message)

  // Errores por campo de un 400.
  if (e.isValidation && e.hasFieldErrors) return setErrores(e.details!)

  mostrarToast('error', e.message)
}
```

El `message` ya viene en español y legible: si el backend no mandó nada útil,
`http.ts` pone un texto por código HTTP. **No escribir mensajes de error genéricos
propios: usar `e.message`.** Para ramificar por tipo de error usar `e.is(...)` o
los getters, nunca comparar `e.message`.

### queryClient

**Path:** `api/queryClient.ts` — instancia única, ya montada por
`@/app/providers/QueryProvider` en `App.tsx`.
- Queries: `staleTime` 60 s; reintenta hasta 2 veces **sólo** en error de red o 5xx.
- Mutations: `retry: false` (nunca reintentar POST/PATCH/DELETE).

Las features usan `useQuery` / `useMutation` normalmente; no hay que configurar nada.

---

## Estilos y design tokens

El CSS es **global**, vive en `src/styles/` y se importa una sola vez en
`src/main.tsx` (`import '@/styles/index.css'`). No hay Tailwind, ni CSS Modules, ni
styled-components, ni dark mode, ni theming. Un componente nuevo se estiliza con
las clases `vz-*` existentes o agregando reglas al archivo que corresponda.

| Archivo | Contenido |
| --- | --- |
| `tokens.css` | Variables `--vz-*` (única fuente de color, radio, densidad) |
| `base.css` | Reset, tipografía, `.vz-mono`, `.vz-eyebrow`, `.vz-muted`, `.vz-sr-only` |
| `shell.css` | `.vz-app`, `.vz-rail*`, `.vz-topbar`, `.vz-search*`, `.vz-iconbtn`, `.vz-notice*`, `.vz-page-head*`, `.vz-crumbs*`, `.vz-split*` |
| `controls.css` | `.vz-btn*` (y `.is-pressed`), `.vz-field`, `.vz-label*` (y `.vz-label-row`, `.vz-label__hint`), `.vz-input/select/textarea`, `.vz-check`, `.vz-form-grid`, `.vz-form-sep*`, `.vz-combobox*`, `.vz-segmented*`, `.vz-form-actions*`, `.vz-field-row` |
| `table.css` | `.vz-panel*` (y `.vz-panel__body`), `.vz-table*`, `.vz-filters`, `.vz-pager*`, `.vz-avatar`, `.vz-details*` (y `.vz-details__note`), `.vz-meter*`, `.vz-load*` |
| `feedback.css` | `.vz-pill*`, `.vz-dot`, `.vz-tabs`, `.vz-modal*`, `.vz-empty*`, `.vz-callout*`, `.vz-checklist*`, `.vz-overline` |
| `cases.css` | `.vz-case-head*`, `.vz-presc*`, `.vz-picker*`, `.vz-due*`, `.vz-summary*`, `.vz-person-name`: lo propio de las pantallas de causas y actos |
| `login.css` | `.vz-login*`: lo propio de la pantalla de login |

`index.css` es el punto de entrada: importa la tipografía y después los ocho
archivos, con `tokens.css` primero porque todo el resto depende de sus
variables. `cases.css` y `login.css` son de un área del sistema, no de
`shared`: se usan sólo desde sus módulos.

### Tokens principales (`tokens.css`)

- **Superficies:** `--vz-canvas` `#F6F7F4`, `--vz-surface` `#FFFFFF`, `--vz-sunken` `#F1F3EF`
- **Rail oscuro:** `--vz-rail` `#0C1406`, `--vz-rail-fg`, `--vz-rail-fg-on`, `--vz-rail-on-bg`, `--vz-rail-div`
- **Texto:** `--vz-ink` `#0F172A`, `--vz-muted` `#5A6560`, `--vz-faint` `#68716C`
- **Bordes:** `--vz-border` `#DDE2DC`, `--vz-border-strong` `#C3CBC1`
- **Verde institucional:** `--vz-primary` `#406640`, `--vz-primary-hi`, `--vz-primary-soft`
- **Semántica:** `--vz-ok`, `--vz-warn`, `--vz-danger` (cada uno con `-bg` y `-bd`),
  `--vz-danger-action`, `--vz-danger-action-bd`, `--vz-warn-mark` (el bronce de
  relleno de una barra cerca del límite)
- **Radios:** `--vz-r` 12px, `--vz-r-sm` 8px, `--vz-r-btn` / `--vz-r-pill` 999px
- **Sombras:** `--vz-card-sh` (none), `--vz-pop-sh`
- **Tipografía:** `--vz-font` Figtree, `--vz-font-mono` Roboto Mono
- **Layout/densidad:** `--vz-rail-w` 248px, `--vz-main-pad`, `--vz-row`, `--vz-cell-y`

**Breakpoints reales**, los del prototipo. No se agregan otros:

| Corte | Qué cambia |
|---|---|
| 1180px | `.vz-split` pasa a una columna y el panel lateral va abajo. Las tablas sueltan su ancho mínimo y esconden las columnas `hideWhenNarrow` |
| 1023px | El rail sale de la pantalla y se abre con el botón de la barra superior |
| 860px | El login queda en una columna; `.vz-form-row3`, en dos |
| 720px | Teléfono: `.vz-form-grid` en una columna, tablas como tarjetas, filtros de a dos, modal casi a pantalla completa, menos aire (`--vz-main-pad`, `--vz-panel-pad`); en los `select` lo elegido va en un renglón y se pierde bajo la flecha si no entra |

Una pantalla nueva armada con los componentes y las clases de `shared` ya es
responsive. Si necesita CSS propio, usa estos cortes y prueba a 375px que nada
se salga de la pantalla.

**Regla del proyecto:** no hardcodear colores, siempre `var(--vz-*)`.

### Clases útiles sin componente

`.vz-empty` + `.vz-empty__title` + `.vz-empty__text` (estado vacío),
`.vz-form-actions` + `.vz-form-actions__note` (botonera al pie de un formulario
de página), `.vz-field-row` (un control con un botón al lado),
`.vz-callout` (recuadro destacado: la carátula sugerida), `.vz-checklist`
(lista de requisitos con tilde), `.vz-overline` (rótulo chico sobre un bloque),
`.vz-load` (número con su barra en una celda),
`.vz-notice` / `--danger` / `--warn` (aviso compacto de la topbar),
`.vz-table__primary` / `.vz-table__secondary` (dos renglones en una celda),
`.vz-table__ident` (avatar + nombre en una celda),
`.vz-panel__body` (padding para un panel que envuelve un formulario o una ficha
y no una tabla), `.vz-split` + `.vz-split__aside` (formulario de página con
panel al costado), `.vz-mono`, `.vz-muted`, `.vz-faint`, `.vz-sr-only`.

---

## API pública vs. interna

### Pública (exportada por los barrels)

`AppShell`, `Avatar`, `Breadcrumbs`, `Button`, `DataTable`, `DetailList`, `Icon`,
`ICONS`, `IconButton`, `Logo`, `Meter`, `Modal`, `PageHeader`, `Pagination`,
`Panel`, `Pill`, `RailUser`, `SearchInput`, `Tabs`, `Field`, `TextInput`,
`Select`, `Textarea`, `Checkbox`, `FormSection`, `Combobox`, `SegmentedControl`,
`FormModal`.

Tipos: `AppShellProps`, `RailGroup`, `RailItem`, `AvatarProps`,
`BreadcrumbItem`, `BreadcrumbsProps`, `ButtonProps`, `Column`,
`DataTableProps`, `DetailItem`, `DetailListProps`, `IconProps`, `IconName`,
`IconButtonProps`, `MeterProps`, `MeterTone`, `ModalProps`,
`PageHeaderProps`, `PaginationProps`, `PanelProps`, `PillProps`, `PillTone`,
`RailUserProps`, `TabsProps`, `FieldProps`, `SelectOption`,
`SelectOptionGroup`, `ComboboxOption`, `ComboboxProps`,
`SegmentedControlProps`, `FieldSpec`, `FormModalProps`, `FieldType`,
`FormValues`.

`api/`, `lib/` y `hooks/` son públicos también, pero se importan por ruta
directa (no tienen barrel).

### Interno / no exportado

- `LogoProps` (la interfaz existe en `Logo.tsx` pero el barrel no la reexporta).
- Los tipos de props de `TextInput`, `Select`, `Textarea`, `Checkbox` y `FormSection`
  (están declarados inline).
- En `http.ts`: `ParsedError`, `parseDetails`, `parseErrorBody`, `FALLBACK_MESSAGES`,
  `fallbackMessage`, `toApiError`, `getToken` — detalle de implementación del
  interceptor.

---

## Recursos que NO están en shared (pero se usan desde las features)

| Recurso | Dónde está | Para qué |
| --- | --- | --- |
| `useToast()` / `ToastProvider` | `@/app/providers/ToastContext.ts`, `ToastProvider.tsx` | Avisos. Devuelve la función directo: `toast('success' \| 'error' \| 'info', mensaje)` |
| `useAuth()` / `useCurrentUser()` | `@/app/providers/AuthContext.ts` | La sesión: `session`, `signIn`, `signOut(motivo)`, `leftOnPurpose`. `useCurrentUser()` es el atajo para las pantallas que viven detrás de la guarda, donde siempre hay alguien adentro |
| `AuthProvider` | `@/app/providers/AuthProvider.tsx` | Monta la sesión y le enchufa a `http` cómo renovar y qué hacer al quedar afuera |
| `QueryProvider` | `@/app/providers/QueryProvider.tsx` | Monta `queryClient` + devtools |
| `ROUTE_ACCESS` / `canAccess` / `useCanAccess` | `@/app/access/access.ts`, `useCanAccess.ts` | Quién ve cada sección: de ahí leen el rail y `RequireAccess` |
| `ACTION_ACCESS` / `can` / `useCan` | `@/app/access/access.ts`, `useCan.ts` | Quién opera una acción de una pantalla que ven todos: "Registrar abogado" es sólo del Administrador |
| `AppLayout` / `AuthLayout` / `NotFoundLayout` | `@/app/layouts/` | Marco con sesión, sin sesión y para las rutas desconocidas |
| `RequireSession` / `RedirectIfSession` | `@/app/router/` | Las guardas: sin sesión al login, con sesión fuera del login |
| `router` | `@/app/router/index.tsx` | Rutas; las pantallas nuevas se registran acá |
| Envoltorios de respuesta | `@/api-contract/envelopes.ts` | `ApiItem`, `ApiList`, `Pagination`, `PaginatedQuery` |
| Estilos `vz-*` | `@/styles/` | Ver sección anterior |

---

## Observaciones

Puramente informativo; nada de esto está resuelto ni debe corregirse al paso.

- **`components/feedback/` está vacía** aunque existan los estilos `.vz-empty` y
  `.vz-notice`, y aunque el toast ya esté implementado en `app/providers/`. Candidatos
  a extraer si se repiten: `EmptyState` (hoy cada `DataTable.empty` lo escribe a mano)
  y `Notice`.
- **`Logo` exporta `LogoProps` pero el barrel no**, a diferencia del resto de los
  componentes. Export inconsistente.
- **`SearchInput` no tiene interfaz de props propia** ni tipo exportado, a diferencia
  del resto.
- **Los formularios son una decisión pendiente.** `react-hook-form` está en
  `package.json` y no lo usa nadie; `zod` ni siquiera está instalado. Hoy
  `FormModal` maneja los valores de forma controlada (`values` + `onChange`) y
  la validación son funciones puras en el `schemas/` de cada feature. Definir
  con qué van los formularios nuevos **antes** de mezclar los dos patrones.
- **`FormValues` sólo admite `string | boolean`.** Un formulario con multi-select,
  fechas como `Date` o números tipados no entra en `FormModal` sin cambiarlo.
- **`api/` y `lib/` no tienen barrel** mientras que `components/` sí. Imports
  asimétricos.
- **El `422` y el `400` no comparten getter.** `isValidation` es sólo 400 y
  `isBusinessRule` es 422, siguiendo la separación del contrato.
- **`src/app/router/SectionPlaceholder.tsx` quedó huérfano** (fuera de shared):
  no lo importa nadie desde que las secciones sin pantalla caen en
  `NotFoundLayout`.
- No se detectaron componentes duplicados ni solapados dentro de `shared`.
- **`UsersTable` todavía dibuja su avatar a mano** (`<span className="vz-avatar">`
  con su propia función `initials()`), de antes de que existiera `Avatar`. Al
  tocar esa tabla, reemplazarlo por `<Avatar name={u.fullName} />`.

---

# Guía rápida para Claude Code

1. **Leer este README antes de crear cualquier componente.** Si el recurso está en la
   tabla "Si necesitás X, usá Y", usarlo; recién abrir el `.tsx` si hace falta un
   detalle que no esté documentado acá.
2. **Importar desde los barrels**: `@/shared/components/ui` y
   `@/shared/components/forms` (o `@/shared/components`). `api/` va por ruta directa.
   Siempre con el alias `@`, nunca con `../../..`.
3. **Las props son en inglés y los componentes son presentacionales.** El estado,
   la validación, el orden y el filtrado son responsabilidad de la pantalla. No
   agregar lógica de negocio dentro de `shared`. Los textos que ve el usuario van
   en castellano.
4. **Patrón de pantalla de listado:**
   `PageHeader` → `Panel` (con `actions` = filtros) → `DataTable` → `FormModal` para
   alta/edición/baja. Seguirlo salvo que la pantalla pida otra cosa.
5. **Estilos:** usar clases `vz-*` y tokens `var(--vz-*)`. Nada de colores
   hardcodeados, ni CSS-in-JS, ni librerías de UI nuevas. Si falta una clase, se
   agrega al archivo de `src/styles/` que corresponda por tema.
6. **Iconos:** sólo los de `ICONS`. Si falta uno, agregar el path ahí (24×24, trazo
   1.7) en vez de meter un SVG suelto en la feature.
7. **Backend:** siempre por `http`; los errores ya llegan como `ApiError` con el
   mensaje del contrato en español listo para mostrar (`isApiError(e) && e.message`),
   más `e.code` para ramificar y `e.details` para marcar campos.
8. **Avisos al usuario:** `useToast()` de `@/app/providers/ToastContext`, no un
   componente propio.
9. **Antes de crear algo en `shared/hooks`, `lib` o `types`:** `types/` está
   vacía a propósito, `hooks/` tiene un archivo (`useDebouncedValue.ts`) y
   `lib/` tiene dos (`dates.ts`, `initials.ts`). Si algo lo usa una sola feature, va en
   `src/features/<feature>/`; sólo sube a `shared` cuando lo compartan dos o
   más. La excepción son los controles genéricos que no saben nada del dominio
   (`Combobox`, `SegmentedControl`): van a `shared` desde el primer uso, igual
   que `Select`. (`mocks/` también es excepción: ya está poblada, porque el
   contrato de API es uno solo para todas las features.)
10. **Si un componente de `shared` casi sirve, extenderlo antes de duplicarlo** (una
    prop opcional nueva, una variante más), y actualizar este README con el cambio.
