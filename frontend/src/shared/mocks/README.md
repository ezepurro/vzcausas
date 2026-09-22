# Mocks — API simulada

Implementación en memoria de `docs/Api-Contract/API_CONTRACT_V2.md`: los
dieciocho endpoints del contrato, con sus códigos de error, su paginación,
sus filtros y sus bajas lógicas. Sirve para desarrollar pantallas sin backend
levantado y para tener fixtures estables en los tests.

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

| Usuario | Contraseña | Roles | Sirve para |
| --- | --- | --- | --- |
| `fvazquez` | `password1` | `ADMINISTRATOR` + `LAWYER` | Todo. Es el administrador del estudio y el único perfil que pasa los endpoints de administración. |
| `mrios` | `abogado123` | `LAWYER` | Probar el `403`. |
| `gestion` | `secre123` | `SECRETARY` | Probar el `403` y el usuario sin ficha profesional (`lawyer: null`). |
| el resto | `password1` | varios | Ver `fixtures.ts`. |

Sin `Authorization: Bearer <token>` válido todo endpoint protegido responde
`401`; con un token de alguien que no es administrador, `403`.

Datos semilla: **22 usuarios** (21 activos y uno dado de baja), **7 abogados**
y **24 estados procesales** — suficiente para que la paginación por defecto
(`limit=20`) dé dos páginas.

Los nombres, las matrículas y el ciclo de vida de cada fuero salen del
prototipo, así lo que se ve desarrollando es lo que el estudio aprobó.

`vsosa` está dado de baja a propósito. No tiene que aparecer en ningún lado:
sirve para probar que los listados no lo filtren por error, que el `GET` por
id responda `404` y que el `409` de username choque contra un registro que
no se ve.

`supervision` es administrador y **no tiene ficha**: es el caso que prueba
que la matrícula la pide el rol `LAWYER` y no el administrativo.

---

## Endpoints implementados

| Método | Ruta | Códigos que puede devolver |
| --- | --- | --- |
| `POST` | `/auth/login` | 200, 400, 401 |
| `POST` | `/auth/refresh` | 200, 401 · **fuera del contrato**, ver abajo |
| `POST` | `/auth/logout` | 204, 401 |
| `PATCH` | `/auth/password` | 204, 400, 401, 422 |
| `POST` | `/users` | 201, 400, 401, 403, 409, 422 |
| `GET` | `/users` | 200, 400, 401, 403 |
| `GET` | `/users/{userId}` | 200, 400, 401, 403, 404 |
| `PATCH` | `/users/{userId}` | 200, 400, 401, 403, 404, 409, 422 |
| `DELETE` | `/users/{userId}` | 204, 400, 401, 403, 404, 409, 422 |
| `POST` | `/lawyers` | 201, 400, 401, 403, 409, 422 |
| `GET` | `/lawyers` | 200, 400, 401, 403 |
| `GET` | `/lawyers/{lawyerId}` | 200, 400, 401, 403, 404 |
| `PATCH` | `/lawyers/{lawyerId}` | 200, 400, 401, 403, 404, 409, 422 |
| `DELETE` | `/lawyers/{lawyerId}` | 204, 400, 401, 403, 404, 409, 422 |
| `POST` | `/procedural-states` | 201, 400, 401, 403, 409, 422 |
| `GET` | `/procedural-states` | 200, 400, 401, 403 |
| `GET` | `/procedural-states/{stateId}` | 200, 400, 401, 403, 404 |
| `PATCH` | `/procedural-states/{stateId}` | 200, 400, 401, 403, 404, 409, 422 |
| `DELETE` | `/procedural-states/{stateId}` | 204, 400, 401, 403, 404, 409, 422 |


**Las bajas son lógicas, pero no se notan.** Los `DELETE` no borran: ponen
`active` en `false`. Eso es asunto del servidor —para el cliente el registro
dejó de existir: sale de los listados, el `GET` por id responde `404`, y no
hay parámetro de consulta ni campo de `PATCH` que permita alcanzarlo o
reactivarlo.

Un método o una ruta que MSW sí intercepta pero que el contrato no define
—`GET /users/3/causas`, por ejemplo— devuelve el `404 RESOURCE_NOT_FOUND`
general de §5.2, con el método y la ruta en el mensaje. Lo que no matchea
ningún handler (HMR de Vite, fuentes, assets) sale a la red sin tocarse.

**Prefijos**: el contrato define la base `/api/v1` pero `http.ts` usa
`VITE_API_URL ?? '/api'`. Los handlers se registran como `*/users`, y la ruta
se normaliza sacando `/api`, `/v1` y `/api/v1`, así que el mock responde igual
a `/users`, `/v1/users` o `/api/v1/users`. Contra el backend real eso **no**
va a ser así: hay que elegir una forma.

