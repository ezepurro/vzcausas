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
│   ├── ui/                   13 componentes + index.ts
│   ├── forms/                Field.tsx, FormModal.tsx + index.ts
│   └── feedback/             VACÍA (sólo .gitkeep)
├── hooks/                    VACÍA (sólo .gitkeep)
├── lib/                      VACÍA (sólo .gitkeep)
├── mocks/                    API v1 simulada (ver su propio README)
│   ├── contract.ts           tipos del contrato
│   ├── fixtures.ts           datos semilla
│   ├── responses.ts          una respuesta por cada código documentado
│   ├── db.ts                 base en memoria + resetMockDb()
│   ├── handlers.ts           servidor falso: resolveRequest()
│   ├── msw-handlers.ts       capa MSW (navegador y Node)
│   ├── browser.ts            startMocks() — service worker
│   ├── server.ts             setupServer — tests en Node
│   └── index.ts              barrel
└── types/                    VACÍA (sólo .gitkeep)
```

Hoy **no existen** hooks, utilidades ni tipos de dominio compartidos. Si una
feature necesita uno, es un archivo nuevo, no algo que haya que buscar.

`mocks/` sí existe: implementa `docs/api contract v1.md` sobre **MSW**, que
intercepta la red de verdad (los pedidos se ven en la pestaña Network). Se
enciende con `await startMocks()` de `@/shared/mocks/browser`. **Leer
`mocks/README.md` antes de escribir una llamada a la API**: ahí están las
divergencias del contrato y los huecos que el mock tuvo que completar.

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
- **`api/` no tiene barrel**: se importa archivo por archivo.
- El código existente (`AppLayout`, `AuthLayout`) importa desde
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
| `Tabs` | Component | `components/ui/Tabs.tsx` | Pestañas |
| `Button` | Component | `components/ui/Button.tsx` | Acciones |
| `IconButton` | Component | `components/ui/IconButton.tsx` | Acción sólo icono (40px) |
| `Icon` / `ICONS` | Component + const | `components/ui/Icon.tsx` | Set de iconos SVG |
| `Pill` | Component | `components/ui/Pill.tsx` | Estado / semáforo de plazos |
| `SearchInput` | Component | `components/ui/SearchInput.tsx` | Buscador de la topbar |
| `Modal` | Component | `components/ui/Modal.tsx` | Diálogo genérico |
| `FormModal` | Component | `components/forms/FormModal.tsx` | Alta / edición / baja declarativa |
| `Field` | Component | `components/forms/Field.tsx` | Label + control + nota + error |
| `TextInput` `Select` `Textarea` `Checkbox` | Components | `components/forms/Field.tsx` | Controles sueltos |
| `FormSection` | Component | `components/forms/Field.tsx` | Separador dentro del form |
| `http` | Axios instance | `api/http.ts` | Todas las llamadas al backend |
| `ApiError` / `isApiError` | Class + guard | `api/ApiError.ts` | Errores normalizados: `status`, `code`, `details` |
| `ERROR_CODES` / `ErrorCode` | Const + type | `api/contract.ts` | Códigos de error del contrato |
| `queryClient` | QueryClient | `api/queryClient.ts` | Config de react-query |
| `startMocks` | Función | `mocks/browser.ts` | Enciende la API simulada (async) |
| `server` | SetupServer | `mocks/server.ts` | Los mismos handlers para tests en Node |
| `resolveRequest` | Función | `mocks/handlers.ts` | Servidor falso puro, sin MSW |
| `RESPONSES` / `ERRORS` | Const | `mocks/responses.ts` | Fixtures por endpoint y código |
| `resetMockDb` | Función | `mocks/db.ts` | Vuelve los datos del mock al estado inicial |

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
| Filtros sobre una tabla | `Panel actions={...}` | Se renderiza en `.vz-filters` |
| Buscador | `SearchInput` | Pensado para la topbar |
| Iconos | `Icon name="..."` | Sólo los nombres de `ICONS` |
| Estado vacío de tabla | `DataTable empty={...}` con clases `.vz-empty` | **No hay componente**, ver Observaciones |
| Avisos / toasts | `useToast()` de `@/app/providers/ToastContext` | **Vive fuera de shared** |
| Cache y fetching | `queryClient` ya configurado en `QueryProvider` | No crear otro `QueryClient` |
| Llamar al backend | `http` | Nunca `fetch` ni `axios` directo |
| Trabajar sin backend levantado | `await startMocks()` de `@/shared/mocks/browser` | `VITE_USE_MOCKS=true`; ver `mocks/README.md` |
| Mockear sólo una parte de la API | `startMocks({ passthrough: ['/lawyers'] })` | El resto sale al backend real |
| Datos de prueba para un test | `RESPONSES` / `resolveRequest` de `@/shared/mocks` | No hace falta instalar el adapter |
| Manejar errores de API | `isApiError(e)` + `e.is(codigo)` / getters | Nunca comparar `e.message` |
| Marcar campos inválidos en un form | `e.details` / `e.fieldError('username')` | Sólo en los `400 VALIDATION_ERROR` |
| Loaders / skeletons / alerts inline | **No existen** | Definirlos en la feature |

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
si falta, el ítem en `AppLayout`. El texto de `railAction` debe ir envuelto en
`<span className="vz-rail__action-label">` para que se oculte con el rail colapsado.

### PageHeader

**Path:** `components/ui/PageHeader.tsx`
**Props:** `eyebrow?` (mayúsculas, suele ser el grupo del rail), `title`, `sub?`, `actions?`.

```tsx
<PageHeader
  eyebrow="Administración"
  title="Clientes"
  sub="Personas y empresas representadas por el estudio."
  actions={<Button icon={<Icon name="plus" />}>Nuevo cliente</Button>}
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
`minWidth?` (default 960), `empty?`.
**`Column<T>`:** `id`, `header`, `cell(row) => ReactNode`, `mono?` (tipografía
monoespaciada: SAC, fechas, importes), `nowrap?`, `actions?` (alinea a la derecha),
`width?`.

