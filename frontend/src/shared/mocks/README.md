# Mocks — API v1 simulada

Implementación en memoria de `docs/api contract v1.md`: los diez endpoints del
contrato, con sus códigos de error, su paginación y sus filtros. Sirve para
desarrollar pantallas sin backend levantado y para tener fixtures estables en
los tests.

Está armado sobre **MSW** (`msw@2`), que intercepta el tráfico de red de
verdad: un service worker en el navegador y la capa `http` de Node en los
tests. Eso da tres cosas que importan:

- **Los pedidos se ven en la pestaña Network**, con su código, su cuerpo y su
  timing, igual que contra el backend real.
- **`passthrough`**: se puede mockear una parte y dejar que el resto salga al
  backend de verdad. Es el camino para ir apagando el mock endpoint por
  endpoint a medida que el backend los publique.
- **Los mismos handlers sirven en el navegador y en Node**, así que un test y
  la aplicación ven exactamente la misma API.

Las features no se enteran: siguen llamando `http.get('/users')`, y los
interceptores de `http.ts` corren igual, así que un error del mock llega al
`catch` convertido en `ApiError`.

> El service worker es `public/mockServiceWorker.js`, generado por
> `npx msw init public/ --save`. **Va commiteado** y hay que regenerarlo
> cuando se actualice la versión de `msw`.

---

## Encender los mocks

`startMocks()` es **asíncrono**: registra el service worker, y hay que
esperarlo antes de renderizar o los primeros pedidos se escapan sin mockear.

```tsx
// src/main.tsx
async function bootstrap() {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    const { startMocks } = await import('@/shared/mocks/browser')
    await startMocks()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode><App /></StrictMode>,
  )
}

bootstrap()
```

El `import()` dinámico es a propósito: así MSW no entra en el bundle de
producción.

Y en `.env.local`:

```dotenv
VITE_USE_MOCKS=true
```

`startMocks()` acepta las mismas opciones que `configureMocks()`:

```ts
await startMocks({ latencyMs: 0, log: false });
```

| Opción | Default | Para qué |
| --- | --- | --- |
| `latencyMs` | `300` | Demora de cada respuesta. Sirve para ver los estados de carga; `0` responde lo más rápido que pueda. |
| `log` | `true` | Loguea `[mock] GET /users?page=2 → 200` en la consola. |
| `forceFailure` | `null` | `500` (o cualquier código) hace fallar todo; `'network'` simula backend caído (`ApiError.isNetworkError`); `null` es el comportamiento normal. |
| `passthrough` | `[]` | Rutas que salen al backend real en vez de mockearse. Ver abajo. |

`configureMocks({ ... })` cambia esas opciones en caliente y `stopMocks()`
da de baja la intercepción.

### Apagar el mock de a un endpoint

Cuando el backend publique un endpoint, se lo saca del mock sin tocar nada
más. Acepta strings (matchean la ruta y todo lo que cuelga de ella) o
expresiones regulares, siempre contra la ruta ya normalizada:

```ts
await startMocks({ passthrough: ['/lawyers', /^\/auth\//] })
// /lawyers y /lawyers/3 van al backend real; /users sigue mockeado
```

---

## En los tests (Node)

Los mismos handlers, sin service worker:

```ts
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from '@/shared/mocks/server'
import { resetMockDb } from '@/shared/mocks'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => { server.resetHandlers(); resetMockDb() })
afterAll(() => server.close())
```

En Node conviene `onUnhandledRequest: 'error'` —al revés que en el navegador,
donde es `'bypass'`— para que un endpoint mal escrito haga fallar el test en
vez de intentar salir a la red.

`server.use(...)` permite sobrescribir un handler para un test puntual sin
tocar el mock general.

---

## Usuarios de prueba

El login es `POST /auth/login` con `{ username, password }`.

| Usuario | Contraseña | Rol | Sirve para |
| --- | --- | --- | --- |
| `admin` | `password` | `ADMINISTATOR` | Todo. Es el único que pasa los endpoints de administración. |
| `jperez` | `abogado123` | `LAWYER` + `ADMINISTATOR` | Rol múltiple. |
| `mdominguez` | `secre123` | `SECRETARIAT` | Probar el `403`. |
| el resto | `password` | varios | Ver `fixtures.ts`. |

Sin `Authorization: Bearer <token>` válido todo endpoint protegido responde
`401`; con un token de alguien que no es administrador, `403`.