### `POST /auth/refresh`, el que todavía no está en el contrato

El equipo de backend lo está implementando y confirmó la forma de la
respuesta; el contrato no lo publica todavía. Está acá porque sin él no se
puede ejercer la renovación del token, que es lo más delicado del frontend.
**Cuando se publique, hay que revisar que coincida.**

Devuelve `{ data: { accessToken, tokenType, expiresIn, user } }`, donde ese
`user` **no es el del login**: trae `roleNames` en vez de `roles`, `lawyerId`
suelto en vez de la ficha, agrega `permissions`, y no trae `fullName`,
`email`, `lastLoginAt` ni `active`. Es el contenido del token, no el recurso
usuario. El frontend conserva el usuario que guardó al iniciar sesión.

**Dos libertades que se toma el mock**, las dos anotadas en el código:

1. **La credencial.** En el backend real la renovación se autoriza con una
   cookie `httpOnly`, que un service worker no puede emitir. Acá se usa el
   token de acceso vencido como sustituto. No cambia nada de lo que el
   frontend tiene que resolver.
2. **El vencimiento.** El mock no mide el tiempo. Se provoca a mano.

**Cómo probar la renovación**, desde la consola del navegador con la sesión
abierta:

```js
const { expireIssuedTokens } = await import('/src/shared/mocks/index.ts')
expireIssuedTokens()
```

A partir de ahí, el siguiente pedido de cualquier pantalla responde `401` y
el frontend renueva solo: en la pestaña de red se ve el pedido fallido, el
`POST /auth/refresh` y el pedido original reintentado. El usuario no se entera.

Para probar el camino contrario —la renovación también falló, hay que volver
a entrar— vencé los tokens y además revocá la sesión:

```js
const { expireIssuedTokens, db } = await import('/src/shared/mocks/index.ts')
expireIssuedTokens()
db.sessions.clear()
```

El token rota en cada renovación, igual que en el backend real: el viejo deja
de servir en el acto.

### Cómo disparar cada error

| Código | Cómo |
| --- | --- |
| `400` validación | `username` de menos de 3 caracteres, matrícula fuera del formato `1-28114`, contraseña de menos de 8 caracteres o sin número; nombre de estado procesal de menos de 3 caracteres; `timeLimitDays` no numérico; un `dayType` incoherente con el plazo; mandar `lawyerId` **y** `lawyer` juntos; `PATCH` sin ningún campo |
| `400` paginación | `?page=0`, `?limit=500`, `?limit=abc` |
| `400` ruta | `GET /users/abc`, `DELETE /procedural-states/abc` |
| `400` query | `?role=NOPE`, `?jurisdiction=NOPE` |
| `401` credenciales | `POST /auth/login` con contraseña incorrecta, o con un usuario dado de baja → `INVALID_CREDENTIALS` |
| `401` sesión | sin header `Authorization`, token revocado por un logout, o token vencido con `expireIssuedTokens()` → `UNAUTHENTICATED` |
| `401` renovación | `POST /auth/refresh` con la sesión ya revocada (`db.sessions.clear()`) → `UNAUTHENTICATED` |
| `403` | token de `mrios` o de `gestion`: leer también exige `ADMINISTRATOR` |
| `404` | `GET /users/999`; también `GET /users/22`, que existe pero está dado de baja |
| `409` | crear un usuario con `username: "fvazquez"` o con un email ya usado; crear un abogado con `1-28114`; dar de baja el usuario 3, 4 o 5; dar de baja un abogado con usuario vinculado; crear un estado procesal con un nombre que ya existe en ese fuero; dar de baja el estado 4, 14 o 21 |
| `422` | crear un usuario `LAWYER` sin ficha profesional; crear un usuario sin rol `LAWYER` **con** ficha; dar de baja o degradar el usuario 1; contraseña actual incorrecta en `PATCH /auth/password` |
| `500` / red | `configureMocks({ forceFailure: 500 })` / `configureMocks({ forceFailure: 'network' })` |

---

## Qué hay en cada archivo

| Archivo | Contenido |
| --- | --- |
| `contract.ts` | Los tipos del contrato (recursos, cuerpos de petición, envoltorios, códigos de error) y los constructores `itemBody` / `listBody` / `errorBody` / `buildPagination`. |
| `fixtures.ts` | Datos semilla de sólo lectura, sacados del prototipo: usuarios, abogados, estados procesales y credenciales. También el tipo `StoredUser`, que es cómo la base guarda un usuario. |
| `responses.ts` | Una respuesta de ejemplo por cada código documentado, en `RESPONSES.<endpoint>.<case>`, más los mensajes de error compartidos en `ERRORS`. |
| `db.ts` | Base en memoria (copia mutable de las semillas), tokens de sesión, `resetMockDb()` y `toUser()`, que arma el `lawyer` embebido al serializar. |
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