```tsx
<DataTable
  columns={[
    { id: 'name', header: 'Cliente', cell: (c) => c.name },
    { id: 'dni', header: 'DNI', cell: (c) => c.dni, mono: true },
    { id: 'acc', header: '', actions: true,
      cell: (c) => <Button variant="ghost" size="sm" onClick={() => edit(c)}>Editar</Button> },
  ]}
  rows={clients}
  rowKey={(c) => c.id}
  empty={<div className="vz-empty"><div className="vz-empty__title">Sin clientes</div></div>}
/>
```

**Notas:** genérica en `T`. No ordena, no filtra, no pagina: eso lo resuelve la
pantalla antes de pasar `rows`. Si no se pasa `empty`, con 0 filas dibuja la
tabla vacía igual.

### Button

**Path:** `components/ui/Button.tsx` — extiende `ButtonHTMLAttributes`.
**Props:** `variant?: 'primary' | 'secondary' | 'danger' | 'ghost'` (default `primary`),
`size?: 'lg' | 'md' | 'sm'` (default `lg` = 40px), `block?`, `icon?: ReactNode`.
**Notas:** `type` por defecto es `"button"`; para enviar un `<form>` hay que pasar
`type="submit"` explícito.

### IconButton

**Path:** `components/ui/IconButton.tsx`
**Props:** `name: IconName`, `label: string` (obligatoria: es el `aria-label`
y el `title`), más los atributos de `<button>`. Cuadrado de 40px.

### Icon / ICONS

**Path:** `components/ui/Icon.tsx`
**Props:** `name: IconName`, `size?` (default 17), `className?`.
**Nombres disponibles:** `home`, `cases`, `deadlines`, `clients`, `templates`,
`users`, `lawyers`, `timeLimits`, `reports`, `search`, `notifications`,
`password`, `logout`, `plus`, `alert`, `download`, `back`.
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
props extra; renderiza icono + `<input type="search">`. No debounce, no busca.

### Modal

**Path:** `components/ui/Modal.tsx`
**Props:** `title`, `sub?`, `width?: 'sm' | 'md' | 'lg'` (default `md`), `footer?`
(la botonera), `onClose()`, `children`.
**Notas:** cierra al hacer click en el fondo. El comentario de la prop menciona
Escape, pero **no hay handler de teclado** (ver Observaciones). No tiene foco
atrapado ni portal: se renderiza donde se lo monte.

### Logo / RailUser

- `Logo` — `components/ui/Logo.tsx`. Prop `markOnly?` para dejar sólo el monograma.
  Pensado para fondo oscuro (`--vz-rail`).
- `RailUser` — `components/ui/RailUser.tsx`. Props `name`, `profile`, `initials?`
  (si falta se derivan del nombre), `onChangePassword()`, `onLogout()`.
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
- Un control suelto (filtro sobre una tabla) → `TextInput` / `Select` sin `Field`.

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
`options?: string[]`, `when?: (values) => boolean` (campo condicional).

**`FormValues` = `Record<string, string | boolean>`** — sólo texto y booleanos.
Fechas y números se manejan como string.

```tsx
<FormModal
  title="Nuevo cliente"
  fields={[
    { k: 'name', label: 'Nombre y apellido', required: true },
    { k: 'type', label: 'Tipo', type: 'select', options: ['Persona', 'Empresa'], width: 'half' },
    { k: 'cuit', label: 'CUIT', mono: true, width: 'half', when: (v) => v.type === 'Empresa' },
  ]}
  values={values}
  onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
  okLabel="Crear cliente"
  okDisabled={!values.name}
  onConfirm={create}
  onCancel={close}
/>
```