Datos semilla: **22 usuarios**, **14 abogados**, **24 estados procesales** —
suficiente para que la paginación por defecto (`limit=20`) dé dos páginas.

---

## Endpoints implementados

| Método | Ruta | Códigos que puede devolver |
| --- | --- | --- |
| `POST` | `/auth/login` | 200, 400, 401 |
| `POST` | `/auth/logout` | 204, 401 |
| `PATCH` | `/auth/password` | 204, 400, 401, 422 |
| `POST` | `/users` | 201, 400, 401, 403, 409, 422 |
| `GET` | `/users` | 200, 400, 401, 403 |
| `GET` | `/users/{userId}` | 200, 400, 401, 403, 404 |
| `PATCH` | `/users/{userId}` | 200, 400, 401, 403, 404, 409, 422 |
| `DELETE` | `/users/{userId}` | 204, 400, 401, 403, 404, 409, 422 |
| `POST` | `/lawyers` | 201, 400, 401, 403, 409, 422 |
| `GET` | `/procedural-states` | 200, 400, 401, 403 |
| `POST` | `/procedural-states` | 201, 400, 401, 403, 409 |
| `PATCH` | `/procedural-states/{proceduralStateId}` | 200, 400, 401, 403, 404, 409 |
| `DELETE` | `/procedural-states/{proceduralStateId}` | 204, 400, 401, 403, 404, 409 |


Un método o una ruta que MSW sí intercepta pero que el contrato no define
—`GET /users/3/causas`, por ejemplo— devuelve el `404 RESOURCE_NOT_FOUND`
general de §4.2, con el método y la ruta en el mensaje. Lo que no matchea
ningún handler (HMR de Vite, fuentes, assets) sale a la red sin tocarse.

**Prefijos**: el contrato define la base `/api/v1` pero `http.ts` usa
`VITE_API_URL ?? '/api'`. Los handlers se registran como `*/users`, y la ruta
se normaliza sacando `/api`, `/v1` y `/api/v1`, así que el mock responde igual
a `/users`, `/v1/users` o `/api/v1/users`. Contra el backend real eso **no**
va a ser así: hay que elegir una forma.

### Cómo disparar cada error

| Código | Cómo |
| --- | --- |
| `400` validación | `username` de menos de 3 caracteres, matrícula sin formato `MP-12345`, contraseña de menos de 8 caracteres o sin número; nombre de estado procesal de menos de 3 caracteres; `proceduralTimeLimit` no numérico; `PATCH /procedural-states/{id}` sin ningún campo |
| `400` paginación | `?page=0`, `?limit=500`, `?limit=abc` |
| `400` ruta | `GET /users/abc`, `DELETE /procedural-states/abc` |
| `400` query | `?role=NOPE`, `?jurisdiction=NOPE` |
| `401` | sin header `Authorization`, o token revocado por un logout |
| `403` | token de `mdominguez` |
| `404` | `GET /users/999`, `DELETE /procedural-states/999` |
| `409` | crear un usuario con `username: "admin"`; crear un abogado con `MP-12345`; borrar el usuario 2, 4 o 9; crear un estado procesal con un nombre que ya existe en ese fuero; borrar el estado procesal 4, 14 o 21 |
| `422` | crear un usuario `LAWYER` sin `abogadoId` válido; borrar o degradar el usuario 1; contraseña actual incorrecta en `PATCH /auth/password` |
| `500` / red | `configureMocks({ forceFailure: 500 })` / `configureMocks({ forceFailure: 'network' })` |

---

## Qué hay en cada archivo

| Archivo | Contenido |
| --- | --- |
| `contract.ts` | Los tipos del contrato (recursos, cuerpos de petición, envoltorios, códigos de error) y los constructores `itemBody` / `listBody` / `errorBody` / `buildPagination`. |
| `fixtures.ts` | Datos semilla de sólo lectura: usuarios, abogados, estados procesales, credenciales. |
| `responses.ts` | Una respuesta de ejemplo por cada código documentado, en `RESPONSES.<endpoint>.<case>`, más los mensajes de error compartidos en `ERRORS`. |
| `db.ts` | Base en memoria (copia mutable de las semillas), tokens de sesión y `resetMockDb()`. |
| `handlers.ts` | **El servidor falso**: `resolveRequest(request)` → `{ status, body }`. Toda la lógica del contrato vive acá, y no sabe de MSW ni de axios. |
| `msw-handlers.ts` | La capa MSW: normaliza la url, aplica `passthrough`, latencia y fallos forzados, y convierte el resultado en `HttpResponse`. Sin lógica de negocio. |
| `browser.ts` | `startMocks()` / `stopMocks()` — service worker. Sólo navegador. |
| `server.ts` | `server` de `msw/node` — tests. Sólo Node. |
| `index.ts` | Barrel de lo que sirve en cualquier entorno. **No** reexporta `browser.ts` ni `server.ts`, porque cada uno arrastra su plataforma. |

