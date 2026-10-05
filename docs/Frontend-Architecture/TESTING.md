# Tests del frontend — VZ Causas

Este documento explica cómo se testea el frontend: con qué herramientas, qué se
testea en cada nivel, dónde va cada archivo y cómo se escribe un test. Lo que
acordamos en el equipo es que **cada uno testea sus propias features**, así que
la idea es que todos lo hagamos de la misma forma.

Si tenés una duda del tipo "¿este test dónde va?", saltá a
[Dónde pongo este test](#6-dónde-pongo-este-test).

> **Estado actual:** todo instalado y funcionando. Están escritos los tests de
> `auth`, `lawyers`, `legal-params`, `users`, el acceso por perfil (por ruta y
> por acción), las guardas del router, el `AppLayout`, el `Modal`, el `Field` y
> el `DetailList` de `shared`, el **servidor falso** (`unit/mocks/`) y, del
> Sprint 2, lo que ya existe de `cases` y `proceedings`, más los de `clients`,
> que se escribieron antes que la feature: **609 de Vitest pasando** en 57
> archivos y **17 de Playwright** en 5. A eso se suman los que esperan a que se
> programe Clientes: 37 de Vitest en 2 archivos y 3 de Playwright en 1 (ver
> [§3.1](#31-el-detalle-por-feature)). Los números son de la última corrida;
> los de hoy te los dice `npm test`. Los demás componentes de `shared` que se
> agregaron para el Sprint 2 (`Breadcrumbs`, `Combobox`, `SegmentedControl`,
> etc.) todavía no tienen test.
> Primera vez en tu máquina: `npm install` y `npx playwright install chromium`,
> que descarga el navegador de los E2E. Ese segundo paso hay que repetirlo cada
> vez que se actualiza Playwright (ver [§9](#9-problemas-comunes)).

---

## 1. El stack de testing

| Qué | Con qué | Para qué |
|---|---|---|
| Runner de tests unitarios y de componentes | **Vitest** | Usa la misma config de Vite (alias `@`, TypeScript, JSX), no hay que configurar nada aparte |
| Renderizar componentes | **React Testing Library** | Probar el componente como lo usa una persona: escribir, clickear, leer lo que aparece |
| Simular el navegador en Node | **jsdom** | Que Vitest tenga `document`, `window`, etc. |
| Interacciones realistas | **@testing-library/user-event** | Tipear y clickear como un usuario, no disparando eventos a mano |
| Matchers de DOM | **@testing-library/jest-dom** | `toBeInTheDocument()`, `toBeDisabled()`, `toHaveValue()`… |
| API simulada | **MSW** (ya instalado) | Los mismos handlers de `src/shared/mocks` que usamos para desarrollar |
| Tests de punta a punta | **Playwright** | Flujos completos en un navegador real |

---

## 2. Los tres niveles

Hacemos tres tipos de test. Cada uno cubre algo distinto y tiene su costo.

```
            ▲  más lento, más frágil, prueba más cosas juntas
            │
   ┌────────┴────────┐
   │      e2e/       │  Playwright · pocos · flujos críticos
   ├─────────────────┤
   │   components/   │  Vitest + RTL + MSW · la mayoría
   ├─────────────────┤
   │      unit/      │  Vitest · funciones puras · todos los casos
   └─────────────────┘
            │
            ▼  más rápido, más preciso para encontrar el error
```

### 2.1 `unit/` — funciones puras

Lo que está en `schemas/` y `utils/` de cada feature: funciones que reciben
datos y devuelven datos, sin React y sin red. Ejemplos: `validateLogin`,
`toCreateLawyerBody`, `buildUserPatch`.

- Son los tests más baratos: milisegundos cada uno.
- Acá se prueban **todos los casos borde**: campos vacíos, espacios, valores
  límite, combinaciones raras. Es el lugar para ser exhaustivo.
- No hace falta `render`, ni MSW, ni providers.

En este nivel van también los tests del **servidor falso**, en `unit/mocks/`.
`resolveRequest` de `@/shared/mocks` es una función común —recibe un pedido y
devuelve `{ status, body }`—, así que una regla del contrato se prueba sin
levantar MSW ni renderizar nada (ver
[§5.4](#54-un-test-del-servidor-falso)). Sirven para dos cosas: confirmar que
el mock responde lo que dice el contrato, y que los datos semilla no tienen
referencias rotas.

### 2.2 `components/` — componentes con la API simulada

Formularios, modales, tablas y páginas. Se renderiza el componente, se
interactúa como lo haría una persona y se verifica lo que aparece en pantalla.

- Las llamadas a la API **salen de verdad** por axios y las atrapa MSW con los
  handlers de `src/shared/mocks`. No se mockea axios ni React Query a mano.
- Se prueba lo que ve el usuario, no la implementación: nada de mirar el
  estado interno ni las props de un hijo.
- Para cada form o modal, **mínimo tres casos**: camino feliz, error de
  validación y error del servidor.

### 2.3 `e2e/` — flujos completos en el navegador

Playwright levanta la app y la maneja en un navegador real: router, cookies,
navegación entre pantallas, todo junto.

- **Corren contra la app con los mocks encendidos** (`VITE_USE_MOCKS=true`),
  no contra el backend real. Así son estables, no dependen de que el back ni la
  base estén levantados, y los tests de uno no le cambian los datos al otro.
- **Pocos:** entre 1 y 3 flujos por feature. Si un caso se puede probar en
  `components/`, va ahí.
- No son para casos borde. Son para confirmar que las piezas conectadas
  funcionan: "me logueo, creo un abogado, aparece en la tabla".

---

## 3. Mapa de carpetas

`tests/` vive en `frontend/`, al lado de `src/`. Adentro de cada nivel se
**repiten los nombres de las features de `src/features/`**, así cada uno sabe
cuál es su carpeta. Hay carpetas que no son una feature y siguen la misma
idea: `app/` para lo de `src/app/` (`unit/app/` para la tabla de acceso,
`components/app/` para las guardas del router y el `AppLayout`) y
`components/shared/`, para los componentes de `src/shared/` que tienen
comportamiento propio.

```
frontend/
├── src/                                  el código, no se toca
├── tests/
│   ├── setup/                            configuración compartida
│   │   ├── vitest.setup.ts               enciende MSW y limpia entre tests
│   │   └── render.tsx                    renderWithProviders()
│   │
│   ├── unit/                             Vitest · schemas/ y utils/
│   │   ├── app/                          las tablas de acceso: por ruta y por acción
│   │   ├── mocks/                        el servidor falso de src/shared/mocks
│   │   ├── auth/
│   │   ├── cases/
│   │   ├── clients/
│   │   ├── lawyers/
│   │   ├── legal-params/
│   │   └── users/
│   │
│   ├── components/                       Vitest + RTL + MSW
│   │   ├── app/                          guardas del router y AppLayout
│   │   ├── shared/                       componentes de src/shared/
│   │   ├── auth/
│   │   ├── cases/
│   │   ├── clients/
│   │   ├── lawyers/
│   │   ├── legal-params/
│   │   ├── proceedings/
│   │   └── users/
│   │
│   └── e2e/                              Playwright
│       ├── fixtures/                     helpers compartidos (loginAs, etc.)
│       ├── access.spec.ts
│       ├── auth.spec.ts
│       ├── clients.spec.ts
│       ├── lawyers.spec.ts
│       ├── legal-params.spec.ts
│       └── users.spec.ts
│
├── vitest.config.ts
├── playwright.config.ts
└── tsconfig.test.json                    los tests se chequean en `npm run build`
```

Los tests tienen el mismo chequeo de tipos que el código: `tsconfig.test.json`
está referenciado desde `tsconfig.json`, así que **un test que no compila
rompe el build**.

Las features que todavía no tienen código (`dashboard`, `deadlines`,
`documents`) **no tienen carpeta en `tests/`**. De las del Sprint 2, `cases` y
`proceedings` tienen test de lo que ya existe —esquemas, utilidades y
componentes—, salvo las piezas que se listan en [§3.1](#31-el-detalle-por-feature);
les faltan los de las páginas, que todavía no están programadas. `clients`
tiene los tests completos, escritos antes que su página. La carpeta se crea
cuando alguien empieza a trabajar la feature (ver
[sección 7](#7-cuando-arrancás-una-feature-nueva)). `home` sí tiene código y
tampoco tiene carpeta: su `HomePage` es presentación pura, ver
[§3.2](#32-lo-que-no-se-testea-a-propósito).

### 3.1 El detalle por feature

Esto es lo que hay que testear **hoy**, según el código que existe:

```
tests/
├── unit/
│   ├── app/
│   │   ├── access.test.ts                  ROUTE_ACCESS y canAccess
│   │   └── actionAccess.test.ts            ACTION_ACCESS y can: quién opera cada acción
│   ├── mocks/
│   │   ├── helpers.ts                      call(), dataOf(), errorOf() y usePrototypeToday()
│   │   ├── calendar.test.ts                días hábiles, corridos y businessDaysRemaining
│   │   ├── seeds.test.ts                   coherencia de los datos semilla
│   │   ├── cases.test.ts                   /cases: alta, listado, filtros, detalle
│   │   ├── proceduralActs.test.ts          registro de acto y deadline-preview
│   │   └── parametrization.test.ts         permisos por perfil, calificaciones, clientes, estados
│   ├── auth/
│   │   ├── login.schema.test.ts
│   │   ├── changePassword.schema.test.ts
│   │   ├── profileLabel.test.ts
│   │   └── sessionStorage.test.ts
│   ├── cases/
│   │   ├── case.schema.test.ts             fecha del hecho y objeto del reclamo obligatorios
│   │   ├── caseForm.test.ts                emptyCaseForm y changeJurisdiction
│   │   ├── prescription.test.ts            nearestQualification, prescriptionProgress, estimatedExpiry
│   │   └── stateFilter.test.ts             el filtro de estado y el rótulo "Sin acto procesal"
│   ├── clients/
│   │   ├── client.schema.test.ts           obligatorios, DNI de 7 u 8 dígitos, correo, largos
│   │   ├── clientFormat.test.ts            apellido primero, DNI con puntos, normalizeDni
│   │   └── toCreateClientBody.test.ts      el cuerpo del alta (pasa cuando exista la función)
│   ├── lawyers/
│   │   ├── lawyer.schema.test.ts
│   │   └── toCreateLawyerBody.test.ts
│   ├── legal-params/
│   │   ├── proceduralState.schema.test.ts
│   │   ├── buildProceduralStatePatch.test.ts
│   │   ├── toCreateProceduralStateBody.test.ts
│   │   ├── toFormErrors.test.ts
│   │   └── dayTypeTone.test.ts
│   └── users/
│       ├── user.schema.test.ts
│       ├── toCreateUserBody.test.ts
│       ├── buildUserPatch.test.ts
│       ├── lawyerLink.test.ts
│       └── roles.test.ts
│
├── components/
│   ├── app/
│   │   ├── RequireSession.test.tsx         sin sesión → redirige al login
│   │   ├── RedirectIfSession.test.tsx      con sesión → no deja ver el login
│   │   ├── RequireAccess.test.tsx          sin permiso → "Sin acceso"
│   │   └── AppLayout.test.tsx              el rail muestra sólo lo que el perfil puede abrir
│   ├── shared/
│   │   ├── Modal.test.tsx                  Escape, foco atrapado, click en el fondo, fondo sin scroll
│   │   └── Field.test.tsx                  Field (nota, error, hint) y DetailList (raya, note)
│   ├── auth/
│   │   ├── LoginForm.test.tsx
│   │   ├── LoginPage.test.tsx
│   │   ├── ChangePasswordModal.test.tsx
│   │   └── tokenRenewal.test.tsx           renovación del token y sesión vencida
│   ├── cases/
│   │   ├── CaseForm.test.tsx               lo que pide cada fuero, el objeto y su contador
│   │   ├── LegalQualificationPicker.test.tsx   la fecha del hecho de cada calificación
│   │   ├── CaseSummaryAside.test.tsx       "Sin acto procesal" y la prescripción por calificación
│   │   └── CasesTable.test.tsx             CasesTable y CaseHeader, con y sin estado procesal
│   ├── clients/
│   │   ├── ClientsTable.test.tsx           columnas, raya en lo que falta, "Sin causas"
│   │   ├── ClientFormModal.test.tsx        campos, obligatorios, errores por campo
│   │   └── ClientsPage.test.tsx            listado, búsqueda, perfiles y alta (pasa cuando exista la página)
│   ├── proceedings/
│   │   └── ProceduralActForm.test.tsx      campos por fuero; sin la nota de RN13
│   ├── lawyers/
│   │   ├── LawyerFormModal.test.tsx
│   │   ├── LawyersTable.test.tsx
│   │   └── LawyersPage.test.tsx
│   ├── legal-params/
│   │   ├── ProceduralStateFormModal.test.tsx
│   │   ├── DeleteProceduralStateModal.test.tsx
│   │   ├── ProceduralStatesTable.test.tsx
│   │   └── ProceduralStatesPage.test.tsx
│   └── users/
│       ├── UserFormModal.test.tsx
│       ├── DeleteUserModal.test.tsx
│       ├── UsersTable.test.tsx
│       └── UsersPage.test.tsx
│
└── e2e/
    ├── fixtures/
    │   └── auth.ts                         loginAs('admin'), goTo(page, 'Usuarios')
    ├── access.spec.ts                      qué secciones ve cada perfil en el menú
    ├── auth.spec.ts                        login, logout, cambio de contraseña, sesión vencida
    ├── clients.spec.ts                     registrar un cliente y buscarlo (pasa cuando exista la página)
    ├── lawyers.spec.ts                     crear abogado y verlo en la tabla
    ├── legal-params.spec.ts                crear, editar y borrar estado procesal
    └── users.spec.ts                       crear, editar y borrar usuario
```

**Los tests de `clients` se escribieron antes que la feature**, desde los
criterios de aceptación de HU-8 y HU-9 (ver [§7](#7-cuando-arrancás-una-feature-nueva)).
Los que prueban código que todavía no existe —`ClientsPage`,
`toCreateClientBody` y el E2E— fallan hasta que se programe; por eso viajan en
la rama de la feature y no sueltos.

**Los tests de `cases` y `proceedings` siguen la revisión del 01/10/2026 del
contrato**, igual que el código que prueban: todavía afirman "Sin acto
procesal" y `nextDeadline`. Se actualizan cuando esos módulos se lleven a la
revisión del 05/10 (el detalle está en `frontend/CLAUDE.md`, "Revisiones del
contrato"). Los del servidor falso (`unit/mocks/`) y los de `legal-params` ya
siguen la del 05/10.

**Lo que existe y todavía no tiene test.** De `cases`: `suggestedCaption`,
`deadlineStatus`, `CaseFilters`, `PrescriptionBar` y `ClientCard`. De
`proceedings`: el esquema del acto, `stateOptions`, `dueDateText` y
`DeadlinePreviewAside`. De `legal-params`: lo de calificaciones legales
(esquema, `prescription`, tabla y modales). Se escriben junto con sus páginas,
que es cuando la feature tiene que llegar al
[mínimo](#mínimo-por-feature).

### 3.2 Lo que no se testea (a propósito)

| Qué | Por qué |
|---|---|
| `api/` (hooks y llamadas a axios) | Ya quedan cubiertos por los tests de `components/`, que pasan por MSW |
| `types/` y `*.keys.ts` | Son tipos y constantes, no tienen lógica |
| `LoginAside`, layouts, `HomePage` | Presentación pura, hoy no tienen lógica que valga la pena testear |

Si alguno de estos empieza a tener lógica (un hook que transforma datos, un
layout que decide qué mostrar según el rol), pasa a tener test.

**La excepción a lo de `api/`** es `tests/components/auth/tokenRenewal.test.tsx`.
Lo que prueba ahí no es la llamada de una feature sino el interceptor de
`src/shared/api/http.ts`: que un `401 UNAUTHENTICATED` renueve la sesión, que
reintente el pedido una sola vez y que, si no lo logra, mande al login. Es el
mecanismo que sostiene a todas las features y ninguna pantalla lo cubre de
casualidad, así que tiene test propio.

---

## 4. Convenciones

### 4.1 Nombres de archivo

| Nivel | Termina en | Ejemplo |
|---|---|---|
| `unit/` y `components/` | `.test.ts` / `.test.tsx` | `LoginForm.test.tsx` |
| `e2e/` | `.spec.ts` | `auth.spec.ts` |

La diferencia no es de estilo: **Vitest agarra sólo los `.test.*` y Playwright
sólo los `.spec.*`**. Si un test de Playwright termina en `.test.ts`, Vitest lo
va a intentar correr y va a fallar.

El nombre del test repite el nombre del archivo que prueba:
`buildUserPatch.ts` → `buildUserPatch.test.ts`.

### 4.2 Idioma

Igual que el resto del código: **nombres en inglés, textos en castellano**. Las
descripciones de `describe` / `it` van en castellano, porque es lo que se lee
cuando un test falla.

```ts
describe('validateLogin', () => {
    it('marca el usuario como obligatorio si está vacío', () => { /* … */ })
    it('no recorta la contraseña: un espacio es una clave válida', () => { /* … */ })
})
```

### 4.3 Imports

Siempre con el alias `@`, igual que en `src/`. Nunca `../../../src/...`.

```ts
import { validateLogin } from '@/features/auth/schemas/login.schema'
```

### 4.4 Cómo buscar elementos en pantalla

En orden de preferencia (es el orden que recomienda Testing Library):

1. `getByRole('button', { name: 'Ingresar' })`: lo que ve y usa una persona
   (y un lector de pantalla).
2. `getByLabelText('Usuario')`: para inputs de formulario.
3. `getByText('El nombre de usuario es obligatorio.')`: para mensajes.
4. `getByTestId(...)`: **último recurso**, sólo si no hay otra forma.

Si no podés encontrar un elemento por su rol o su label, muchas veces es señal
de que al componente le falta accesibilidad (un `<label>` o un `aria-label`).

---

## 5. Cómo se escribe cada tipo de test

> Los ejemplos están simplificados. Para ver casos completos, mirá los tests
> que ya existen: `tests/components/users/UsersPage.test.tsx` es el más
> completo (listado, alta, edición y baja).

### 5.1 Un test de `unit/`

```ts
// tests/unit/auth/login.schema.test.ts
import { describe, it, expect } from 'vitest'
import { validateLogin } from '@/features/auth/schemas/login.schema'

describe('validateLogin', () => {
    it('no devuelve errores si los dos campos están completos', () => {
        expect(validateLogin({ username: 'admin', password: 'secreta' })).toEqual({})
    })

    it('marca el usuario si sólo tiene espacios', () => {
        expect(validateLogin({ username: '   ', password: 'secreta' })).toEqual({
            username: 'El nombre de usuario es obligatorio.',
        })
    })

    it('acepta una contraseña que es sólo un espacio', () => {
        expect(validateLogin({ username: 'admin', password: ' ' })).toEqual({})
    })
})
```

Entrada → salida. Nada más.

### 5.2 Un test de `components/`

```tsx
// tests/components/auth/LoginPage.test.tsx
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { LoginPage } from '@/features/auth/pages/LoginPage'

describe('LoginPage', () => {
    it('enviado vacío muestra los errores', async () => {
        const { user } = renderWithProviders(<LoginPage />, { route: '/login' })

        await user.click(screen.getByRole('button', { name: 'Ingresar' }))

        expect(screen.getByText('El nombre de usuario es obligatorio.')).toBeInTheDocument()
    })
})
```

Tres cosas para notar:

- **`renderWithProviders`** en vez de `render`. Envuelve el componente con
  todo lo que necesita para funcionar (Router, QueryClient, AuthProvider,
  ToastProvider). Sin eso, cualquier componente que use `useNavigate` o
  `useQuery` explota. Devuelve también `user` (un `userEvent` ya armado) y
  `router`.
- **`user`** (de `userEvent`) en vez de `fireEvent`. Simula a una persona de
  verdad (foco, tecleo letra por letra, click).
- **`await`** en cada interacción y en todo lo que espere una respuesta de la
  API (`findByText`, `waitFor`).

#### Opciones de `renderWithProviders`

| Opción | Para qué | Ejemplo |
|---|---|---|
| `as` | Abre la sesión con un usuario de los fixtures antes de renderizar | `{ as: 'fvazquez' }` (administrador y abogado), `'mrios'` (abogado), `'gestion'` (secretaría) |
| `route` | URL en la que arranca (acepta query) | `{ route: '/usuarios?page=2' }` |
| `path` | Patrón de ruta donde se monta el componente | `{ path: '/abogados' }` |
| `routes` | Rutas extra para verificar a dónde navega | `{ routes: [{ path: '/inicio', element: <p>Inicio</p> }] }` |
| `children` | Rutas hijas, para marcos y guardas con `<Outlet />` | ver `tests/components/app/` |
| `state` | `location.state` de la entrada inicial | `{ state: { from: '/usuarios' } }` |

`tests/setup/render.tsx` exporta también **`signInAs(username)`**, que es lo que
`as` usa por dentro: emite un token en la base del mock y lo guarda donde lo
busca la aplicación, igual que después de un login de verdad. Sirve cuando hace
falta la sesión abierta pero no querés renderizar todavía. Hay que llamarla
**antes** de renderizar, porque `AuthProvider` lee la sesión guardada en el
primer render.

Las pantallas de administración piden un administrador: casi todos los tests
de páginas usan `as: 'fvazquez'`.

**Qué responde el mock a cada perfil** (contrato V3 §4, permisos por perfil):

| Operación | Quién puede | El resto recibe |
|---|---|---|
| Leer abogados, estados, calificaciones, clientes y causas | Cualquiera con sesión | — |
| Leer y escribir `/users` | `fvazquez` | `403` |
| Escribir abogados, estados y calificaciones | `fvazquez` | `403` |
| Registrar un cliente | `gestion` | `403` |
| Registrar una causa | Cualquiera con sesión | — |
| Registrar un acto procesal y previsualizar su vencimiento | El abogado responsable de **esa** causa | `403` |

**Los actos no dependen del rol sino de la causa** (V3 D-30): sólo los registra
su abogado responsable. `mrios` lleva las causas 1 y 17; `fvazquez`, la 4, la 6
y la 20; `mferreyra`, la 7. Con otro usuario —aunque sea abogado o
administrador— el mock responde `403`. Antes de escribir un test de actos,
mirá quién lleva la causa (`responsibleLawyerId` en `CASE_SEEDS`).

Por eso entrar como `mrios` **ya no sirve para probar el estado de error de un
listado**: desde V3 un abogado lee abogados y estados sin problema. Hoy ese
atajo sólo funciona en `/users`. Para el resto, el error se fuerza con
`server.use(...)` (ver [Probar un error del servidor](#probar-un-error-del-servidor)),
y conviene responder un `403` y no un `500`: las consultas reintentan los `5xx`
y el test tardaría segundos en ver el error.

#### Componentes presentacionales

Los modales y tablas que sólo reciben props y avisan con callbacks
(`LawyerFormModal`, `UsersTable`, `LoginForm`…) no necesitan providers: se
renderizan con `render` a secas y funciones espía (`vi.fn()`). Lo que hace la
pantalla con esos avisos se prueba en el test de la página.

#### Cuando la pantalla muestra datos viejos mientras carga

Las tablas usan `keepPreviousData`: al buscar o cambiar de página, siguen
mostrando lo anterior hasta que llega lo nuevo. Por eso, después de filtrar,
**esperá a que se vaya lo viejo** antes de afirmar sobre lo nuevo:

```tsx
await user.type(screen.getByRole('searchbox', { name: 'Buscar abogado' }), 'Ríos')
await waitFor(() => expect(screen.queryByText('Dr. Fernando G. Vázquez')).not.toBeInTheDocument())
expect(screen.getByText('Dra. Malena Ríos')).toBeInTheDocument()
```

Y un test que verifica el estado de carga tiene que esperar igual a que
termine: si no, el pedido queda colgando y le cae al test siguiente.

#### Probar un error del servidor

Los handlers de MSW responden lo normal. Para forzar un error **en un test
puntual**, se pisa el handler con `server.use(...)`:

```tsx
import { http, HttpResponse } from 'msw'
import { server } from '@/shared/mocks/server'

it('muestra el error si el servidor falla', async () => {
    server.use(
        http.post('*/auth/login', () =>
            HttpResponse.json({ /* cuerpo de error del contrato */ }, { status: 500 }),
        ),
    )

    // … render, completar el form, enviar …

    expect(await screen.findByRole('alert')).toBeInTheDocument()
})
```

El override dura **sólo ese test**: `tests/setup/vitest.setup.ts` hace
`server.resetHandlers()` después de cada uno. Para armar el cuerpo del error,
usá los helpers de `@/shared/mocks` (`errorBody`, `ERRORS`) en vez de
escribirlo a mano; así respeta el contrato. Antes de forzar un error, fijate en
`src/shared/mocks/README.md`: muchos errores ya se pueden disparar con datos
especiales de los fixtures, sin override.

#### Los datos del mock se reinician

MSW trabaja sobre una base en memoria (`src/shared/mocks/db.ts`). Si un test
crea un usuario, el siguiente **no lo ve**: el setup llama a `resetMockDb()`
después de cada test. Cada test arranca siempre con los mismos fixtures, así
que podés confiar en los datos de `@/shared/mocks` (`USERS`, `LAWYERS`,
`CLIENTS`, `CASE_SEEDS`, `CREDENTIALS`…).

Lo que **no** conviene escribir a mano en un test son los valores que el mock
calcula: `activeCases`, el estado actual de una causa, su vencimiento. Para
eso están `toCase`, `toLawyer`, `toClient` y compañía, que devuelven el recurso
tal como lo devuelve la API:

```ts
import { db, toCase } from '@/shared/mocks'

const gomez = toCase(db.cases[0])   // la causa 13284571, con su estado y su vencimiento
```

#### Tests que dependen del día

Los actos recientes de las causas semilla se ubican **respecto de hoy** ("4
días hábiles atrás"), para que el listado se vea como el prototipo cualquier
día que se abra: una causa que vence hoy, otra vencida hace dos días, otra a
tres días hábiles. La contra es que un test que afirme "Vence hoy" o una fecha
concreta pasaría un martes y fallaría un sábado.

La solución es fijar el reloj en el día del prototipo —martes 15/09/2026— y
rearmar la base **después** de fijarlo:

```ts
import { afterEach, beforeEach, vi } from 'vitest'
import { resetMockDb } from '@/shared/mocks'

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })          // sólo Date: los timers siguen reales
    vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0))
    resetMockDb()                                    // las semillas se recalculan con ese "hoy"
})
afterEach(() => {
    vi.useRealTimers()
})
```

Con el reloj fijo, las seis causas del prototipo tienen exactamente sus
vencimientos del prototipo (16/09, 11/09, 18/09…). `toFake: ['Date']` importa:
si se falsean también los temporizadores, `findByText` y `waitFor` se quedan
esperando para siempre. En `tests/unit/mocks/helpers.ts` está hecho como
`usePrototypeToday()`.

Lo mismo vale para una validación que compara contra hoy (`validateCase`,
`validateProceduralAct`): sin fijar el día, "no puede ser posterior a hoy" se
prueba con una fecha que algún día deja de ser futura.

Los componentes que **reciben** el dato ya calculado (`CasesTable` con su
`businessDaysRemaining`, `PrescriptionBar` con su prop `today`) no necesitan
nada de esto: se les pasa el valor y listo.

### 5.3 Un test de `e2e/`

```ts
// tests/e2e/lawyers.spec.ts
import { test, expect } from '@playwright/test'
import { goTo, loginAs } from './fixtures/auth'

test('registrar un abogado y verlo en la tabla', async ({ page }) => {
    await loginAs(page, 'admin')
    await goTo(page, 'Abogados') // con el menú, nunca con page.goto (ver abajo)

    await page.getByRole('button', { name: 'Registrar abogado' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel(/^apellido y nombre/i).fill('Dra. Ana Pérez')
    await dialog.getByLabel(/^Matrícula/).fill('1-50000')
    await dialog.getByRole('button', { name: 'Registrar abogado' }).click()

    await expect(page.getByRole('cell', { name: 'Dra. Ana Pérez' })).toBeVisible()
})
```

Los rótulos de los campos obligatorios llevan el asterisco pegado
("Matrícula\*"), por eso se buscan con una expresión regular (`/^Matrícula/`)
y no con el texto exacto. Con la `i` final tampoco importan las mayúsculas, así
un cambio de "Nombre" a "nombre" en el rótulo no rompe el test. Lo mismo vale
en Testing Library.

- Los selectores son los mismos que en Testing Library (`getByRole`,
  `getByLabel`): se aprende una sola forma.
- **`loginAs`** vive en `e2e/fixtures/` para que nadie repita el login en cada
  test. Si un paso se repite en muchos flujos, va a `fixtures/`.
- Playwright espera solo: `expect(...).toBeVisible()` reintenta hasta que
  aparezca. **No uses `waitForTimeout`**, hace los tests lentos y frágiles.

#### No recargues la página después del login

Es la regla más importante de los E2E. El mock de MSW guarda sus datos
(usuarios, abogados, **sesiones**) en la memoria de la pestaña. Un
`page.goto()` o `page.reload()` después de iniciar sesión vuelve todo al estado
semilla: el token que la app tiene guardado deja de existir para el mock y te
manda al login. Por eso:

- se entra con `loginAs(page, 'admin')`, que es el único `goto` del test;
- se navega con el menú: `goTo(page, 'Usuarios')` (en `e2e/fixtures/auth.ts`);
- después de "Cerrar sesión", esperá a estar en `/login` antes de volver a
  entrar.

La ventaja es que **cada test arranca con los datos semilla**: lo que crea un
test no lo ve el siguiente.

#### Un test que documenta un bug

Si un E2E encuentra un bug que no se arregla en ese momento, no se borra ni se
deja fallando: se marca con `test.fail()` y un comentario que explique el bug.
La suite queda en verde, y el día que se arregle, Playwright avisa que el test
"pasó inesperadamente" para que se saque la marca. Hoy no hay ningún test
marcado así.

### 5.4 Un test del servidor falso

```ts
// tests/unit/mocks/cases.test.ts
import { describe, expect, it } from 'vitest'
import type { Case } from '@/shared/mocks'
import { call, dataOf, errorOf, usePrototypeToday } from './helpers'

describe('mock · POST /cases', () => {
    usePrototypeToday()

    it('la causa nace en el estado inicial, "Iniciada" (D-34)', () => {
        const response = call('POST', '/cases', { as: 'gestion', body: CRIMINAL_BODY })

        expect(response.status).toBe(201)
        expect(dataOf<Case>(response).currentState).toMatchObject({ name: 'Iniciada', initial: true })
    })

    it('un SAC ya registrado responde 409', () => {
        const response = call('POST', '/cases', { as: 'gestion', body: { ...CRIMINAL_BODY, sacNumber: '13284571' } })

        expect(errorOf(response).code).toBe('CASE_SAC_ALREADY_EXISTS')
    })
})
```

Sin `render`, sin MSW y sin esperar nada: `call` arma el pedido y llama a
`resolveRequest`. Los helpers están en `tests/unit/mocks/helpers.ts`:

| Helper | Qué hace |
|---|---|
| `call(method, path, { as, body, query })` | Hace el pedido como ese usuario de los fixtures. Sin `as`, va sin token (para el `401`) |
| `dataOf<T>(response)` | El `data` de una respuesta exitosa |
| `errorOf(response)` | El `error` de una fallida: `code`, `message`, `details` |
| `usePrototypeToday()` | Fija el día en el 15/09/2026 y rearma la base, en cada test del `describe` |

**Cuándo se escribe uno de estos.** Cada vez que se agrega o se cambia un
endpoint del mock: un test por regla del contrato (qué valida, qué devuelve,
quién puede). Y cuando se agregan datos semilla, `seeds.test.ts` ya revisa
solo que no haya referencias rotas —una causa con un cliente que no existe, un
acto con un estado de otro fuero—; si la semilla nueva trae una regla nueva,
se suma ahí.

No reemplazan a los tests de `components/`: prueban que el mock cumple el
contrato, no que la pantalla lo use bien.

---

## 6. Dónde pongo este test

| Quiero probar… | Va en | Herramienta |
|---|---|---|
| Una validación de `schemas/` | `tests/unit/<feature>/` | Vitest |
| Una función de `utils/` | `tests/unit/<feature>/` | Vitest |
| Que un form muestre los errores | `tests/components/<feature>/` | Vitest + RTL |
| Que un modal llame a la API y cierre | `tests/components/<feature>/` | Vitest + RTL + MSW |
| Que una página muestre la lista, el vacío o el error | `tests/components/<feature>/` | Vitest + RTL + MSW |
| Que una ruta protegida redirija | `tests/components/app/` | Vitest + RTL |
| El comportamiento propio de un componente de `shared/` | `tests/components/shared/` | Vitest + RTL |
| Que el mock responda lo que dice el contrato | `tests/unit/mocks/` | Vitest (`resolveRequest`, sin MSW) |
| Que los datos semilla sean coherentes entre sí | `tests/unit/mocks/seeds.test.ts` | Vitest |
| Un flujo que pasa por varias pantallas | `tests/e2e/<feature>.spec.ts` | Playwright |
| Algo que se repite en muchos E2E (login) | `tests/e2e/fixtures/` | Playwright |

**Regla práctica:** si lo podés probar en un nivel más abajo, probalo ahí. Un
caso borde de validación en E2E es lento y, cuando falla, no te dice dónde está
el problema.

---

## 7. Cuando arrancás una feature nueva

Cuando empieces a programar una feature:

1. Creá `tests/unit/<feature>/` y `tests/components/<feature>/`.
2. Por cada archivo de `schemas/` y `utils/` → un `.test.ts` en `unit/<feature>/`.
3. Por cada form, modal, tabla o página → un `.test.tsx` en
   `components/<feature>/`.
4. Si la feature tiene un flujo importante de punta a punta → `e2e/<feature>.spec.ts`.
5. Si la feature usa endpoints nuevos, primero tienen que estar en los mocks
   (`src/shared/mocks`). Sin handler, el test falla a propósito (ver abajo).
   Los del Sprint 2 ya están; un endpoint que se agregue lleva su test en
   `tests/unit/mocks/`.
6. Si la pantalla tiene una acción que opera un solo perfil, su permiso va en
   `ACTION_ACCESS` y su caso en `tests/unit/app/actionAccess.test.ts`.

### Los tests primero

Se puede —y conviene— escribir los tests **antes** que la feature, a partir de
los criterios de aceptación de la historia: después se programa hasta que
pasen. Así se hizo con `clients` (HU-8 y HU-9). Cada test dice en un comentario
qué criterio cubre (`/* CA-8.4 */`), así se ve de un vistazo si quedó alguno
sin cubrir.

Dos cosas a tener en cuenta:

- **Un test que importa un archivo que todavía no existe no compila**, y un
  test que no compila rompe `npm run build` y `npm test` (ver
  [§3](#3-mapa-de-carpetas)). Mientras la feature no esté, esos tests viven en
  la rama de la feature: no se suben solos a `develop`.
- **Los tests fijan nombres y textos.** Si el test busca el botón "Registrar
  cliente", el aviso "Cliente GÓMEZ, Ariel Fernando registrado." o importa
  `@/features/clients/pages/ClientsPage`, el código tiene que llamarse así.
  Los textos salen del prototipo; si al programar hace falta otro, se cambia
  en el test y en la pantalla juntos.

### Mínimo por feature

Antes de abrir el PR de una feature, tiene que tener:

- [ ] Un test por cada función de `schemas/` y `utils/`, con sus casos borde.
- [ ] Cada form o modal con: camino feliz, error de validación y error del
      servidor.
- [ ] Cada página con: la lista cargada, el estado vacío y el estado de error.
- [ ] Entre 1 y 3 flujos E2E, si la feature tiene un flujo que atraviesa
      varias pantallas.
- [ ] `npm test` en verde.

---

## 8. Comandos

| Comando | Qué hace | Cuándo |
|---|---|---|
| `npm test` | Corre `unit/` y `components/` una vez | Antes de cada commit |
| `npm run test:watch` | Lo mismo, pero se re-ejecuta al guardar | Mientras programás |
| `npm run test:e2e` | Corre Playwright: levanta la app con mocks en el puerto 5199 | Antes de abrir un PR |
| `npm run test:e2e:ui` | Playwright con interfaz visual, paso a paso | Para depurar un E2E |

Para correr un solo archivo o una sola feature:

```bash
npm test -- tests/unit/users
npm test -- LoginForm
npx playwright test tests/e2e/auth.spec.ts
```

---

## 9. Problemas comunes

**"El test falla con `[MSW] Cannot bypass a request when using the "error" strategy`"**
El componente llamó a un endpoint que no tiene handler en los mocks. En los
tests MSW está configurado con `onUnhandledRequest: 'error'` a propósito, para
que un endpoint mal escrito falle en vez de salir a la red. Revisá la URL o
agregá el handler en `src/shared/mocks`.

**"`useNavigate()` may be used only in the context of a `<Router>`"** (o lo
mismo con `QueryClient`)
Usaste `render` en vez de `renderWithProviders`.

**"Un test pasa solo pero falla cuando corro todos"**
Algo quedó compartido entre tests. Lo típico: un override de `server.use`
fuera de un `it`, o estado guardado en `sessionStorage` / `localStorage`. El
setup limpia MSW y la base del mock, pero si tu feature guarda algo en el
navegador, limpialo en un `afterEach`.

**"Un test de vencimientos pasa hoy y falla mañana"** (o pasa de lunes a
viernes y falla el fin de semana)
Las causas semilla tienen los vencimientos atados a hoy. Fijá el día antes de
rearmar la base: ver [Tests que dependen del día](#tests-que-dependen-del-día).

**"Fijé el reloj y ahora `findByText` no termina nunca"**
Se falsearon también los temporizadores. Usá
`vi.useFakeTimers({ toFake: ['Date'] })`, que sólo toca `Date`.

**"Entro como `mrios` y la pantalla no muestra el error que esperaba"**
Desde V3 leer abogados, estados, calificaciones, clientes y causas está abierto
a cualquier perfil: el mock ya no responde `403`. Forzá el error con
`server.use(...)`.

**"Registro un acto en un test y el mock responde `403`"**
El usuario no es el abogado responsable de esa causa. Desde la revisión del
05/10/2026 no alcanza con tener el rol `LAWYER`: ver la tabla de
[qué responde el mock a cada perfil](#52-un-test-de-components).

**"`getByText` no encuentra el mensaje de error"**
Si el mensaje aparece después de una respuesta de la API, usá `findByText`
(que espera) en vez de `getByText` (que no espera).

**"`findByRole('dialog')` encontró el modal pero después `within(dialog)` no encuentra nada"**
El modal se volvió a montar y tu referencia quedó vieja (desconectada del
documento). Volvé a buscarlo con `screen.getByRole('dialog')` después de la
acción. Si el modal no debería remontarse, es un bug del componente: pasaba en
`UserFormModal` con el error "Elegí al menos un perfil", ya se arregló, y
`UsersPage.test.tsx` lo verifica buscando adentro de la referencia original.

**"Un E2E me devuelve al login sin razón"**
Casi seguro hubo un `page.goto()` o un `reload()` después del login. Ver
[No recargues la página después del login](#no-recargues-la-página-después-del-login).

**"Todos los E2E fallan de golpe con `browserType.launch: Executable doesn't exist`"**
No es que se rompió nada: falta el navegador. Pasa la primera vez en una máquina
nueva y, sobre todo, **cada vez que se actualiza Playwright**, porque cada
versión trae su propio build de Chromium. Se arregla con `npx playwright install
chromium`. Mientras falte, todos los E2E fallan antes de arrancar, así que el
error se reconoce porque fallan *todos* y ninguno llega a abrir una pantalla.

**"El E2E anda en mi máquina y falla en la de otro"**
Casi siempre es un `waitForTimeout` o un selector por clase CSS. Usá
`getByRole` / `getByLabel` y dejá que Playwright espere solo.

---

## 10. Referencias

- `docs/Frontend-Architecture/ESTRUCTURA.md`: la estructura de `src/`, que
  `tests/` copia.
- `frontend/src/shared/mocks/README.md`: los mocks, los fixtures y cómo
  disparar cada error.
- `docs/Api-Contract/API_CONTRACT_V3.md`: lo que la API tiene que responder, y
  lo que implementan hoy los mocks (con su revisión del 05/10/2026, §7.8).
  `API_CONTRACT_V2.md` queda como registro del Sprint 1.
- `frontend/CLAUDE.md`: qué parte del código ya sigue esa revisión y qué
  falta, en "Revisiones del contrato".
- [Vitest](https://vitest.dev) ·
  [Testing Library](https://testing-library.com/docs/react-testing-library/intro) ·
  [MSW](https://mswjs.io) ·
  [Playwright](https://playwright.dev)