**Notas:** no valida ni guarda — `okDisabled` y `onConfirm` los decide la
pantalla. `tone="danger"` pinta el confirmar en rojo y la nota en fondo de peligro:
es el modo "confirmar baja". El `children` se agrega debajo de los campos.

### Field y controles

**Path:** `components/forms/Field.tsx`
- `Field` — props `label`, `required?` (sólo el asterisco), `note?`, `error?`,
  `width?: 'half' | 'full'` (default `full` = ocupa las 2 columnas), `htmlFor?`, `children`.
  Con `error` oculta la `note` y pinta el control en rojo.
- `TextInput` — props de `<input>` + `mono?`.
- `Select` — props de `<select>` + `options: string[]`. **Las opciones son strings
  planos: el value es el mismo texto**, no hay `{ value, label }`.
- `Textarea` — props de `<textarea>`.
- `Checkbox` — props de `<input>` + `label: ReactNode`. Se dibuja como tarjeta clicable.
- `FormSection` — prop `label`. Separador de sección; ocupa las 2 columnas.

---

## API

### http

**Path:** `api/http.ts` — instancia de axios.
`baseURL = import.meta.env.VITE_API_URL ?? '/api'`, `timeout` 15 s,
`Content-Type: application/json`.

- **Interceptor de respuesta:** todo error sale convertido en `ApiError`. Un `catch`
  nunca ve un `AxiosError`.
- **Interceptor de request:** agrega `Authorization: Bearer <token>`, pero
  `getToken()` hoy devuelve `null` a propósito (no hay login todavía).
- **Parseo del error:** lee la forma que fija el contrato (§4.2),
  `{ error: { code, message, details } }`, más el `{ statusCode, error, message }`
  del `401` de `/auth/login`, que es la única excepción. Queda una red de
  seguridad para un `message` suelto en la raíz; **no es un formato soportado**:
  si aparece, hay que corregir el backend.

### contract

**Path:** `api/contract.ts` — la forma de los errores según el contrato.
Exporta `ERROR_CODES` / `ErrorCode` (los 14 códigos documentados),
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
| `shell.css` | `.vz-app`, `.vz-rail*`, `.vz-topbar`, `.vz-search*`, `.vz-iconbtn`, `.vz-notice*`, `.vz-page-head*` |
| `controls.css` | `.vz-btn*`, `.vz-field`, `.vz-input/select/textarea`, `.vz-check`, `.vz-form-grid`, `.vz-form-sep*` |
| `table.css` | `.vz-panel*`, `.vz-table*`, `.vz-filters` |
| `feedback.css` | `.vz-pill*`, `.vz-dot`, `.vz-tabs`, `.vz-modal*`, `.vz-empty*` |

### Tokens principales (`tokens.css`)

- **Superficies:** `--vz-canvas` `#F6F7F4`, `--vz-surface` `#FFFFFF`, `--vz-sunken` `#F1F3EF`
- **Rail oscuro:** `--vz-rail` `#0C1406`, `--vz-rail-fg`, `--vz-rail-fg-on`, `--vz-rail-on-bg`, `--vz-rail-div`
- **Texto:** `--vz-ink` `#0F172A`, `--vz-muted` `#5A6560`, `--vz-faint` `#68716C`
- **Bordes:** `--vz-border` `#DDE2DC`, `--vz-border-strong` `#C3CBC1`
- **Verde institucional:** `--vz-primary` `#406640`, `--vz-primary-hi`, `--vz-primary-soft`
- **Semántica:** `--vz-ok`, `--vz-warn`, `--vz-danger` (cada uno con `-bg` y `-bd`),
  `--vz-danger-action`, `--vz-danger-action-bd`
- **Radios:** `--vz-r` 12px, `--vz-r-sm` 8px, `--vz-r-btn` / `--vz-r-pill` 999px
- **Sombras:** `--vz-card-sh` (none), `--vz-pop-sh`
- **Tipografía:** `--vz-font` Figtree, `--vz-font-mono` Roboto Mono
- **Layout/densidad:** `--vz-rail-w` 248px, `--vz-main-pad`, `--vz-row`, `--vz-cell-y`

**Breakpoints reales:** 1023px (rail colapsa a 64px y se ocultan las etiquetas vía
`--vz-rail-label`) y 640px (la grilla de formulario pasa a una columna).

**Regla del proyecto:** no hardcodear colores, siempre `var(--vz-*)`.

### Clases útiles sin componente