La separación entre `handlers.ts` y `msw-handlers.ts` es deliberada: si algún
día MSW deja de convenir, se reescribe la capa fina y el contrato queda como
está.

---

## Usarlos sin MSW

`resolveRequest` es una función común, así que un test que sólo quiere
verificar una regla del contrato no necesita levantar nada:

```ts
import { resolveRequest, resetMockDb } from '@/shared/mocks';

beforeEach(resetMockDb);

const r = resolveRequest({
  method: 'GET',
  path: '/users',
  query: new URLSearchParams('page=1&limit=20'),
  token: undefined,
});
// r.status === 401
```

Y si sólo hace falta un cuerpo de ejemplo, está en `RESPONSES`:

```ts
import { RESPONSES } from '@/shared/mocks';

RESPONSES.listUsers.ok.body;          // { data: [...], pagination: {...} }
RESPONSES.createUser.conflict.body;     // el 409 del contrato
```

El estado vive en memoria: dura lo que dura la pestaña. Un F5 —o
`resetMockDb()`— vuelve a los datos semilla.

---

## Divergencias del contrato

Están replicadas tal cual, no corregidas: un mock que arregla el contrato deja
de servir para detectar el problema cuando aparezca el backend real. En el
código están marcadas con `DIVERGENCIA`.

1. **El rol tiene dos vocabularios y dos formas.** En `/users` es un arreglo en
   inglés (`["LAWYER", "ADMINISTATOR"]`); en la respuesta del login es un
   string en castellano (`"ADMINISTRADOR"`); el ejemplo de `PATCH /users/{id}`
   manda `"role": "USUARIO"`, un valor que no aparece en ninguna otra parte del
   documento. El mock acepta string o arreglo al escribir, siempre devuelve
   arreglo en `/users`, y traduce al rol único del login con `sessionRoleFrom()`.
2. **`ADMINISTATOR` está escrito sin la "R"** en todos los ejemplos de `/users`,
   pero `ADMINISTRADOR` en la tabla de endpoints y en el login. Se respeta la
   grafía de los payloads. Si el backend define otra, se cambia la constante
   `ROLES` en `contract.ts` y el resto sigue funcionando.
3. **El `401` del login no usa el envoltorio de error estándar**: devuelve
   `{ statusCode, error, message }` en vez de `{ error: { code, message, details } }`.
   Es el único caso en todo el contrato.
4. **`abogadoId`** es el único campo en castellano, y viaja como string
   (`"abogadoId": "1"`) aunque los ids sean enteros. El mock acepta las dos
   formas. Además el contrato lo recibe pero no lo devuelve nunca, así que el
   vínculo usuario↔abogado se guarda aparte (`USER_LAWYER` en `fixtures.ts`).
5. **`proceduralTimeLimit` es un string** (`"10"`), no un número.
6. **El `403` está redactado de dos maneras**: `POST /users` habla de "permisos
   suficientes" y el resto nombra el rol `ADMINISTRADOR`. Igual el `401`, que en
   `/auth/*` menciona el token y en `/users` no. Los dos textos están en
   `ERRORS`.

### Huecos que el mock tuvo que completar

El contrato no los define; son decisiones de este mock, no del backend.

- **Formato de `username`**: 3 a 30 caracteres, letras, números, `.`, `-`, `_`.
- **Requisito de contraseña**: 8 o más caracteres, con al menos una letra y un
  número.
- **Formato de matrícula**: `MP-` y 4 a 6 dígitos.
- **Valores de `jurisdiction`**: el contrato sólo nombra `ADMINISTRATIVE` y
  `CRIMINAL`; se agregó `AMPARO`, que es el tercer fuero con el que trabaja el
  estudio (ver el prototipo y `docs/TRADUCCION_DOMINIO.md`). Falta confirmarlo
  con el backend. Antes había cuatro fueros inventados por el mock —`CIVIL`,
  `COMMERCIAL`, `LABOR` y `FAMILY`— que se sacaron: agregaban dominio que el
  estudio no usa.