## Lo que el contrato dejó sin definir

El contrato anterior tenía seis divergencias —roles con dos vocabularios y
dos formas, `abogadoId` en castellano, el `401` del login con otro
envoltorio, el plazo como string— y este mock las replicaba a propósito, para
que no se escondiera el problema. **Ya no existen ninguna**: el contrato
vigente las resolvió y el mock lo sigue tal cual.

Lo que queda son decisiones que el mock tuvo que tomar porque el contrato no
las fija. Son de este mock, no del backend.

- **Formato de `username`**: 3 a 30 caracteres, letras, números, `.`, `-`, `_`.
  El contrato sólo dice "no cumple con el formato requerido".
- **Formato de matrícula**: `^d{1,2}-d{5}$`. El contrato documenta `1-28114`
  y deja anotado que hay que confirmar con el estudio si la circunscripción
  puede tener dos dígitos. Se aceptan los dos casos: una expresión de más
  **rechaza matrículas legítimas**, que es peor que una de menos.
- **Largo del nombre de un estado procesal**: 3 a 80 caracteres. Lo escribe
  una persona (RN4), así que sólo se exige un largo razonable.
- **`?role=` inválido**: el contrato no documenta el error, así que se usa el
  mismo formato que el `jurisdiction` inválido (`400 INVALID_REQUEST`).
- **Qué cuenta como regla de negocio (`422`)**: un usuario con rol `LAWYER`
  necesita ficha profesional y uno que no ejerce no puede tenerla; el usuario 1 no se puede dar de baja ni quedarse sin rol de
  administrador.
- **Qué registros tienen dependencias (`409` al dar de baja)**: usuarios 3, 4
  y 5; abogados 1 y 3 —más cualquier abogado con un usuario activo
  vinculado—; estados procesales 4, 14 y 21.
- **Orden de validación**: 401 → 403 → 400 de ruta → 400 de cuerpo → 404 →
  409 → 422. El contrato no fija un orden; el mock necesita uno para ser
  previsible.
- **`totalPages` de una colección vacía es `0`**, no `1`.
- **Un `PATCH` sin ningún campo devuelve `400`**, porque el contrato dice que
  hay que mandar al menos uno pero no indica qué error corresponde.
- **Sesiones y baja lógica**: dar de baja un usuario le cierra las sesiones
  abiertas, y un usuario inactivo no puede iniciar sesión. El contrato no lo
  dice, pero lo contrario sería un agujero: el `DELETE` no le sacaría el
  acceso a nadie que ya estuviera adentro.
- **El `401` del login no distingue** entre contraseña incorrecta y usuario
  dado de baja. Responder "existís pero estás inactivo" filtraría información
  a quien no está autenticado.

### Cosas que el contrato sí resolvió y conviene saber

- **Los estados sin plazo** ahora se expresan con `timeLimitDays: 0` +
  `dayType: "NONE"`. Antes había que escribir "0 días hábiles", que **no es lo
  mismo**: eso vence hoy, "sin plazo" no vence nunca.
- **El alta de usuario con abogado nuevo es transaccional.** `POST /users`
  acepta `lawyerId` (vincular uno existente) o `lawyer` (crear uno nuevo),
  nunca los dos. Con `lawyer`, si el alta del usuario falla, el abogado no se
  crea: el mock valida todo antes de escribir cualquier cosa.
- **Las posiciones de los estados procesales se renumeran solas.** Insertar,
  mover o dar de baja deja el ciclo del fuero en 1..n sin huecos. El cliente
  no manda esa renumeración.
- **`activeCases` devuelve siempre `0`**, en abogados y en estados: depende
  del módulo de causas, que todavía no existe.

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

**Todas** las respuestas de error traen `code`, sin excepciones. El `401` del
login, que en el contrato anterior venía con otro envoltorio y sin código,
ahora responde `INVALID_CREDENTIALS` como cualquier otro error.


## Qué pasa cuando el backend publique un endpoint

Todo lo que el mock implementa está en el contrato: ya no hay endpoints
"propuestos" que existan sólo acá. El ABM de estados procesales, el listado de
abogados y las bajas lógicas se agregaron al contrato y el mock los sigue.

Cuando el backend publique uno, se lo saca del mock sin tocar nada más:

```ts
await startMocks({ passthrough: ['/lawyers'] })
// /lawyers y /lawyers/3 van al backend real; el resto sigue mockeado
```

Ese es el camino para ir apagando el mock endpoint por endpoint, en vez de
apagarlo entero el día del primer deploy.

Conviene comparar contra las decisiones listadas más arriba —formato de
matrícula, orden de validación, qué registros tienen dependencias— y corregir
lo que no coincida.