`.vz-empty` + `.vz-empty__title` + `.vz-empty__text` (estado vacío),
`.vz-notice` / `--danger` / `--warn` (aviso compacto de la topbar),
`.vz-table__primary` / `.vz-table__secondary` (dos renglones en una celda),
`.vz-mono`, `.vz-muted`, `.vz-faint`, `.vz-sr-only`.

---

## API pública vs. interna

### Pública (exportada por los barrels)

`AppShell`, `Button`, `DataTable`, `Icon`, `ICONS`, `IconButton`, `Logo`, `Modal`,
`PageHeader`, `Panel`, `Pill`, `RailUser`, `SearchInput`, `Tabs`, `Field`,
`TextInput`, `Select`, `Textarea`, `Checkbox`, `FormSection`, `FormModal`.

Tipos: `AppShellProps`, `RailGroup`, `RailItem`, `ButtonProps`, `Column`,
`DataTableProps`, `IconProps`, `IconName`, `IconButtonProps`, `ModalProps`,
`PageHeaderProps`, `PanelProps`, `PillProps`, `PillTone`, `RailUserProps`,
`TabsProps`, `FieldProps`, `FieldSpec`, `FormModalProps`, `FieldType`, `FormValues`.

`api/` es público también, pero se importa por ruta directa (no hay barrel).

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
| `useToast()` / `ToastProvider` | `@/app/providers/ToastContext.ts`, `ToastProvider.tsx` | Avisos: `show('success' \| 'error' \| 'info', mensaje)` |
| `QueryProvider` | `@/app/providers/QueryProvider.tsx` | Monta `queryClient` + devtools |
| `AppLayout` / `AuthLayout` | `@/app/layouts/` | Marco con y sin sesión |
| `router` | `@/app/router/index.tsx` | Rutas; las pantallas nuevas se registran acá |
| Estilos `vz-*` | `@/styles/` | Ver sección anterior |

---

## Observaciones

Puramente informativo; nada de esto está resuelto ni debe corregirse al paso.

- **`components/feedback/` está vacía** aunque existan los estilos `.vz-empty` y
  `.vz-notice`, y aunque el toast ya esté implementado en `app/providers/`. Candidatos
  a extraer si se repiten: `EmptyState` (hoy cada `DataTable.empty` lo escribe a mano)
  y `Notice`.
- **`Modal` documenta cierre con Escape pero no lo implementa** (`ModalProps.onClose`
  dice "click en el fondo o Escape"; sólo hay `onClick` en el backdrop). Tampoco
  atrapa el foco.
- **`Logo` exporta `LogoProps` pero el barrel no**, a diferencia del resto de los
  componentes. Export inconsistente.
- **`SearchInput` no tiene interfaz de props propia** ni tipo exportado, a diferencia
  del resto.
- **`react-hook-form` está en `package.json` pero no se usa en ningún lado.**
  `FormModal` maneja los valores de forma controlada (`values` + `onChange`). Definir
  si los formularios nuevos van con react-hook-form o con el patrón actual antes de
  mezclar los dos.
- **`FormValues` sólo admite `string | boolean`.** Un formulario con multi-select,
  fechas como `Date` o números tipados no entra en `FormModal` sin cambiarlo.
- **`api/` no tiene barrel** mientras que `components/` sí. Imports asimétricos.
- **`AuthLayout` usa estilos inline** (con tokens) porque el CSS del login todavía no
  está extraído a `src/styles/`.
- **`getToken()` en `http.ts` devuelve `null` fijo**: cuando exista el login hay que
  conectarlo, si no ningún request va autenticado. Mientras tanto, contra los mocks
  hay que mandar el header `Authorization` a mano o todo responde `401`.
- **El `422` y el `400` ya no comparten getter.** `isValidation` pasó a ser sólo
  400 y apareció `isBusinessRule` para 422, siguiendo la separación del contrato.
  No había consumidores al momento del cambio, pero conviene saberlo.
- **`npm run build` hoy falla por imports sin usar** (fuera de shared):
  `RouterProvider` en `app/router/index.tsx`, y `QueryProvider` / `ToastProvider` en
  `main.tsx`. `noUnusedLocals` está activo.
- No se detectaron componentes duplicados ni solapados dentro de `shared`.

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
9. **Antes de crear algo en `shared/hooks`, `lib` o `types`:** están vacías a
   propósito. Si algo lo usa una sola feature, va en `src/features/<feature>/`;
   sólo subir a `shared` cuando lo compartan dos o más. (`mocks/` es la
   excepción: ya está poblada, porque el contrato de API es uno solo para todas
   las features.)
10. **Si un componente de `shared` casi sirve, extenderlo antes de duplicarlo** (una
    prop opcional nueva, una variante más), y actualizar este README con el cambio.