- **Estados sin plazo**: el prototipo tiene estados terminales o de trámite que
  no abren ningún plazo (muestran `—` en la columna "Días"), pero el contrato no
  tiene cómo expresarlo. En las semillas van como `proceduralTimeLimit: '0'` +
  `dayType: 'BUSINESS'`, que **no es lo mismo**: "0 días hábiles" vence hoy,
  "sin plazo" no vence nunca. Hay que resolverlo con el backend antes de que el
  módulo de vencimientos lea esta tabla.
- **`?role=` inválido en `GET /users`**: el contrato no documenta el error, así
  que se usa el mismo formato que el `jurisdiction` inválido de
  `/procedural-states` (`400 INVALID_REQUEST`).
- **Qué cuenta como regla de negocio (`422`)**: un usuario `LAWYER` necesita un
  `abogadoId` que exista; el usuario 1 no se puede borrar ni quedarse sin rol de
  administrador; el email de un abogado no se puede repetir.
- **Qué usuarios tienen dependencias (`409` al borrar)**: los ids 2, 4 y 9.
- **Orden de validación**: 401 → 403 → 400 de ruta → 400 de cuerpo → 404 → 409
  → 422. El contrato no fija un orden; el mock necesita uno para ser previsible.
- **`totalPages` de una colección vacía es `0`**, no `1`.
- **Un `PATCH` sin ningún campo devuelve `400`**, porque el contrato dice que
  hay que mandar al menos uno pero no indica qué error corresponde.

---

## Cómo llegan estos errores a las pantallas

`http.ts` parsea la forma del contrato, así que todo lo que el mock responde
llega al `catch` como un `ApiError` con los tres datos puestos:

```ts
try {
  await http.post('/users', datos)
} catch (e) {
  if (!isApiError(e)) throw e

  e.status                       // 409
  e.code                         // 'USERNAME_ALREADY_EXISTS'
  e.message                      // 'El nombre de usuario ya se encuentra registrado.'
  e.fieldError('username')       // el mensaje del campo, en los 400
}
```

Eso hace que el mock sirva para probar el manejo de errores de verdad: los dos
`409` del contrato (`USERNAME_ALREADY_EXISTS` y `USER_HAS_DEPENDENCIES`) se
distinguen con `e.is(...)`, y los `400 VALIDATION_ERROR` traen `details` campo
por campo para pintar el formulario.

Los códigos viven en `@/shared/api/contract.ts` —no acá— porque son contrato de
producción; este mock los reexporta.

La única respuesta sin `code` es el `401` de `/auth/login`, que por la
divergencia 3 usa otra forma: ahí `e.code` queda en `null` y hay que mirar
`e.status`.


## Endpoints que NO están en el contrato

El contrato v1 define **sólo** `GET /procedural-states`. El ABM
(`POST`, `PATCH`, `DELETE`) es una **propuesta de este equipo**, necesaria
para la feature de ABMC de estados procesales, y hoy existe únicamente acá.

Está marcado con `PROPUESTA` en el código: `handlers.ts`, `contract.ts`,
`responses.ts`, `msw-handlers.ts` y los dos códigos de error nuevos en
`shared/api/contract.ts` (`PROCEDURAL_STATE_ALREADY_EXISTS`,
`PROCEDURAL_STATE_HAS_DEPENDENCIES`).

Decisiones que tomó el mock y que el backend puede resolver distinto:

- **La unicidad es por nombre + fuero**, no por nombre solo.
- **La baja es física** (`DELETE` → 204), replicando `/users`. Pero
  `docs/TRADUCCION_DOMINIO.md` dice que la baja del dominio es **lógica**
  (`active: boolean`, nunca `delete`, RN12). Hay que confirmarlo.
- **El 404 usa `RESOURCE_NOT_FOUND`**, el código general de §4.2, en vez de
  uno propio del recurso.
- **Nombre de 3 a 60 caracteres**; el contrato no define formato.
- **`proceduralTimeLimit` de 0 a 9999**, aceptado como string o número y
  normalizado a string.

Cuando el backend publique los suyos, hay que comparar contra esto y
corregir lo que no coincida, o sacarlos del mock con
`startMocks({ passthrough: ['/procedural-states'] })`.
