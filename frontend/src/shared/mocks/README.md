# Mocks — API simulada

Implementación en memoria de `docs/Api-Contract/API_CONTRACT_V3.md`, con su
revisión del 05/10/2026 (§7.8): los treinta y tres endpoints del contrato, con
sus códigos de error, su paginación, sus filtros, sus permisos por perfil y sus
bajas lógicas. Sirve para desarrollar pantallas sin backend levantado y para
tener fixtures estables en los tests.

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

Las features no se enteran: siguen llamando `http.get('/cases')`, y los
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
| `log` | `true` | Loguea `[mock] GET /cases?page=2 → 200` en la consola. |
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
// /lawyers y /lawyers/3 van al backend real; /cases sigue mockeado
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

El mock tiene sus propios tests en `tests/unit/mocks/`: uno por regla del
contrato y uno que revisa la coherencia de las semillas. Si cambiás un handler
o agregás un dato semilla, corré `npm test -- tests/unit/mocks`.

---

## Usuarios de prueba

El login es `POST /auth/login` con `{ username, password }`.

| Usuario | Contraseña | Roles | Sirve para |
| --- | --- | --- | --- |
| `fvazquez` | `password1` | `ADMINISTRATOR` + `LAWYER` | Administrar. Registra actos sólo en **sus** causas (la 4, la 6 y la 20): en las demás recibe `403`, aunque sea administrador. |
| `mrios` | `abogado123` | `LAWYER` | Registrar actos en sus causas (la 1 y la 17; la 9 está archivada). Probar el `403` de la administración y el de una causa ajena. |
| `gestion` | `secre123` | `SECRETARY` | Registrar clientes. Probar el `403` de los actos y el usuario sin ficha profesional (`lawyer: null`). |
| `supervision` | `password1` | `ADMINISTRATOR` | Administrador que no ejerce: sin ficha, y recibe `403` al registrar un acto. |
| `sledesma` | `password1` | `SECRETARY` + `LAWYER` | Registra clientes y, como lleva las causas 15 y 16, también sus actos. |
| el resto | `password1` | varios | Ver `fixtures.ts`. |

Sin `Authorization: Bearer <token>` válido todo endpoint protegido responde
`401`.

### Quién puede qué

Sale de la tabla de permisos por perfil del contrato (V3 §4). Un usuario con
varios roles pasa si el rol pedido está entre ellos.

| Operación | Rol |
| --- | --- |
| Leer abogados, estados procesales, calificaciones legales, clientes y causas | Cualquier usuario autenticado |
| Leer y escribir `/users` | `ADMINISTRATOR` |
| Escribir abogados, estados procesales y calificaciones legales | `ADMINISTRATOR` |
| Registrar un cliente | `SECRETARY` |
| Registrar una causa | Cualquier usuario autenticado |
| Registrar un acto procesal y previsualizar su vencimiento | El abogado responsable de la causa |

El `403` nombra el rol que falta: "Se requiere el rol SECRETARY para realizar
esta operación."

**Los actos procesales no se rigen por un rol** (D-30). Los registra el abogado
responsable de la causa y nadie más: ni otro abogado, ni el administrador. Se
compara la ficha del usuario (`lawyerId`) con el responsable de la causa, y
quien no lo es recibe "Solo el abogado responsable de la causa puede registrar
actos procesales." Para saber con quién probar una causa, mirá su
`responsibleLawyer`; las cuentas de cada abogado están en `fixtures.ts`.

---

## Datos semilla

| Recurso | Cuántos | Notas |
| --- | --- | --- |
| Usuarios | 22 | 21 vigentes y uno dado de baja (`vsosa`) |
| Abogados | 10 | Los 9 y 10 no tienen cuenta ni causas: son los únicos que se pueden dar de baja |
| Estados procesales | 24 | Los de los tres fueros. El estado inicial "Iniciada" no está: es de sistema |
| Calificaciones legales | 9 | 8 vigentes y una dada de baja (la 9), que una causa todavía registra |
| Clientes | 24 | 23 vigentes y uno dado de baja (`SOSA`, id 8) |
| Causas | 23 | Con los actos que las llevaron a su estado actual |

Con el `limit` por defecto de 20, los usuarios, los estados, los clientes y las
causas dan dos páginas.

Los nombres, las matrículas, el ciclo de vida de cada fuero y las seis primeras
causas salen del prototipo, así lo que se ve desarrollando es lo que el estudio
aprobó.

**Las causas están elegidas para que cada regla tenga un caso:**

| Causa | Para qué está |
| --- | --- |
| 1 a 6 | Las del prototipo: a un día hábil, vencida hace dos, a tres días, sin vencimiento, a diez días, vence hoy |
| 7, 11, 22 | En el estado inicial, **"Iniciada"** (`currentState.initial`), una por fuero. La 7 tiene dos calificaciones con hechos de fechas distintas |
| 8 | Estado **escrito a mano**, con el vencimiento ajustado manualmente |
| 9, 10, 21 | En estado **terminal** (Archivada, Prescripta): no son causas activas y no admiten actos |
| 12 | En un estado que no abre plazo |
| 13 | Registra la calificación **dada de baja**, que sigue mostrando |
| 14 | Plazo lejano, a quince días hábiles |
| 15 | Plazo en días **corridos** |
| 16 | Estado de la tabla con el vencimiento ajustado a mano |
| 17 | Segunda causa del mismo cliente (GÓMEZ), vencida hace una semana |
| 18, 20 | Los roles `DEFENDANT` y `PRIVATE_PROSECUTOR` |
| 23 | Penal **sin SAC y sin calificaciones legales** (D-33), todavía "Iniciada" |

Los clientes `JUÁREZ` (18) y `RUIZ` (24) no tienen causas.

**Registros dados de baja a propósito.** `vsosa` (usuario 22), `SOSA` (cliente
8) y la calificación 9 no tienen que aparecer en ningún listado ni responder a
un `GET` por id. Están para probar justamente eso, y que un valor único choque
—o no— contra un registro que no se ve: el `username` de `vsosa` sigue ocupado,
mientras que el DNI de `SOSA` y el nombre de la calificación 9 quedaron libres,
porque su unicidad es "entre los vigentes".

`supervision` es administrador y **no tiene ficha**: es el caso que prueba que
la matrícula la pide el rol `LAWYER` y no el administrativo.

### Los vencimientos son relativos a hoy

Los actos recientes de las causas no tienen una fecha fija: se ubican "N días
hábiles atrás" respecto del día en que se arma la base. Con fechas fijas, el
listado se vería como el prototipo un solo día, y a la semana estarían todas
las causas vencidas. Así, cualquier día que se abra la aplicación hay una causa
que vence hoy, otra vencida hace dos días y otra a tres días hábiles.

En un fin de semana los números se corren uno o dos días (un plazo en días
hábiles nunca vence un sábado), pero el panorama es el mismo.

La contra es para los tests: uno que afirme "Vence hoy" pasaría un martes y
fallaría un sábado. Hay que **fijar el día y rearmar la base**:

```ts
beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })          // sólo Date
    vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0))
    resetMockDb()                                    // las semillas usan ese "hoy"
})
afterEach(() => vi.useRealTimers())
```

Con el martes 15/09/2026 —el día del prototipo—, las seis primeras causas
tienen exactamente los vencimientos del prototipo. Está hecho como
`usePrototypeToday()` en `tests/unit/mocks/helpers.ts`. Más detalle en
`docs/Frontend-Architecture/TESTING.md`, "Tests que dependen del día".

### Lo que se calcula no se guarda

La base guarda identificadores y actos; todo lo demás sale de contar en cada
lectura:

- **`activeCases`** de abogados, estados, calificaciones y clientes: las causas
  activas (no dadas de baja y fuera de un estado terminal) que les
  corresponden. Las semillas no lo guardan; se calcula al serializar. En
  estados y calificaciones viene **sólo en los `GET`**: el `POST` y el `PATCH`
  devuelven el recurso sin ese campo (D-32).
- **El estado actual de una causa** es el del acto con la **fecha de acto más
  reciente** (D-14). Sin actos, el estado inicial: `name: "Iniciada"`,
  `initial: true` y todo lo demás en `null` (D-34). "Iniciada" no se guarda en
  ningún lado: una causa está en él mientras no tenga actos.
- **El vencimiento** es el de ese mismo acto y viaja adentro de `currentState`
  (`dueDate`, `businessDaysRemaining`, `manuallyAdjusted`, D-35). Ya no existe
  `nextDeadline`.
- **La prescripción** de cada calificación: la fecha del hecho más los meses
  vigentes de la calificación.

Por eso registrar un acto no "actualiza la causa": no hay nada que actualizar,
la próxima lectura ya la devuelve cambiada. Y por eso cambiar los meses de una
calificación recalcula la prescripción de sus causas, y renombrar un estado se
refleja en todas las que lo tienen.

La única copia deliberada es **el plazo de un acto**: los días y el tipo de día
se copian al registrarlo, así que cambiar el plazo del estado después no mueve
los vencimientos ya registrados (D-08).

Para tener el recurso como lo devuelve la API están los serializadores de
`db.ts`: `toCase`, `toClient`, `toLawyer`, `toLegalQualification`,
`toProceduralState`, `toProceduralAct` y `toUser`.

---

## Endpoints implementados

| Método | Ruta | Códigos que puede devolver |
| --- | --- | --- |
| `POST` | `/auth/login` | 200, 400, 401 |
| `POST` | `/auth/refresh` | 200, 401 |
| `POST` | `/auth/logout` | 204, 401 |
| `PATCH` | `/auth/password` | 204, 400, 401, 422 |
| `POST` | `/users` | 201, 400, 401, 403, 409, 422 |
| `GET` | `/users` | 200, 400, 401, 403 |
| `GET` | `/users/{userId}` | 200, 400, 401, 403, 404 |
| `PATCH` | `/users/{userId}` | 200, 400, 401, 403, 404, 409, 422 |
| `DELETE` | `/users/{userId}` | 204, 400, 401, 403, 404, 409, 422 |
| `POST` | `/lawyers` | 201, 400, 401, 403, 409 |
| `GET` | `/lawyers` | 200, 400, 401 |
| `GET` | `/lawyers/{lawyerId}` | 200, 400, 401, 404 |
| `PATCH` | `/lawyers/{lawyerId}` | 200, 400, 401, 403, 404, 409 |
| `DELETE` | `/lawyers/{lawyerId}` | 204, 400, 401, 403, 404, 409 |
| `POST` | `/procedural-states` | 201, 400, 401, 403, 409 |
| `GET` | `/procedural-states` | 200, 400, 401 |
| `GET` | `/procedural-states/{stateId}` | 200, 400, 401, 404 |
| `PATCH` | `/procedural-states/{stateId}` | 200, 400, 401, 403, 404, 409, 422 |
| `DELETE` | `/procedural-states/{stateId}` | 204, 400, 401, 403, 404 |
| `POST` | `/legal-qualifications` | 201, 400, 401, 403, 409 |
| `GET` | `/legal-qualifications` | 200, 400, 401 |
| `GET` | `/legal-qualifications/{qualificationId}` | 200, 400, 401, 404 |
| `PATCH` | `/legal-qualifications/{qualificationId}` | 200, 400, 401, 403, 404, 409 |
| `DELETE` | `/legal-qualifications/{qualificationId}` | 204, 400, 401, 403, 404 |
| `POST` | `/clients` | 201, 400, 401, 403, 409 |
| `GET` | `/clients` | 200, 400, 401 |
| `GET` | `/clients/{clientId}` | 200, 400, 401, 404 |
| `POST` | `/cases` | 201, 400, 401, 409 |
| `GET` | `/cases` | 200, 400, 401 |
| `GET` | `/cases/custom-states` | 200, 400, 401 |
| `GET` | `/cases/{caseId}` | 200, 400, 401, 404 |
| `POST` | `/cases/{caseId}/procedural-acts` | 201, 400, 401, 403, 404, 422 |
| `GET` | `/cases/{caseId}/procedural-acts/deadline-preview` | 200, 400, 401, 403, 404 |

**Las bajas son lógicas, pero no se notan.** Los `DELETE` no borran: ponen
`active` en `false`. Eso es asunto del servidor —para el cliente el registro
dejó de existir: sale de los listados, el `GET` por id responde `404`, y no
hay parámetro de consulta ni campo de `PATCH` que permita alcanzarlo o
reactivarlo.

La excepción son las **referencias desde una causa** (contrato §4, "Bajas"):
una causa que está en un estado procesal dado de baja, o que registra una
calificación dada de baja, las sigue mostrando. Lo que no se puede es elegirlas
para una causa o un acto nuevos.

Un método o una ruta que MSW sí intercepta pero que el contrato no define
—`GET /users/3/causas`, por ejemplo— devuelve el `404 RESOURCE_NOT_FOUND`
general de §5.2, con el método y la ruta en el mensaje. Lo que no matchea
ningún handler (HMR de Vite, fuentes, assets) sale a la red sin tocarse.

**Prefijos**: el contrato define la base `/api/v1` pero `http.ts` usa
`VITE_API_URL ?? '/api'`. Los handlers se registran como `*/users`, y la ruta
se normaliza sacando `/api`, `/v1` y `/api/v1`, así que el mock responde igual
a `/users`, `/v1/users` o `/api/v1/users`. Contra el backend real eso **no**
va a ser así: hay que elegir una forma.

### `POST /auth/refresh`

Ya está en el contrato (V3 §3.1). Devuelve
`{ data: { accessToken, tokenType, expiresIn, user } }`, donde ese `user` **no
es el del login**: trae `lawyerId` suelto en vez de la ficha, agrega
`permissions`, y no trae `fullName`, `email`, `lastLoginAt` ni `active`. Es el
contenido del token, no el recurso usuario. El frontend conserva el usuario que
guardó al iniciar sesión y sólo actualiza los roles.

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
| `400` validación | `username` de menos de 3 caracteres, matrícula fuera del formato `1-28114`, contraseña de menos de 8 caracteres o sin número; nombre de estado procesal de menos de 3 caracteres; un `dayType` incoherente con el plazo; mandar `lawyerId` **y** `lawyer` juntos; `PATCH` sin ningún campo |
| `400` validación, Sprint 2 | DNI con puntos o de menos de 7 dígitos; SAC que no tiene 8 dígitos (omitirlo no es un error); una calificación sin `offenseDate`, repetida o dada de baja; un interno del instructor de más de 20 caracteres; amparo o administrativo sin `subjectMatter`, o con más de 800 caracteres; un rol procesal que el fuero no admite; un `clientId` o un `responsibleLawyerId` inexistente o dado de baja; un acto sin estado, con los dos (`proceduralStateId` y `customState`), con un estado terminal o de otro fuero, o con `actDate` futura; un acto con `customState: "Iniciada"`; un acto administrativo sin `notificationDate` en un estado que abre plazo |
| `400` paginación | `?page=0`, `?limit=500`, `?limit=abc` |
| `400` ruta | `GET /users/abc`, `GET /cases/abc`, `DELETE /procedural-states/abc` |
| `400` query | `?role=NOPE`, `?jurisdiction=NOPE`, `/cases?openDeadline=si`, `/cases?proceduralStateId=4&customState=x`, `/cases?withoutProceduralActs=true&proceduralStateId=4`; `deadline-preview` sin `proceduralStateId` o sin `actDate` |
| `401` credenciales | `POST /auth/login` con contraseña incorrecta, o con un usuario dado de baja → `INVALID_CREDENTIALS` |
| `401` sesión | sin header `Authorization`, token revocado por un logout, o token vencido con `expireIssuedTokens()` → `UNAUTHENTICATED` |
| `401` renovación | `POST /auth/refresh` con la sesión ya revocada (`db.sessions.clear()`) → `UNAUTHENTICATED` |
| `403` | `mrios` o `gestion` en cualquier endpoint de `/users`, o escribiendo abogados, estados o calificaciones; `fvazquez` o `mrios` en `POST /clients`; cualquiera que no sea el abogado responsable registrando un acto o pidiendo `deadline-preview`: `gestion`, `supervision`, o `mrios` y `fvazquez` sobre la causa 7, que lleva `mferreyra` |
| `404` | `GET /users/999`, `GET /cases/999`; también los que existen pero están dados de baja: `GET /users/22`, `GET /clients/8`, `GET /legal-qualifications/9` |
| `409` | crear un usuario con `username: "fvazquez"` o con un email ya usado; vincular un abogado que ya tiene cuenta; crear un abogado con `1-28114`; dar de baja el usuario 3, 4 o 5; dar de baja un abogado con cuenta o con causas (del 1 al 8); crear un estado procesal o una calificación con un nombre que ya existe, o un estado que se llame "Iniciada"; registrar un cliente con el DNI `34812905`; registrar una causa con el SAC `13284571` |
| `422` | crear un usuario `LAWYER` sin ficha profesional, o uno sin rol `LAWYER` **con** ficha; dar de baja o degradar el usuario 1; contraseña actual incorrecta en `PATCH /auth/password`; registrar un acto en la causa 9, 10 o 21 → `CASE_IN_TERMINAL_STATE` |
| `500` / red | `configureMocks({ forceFailure: 500 })` / `configureMocks({ forceFailure: 'network' })` |

**Lo que ya no es un error**, y antes sí:

- Leer abogados o estados procesales como `mrios` o `gestion` respondía `403`.
  Desde V3 está abierto a cualquier usuario autenticado.
- Dar de baja un estado procesal con causas respondía
  `409 PROCEDURAL_STATE_HAS_DEPENDENCIES`. La baja procede y las causas
  conservan el estado (D-06); el código se retiró.
- Registrar una causa sin SAC, o una penal sin calificaciones legales,
  respondía `400`. Desde la revisión del 05/10/2026 los dos son opcionales
  (D-33).

**Lo que ahora es un error**, y antes no:

- Registrar un acto, o pedir `deadline-preview`, sobre una causa ajena responde
  `403` aunque el usuario tenga el rol `LAWYER` o sea administrador (D-30).

---

## Qué hay en cada archivo

| Archivo | Contenido |
| --- | --- |
| `contract.ts` | Los tipos del contrato (recursos, cuerpos de petición, envoltorios, códigos de error) y los constructores `itemBody` / `listBody` / `errorBody` / `buildPagination`. |
| `fixtures.ts` | Datos semilla de sólo lectura, sacados del prototipo: usuarios, abogados, estados procesales, calificaciones, clientes, causas con sus actos (`CASE_SEEDS`) y credenciales. También los tipos `Stored…`, que es cómo la base guarda cada cosa. |
| `calendar.ts` | Fechas sin hora y el cómputo de plazos del contrato (§4): días hábiles, corridos, `businessDaysRemaining` y la suma de meses de la prescripción. Lo usan las semillas, la base y los handlers. |
| `responses.ts` | Una respuesta de ejemplo por cada código documentado, en `RESPONSES.<endpoint>.<case>`, más los mensajes de error compartidos en `ERRORS` y `forbiddenFor(rol)`. |
| `db.ts` | Base en memoria (copia mutable de las semillas, con las fechas relativas ya resueltas), tokens de sesión, `resetMockDb()` y los serializadores `toCase`, `toUser`, etc., que arman lo embebido y lo calculado. |
| `handlers.ts` | **El servidor falso**: `resolveRequest(request)` → `{ status, body }`. Toda la lógica del contrato vive acá, y no sabe de MSW ni de axios. Su tabla `ROUTES` es la única lista de endpoints; `ROUTE_TABLE` es lo que exporta para la capa de transporte. |
| `msw-handlers.ts` | La capa MSW: normaliza la url, aplica `passthrough`, latencia y fallos forzados, y convierte el resultado en `HttpResponse`. Sin lógica de negocio. Sus interceptores salen de `ROUTE_TABLE`. |
| `browser.ts` | `startMocks()` / `stopMocks()` — service worker. Sólo navegador. |
| `server.ts` | `server` de `msw/node` — tests. Sólo Node. |
| `index.ts` | Barrel de lo que sirve en cualquier entorno. **No** reexporta `browser.ts` ni `server.ts`, porque cada uno arrastra su plataforma. |

La separación entre `handlers.ts` y `msw-handlers.ts` es deliberada: si algún
día MSW deja de convenir, se reescribe la capa fina y el contrato queda como
está.

### Agregar un endpoint

**Se toca un solo archivo: `handlers.ts`.** Se escribe el handler y se suma su
entrada a `ROUTES`, con `path` (la ruta en notación MSW, `:param` incluido) y
`pattern` (la expresión regular con la que se resuelve). `msw-handlers.ts`
deriva sus interceptores de ahí y no hay nada más que sincronizar.

Dos cuidados:

- **El orden importa cuando una ruta fija y una con parámetro se pisan.**
  `GET /cases/custom-states` está antes que `GET /cases/:caseId`: al revés,
  "custom-states" se tomaría como un id de causa inválido.
- **Un endpoint nuevo lleva su test** en `tests/unit/mocks/`, uno por regla.

Si el endpoint trae un recurso nuevo, además: su tipo en `contract.ts`, sus
semillas en `fixtures.ts`, su lugar en `MockDb` y su serializador en `db.ts`, y
sus ejemplos en `responses.ts`.

> Antes eran dos listas, una en cada archivo, con un comentario advirtiendo
> que tenían que coincidir. No alcanzó: faltaba `POST /auth/refresh`, así que
> la renovación del token no se interceptaba, salía por el proxy de Vite y
> nunca se simuló ni en dev ni en los E2E. Si volvés a separar las listas,
> volvés a abrir esa puerta.

---

## Usarlos sin MSW

`resolveRequest` es una función común, así que un test que sólo quiere
verificar una regla del contrato no necesita levantar nada:

```ts
import { resolveRequest, resetMockDb } from '@/shared/mocks';

beforeEach(resetMockDb);

const r = resolveRequest({
  method: 'GET',
  path: '/cases',
  query: new URLSearchParams('page=1&limit=20'),
  token: undefined,
});
// r.status === 401
```

Así están escritos los tests de `tests/unit/mocks/`; su `helpers.ts` trae
`call(method, path, { as, body, query })`, que además abre la sesión del
usuario que se le pida.

Y si sólo hace falta un cuerpo de ejemplo, está en `RESPONSES`:

```ts
import { RESPONSES } from '@/shared/mocks';

RESPONSES.listCases.ok.body;            // { data: [...], pagination: {...} }
RESPONSES.createCase.conflict.body;     // el 409 del contrato
```

El estado vive en memoria: dura lo que dura la pestaña. Un F5 —o
`resetMockDb()`— vuelve a los datos semilla.

---

## Lo que el contrato dejó sin definir

Decisiones que el mock tuvo que tomar porque el contrato no las fija. Son de
este mock, no del backend.

**Generales**

- **Orden de validación**: 401 → 403 → 400 de ruta → 400 de cuerpo → 404 →
  409 → 422. El contrato no fija un orden; el mock necesita uno para ser
  previsible. La excepción son los dos endpoints de actos procesales, donde
  todo depende de la causa: va primero el `404` de la causa, después el `403`
  de quien no es su abogado responsable, y recién después el `400` del cuerpo.
- **`totalPages` de una colección vacía es `0`**, no `1`.
- **Un `PATCH` sin ningún campo devuelve `400`**, porque el contrato dice que
  hay que mandar al menos uno pero no indica qué error corresponde.
- **"Hoy" es el día del reloj del sistema**, en la zona del navegador. El mock
  no fija una fecha propia.
- **Los días hábiles son de lunes a viernes.** No se descuentan feriados ni la
  feria judicial, igual que en el contrato (C-05).

**Usuarios y abogados**

- **Formato de `username`**: 3 a 30 caracteres, letras, números, `.`, `-`, `_`.
  El contrato sólo dice "no cumple con el formato requerido".
- **Formato de matrícula**: `^\d{1,2}-\d{5}$`. El contrato documenta `1-28114`
  y deja anotado que hay que confirmar con el estudio si la circunscripción
  puede tener dos dígitos. Se aceptan los dos casos: una expresión de más
  **rechaza matrículas legítimas**, que es peor que una de menos.
- **`?role=` inválido**: el contrato no documenta el error, así que se usa el
  mismo formato que el `jurisdiction` inválido (`400 INVALID_REQUEST`).
- **Qué cuenta como regla de negocio (`422`)**: un usuario con rol `LAWYER`
  necesita ficha profesional y uno que no ejerce no puede tenerla; el usuario
  1 no se puede dar de baja ni quedarse sin rol de administrador.
- **Qué usuarios tienen dependencias (`409` al dar de baja)**: los 3, 4 y 5,
  una lista fija. Son las cuentas de tres abogados con causas a su cargo.
- **Qué abogados tienen dependencias**: los que tienen un usuario activo
  vinculado o son responsables de alguna causa. Eso sí se calcula.
- **Sesiones y baja lógica**: dar de baja un usuario le cierra las sesiones
  abiertas, y un usuario inactivo no puede iniciar sesión. El contrato no lo
  dice, pero lo contrario sería un agujero: el `DELETE` no le sacaría el
  acceso a nadie que ya estuviera adentro.
- **El `401` del login no distingue** entre contraseña incorrecta y usuario
  dado de baja. Responder "existís pero estás inactivo" filtraría información
  a quien no está autenticado.

**Estados procesales y calificaciones legales**

- **Largo del nombre de un estado procesal**: 3 a 80 caracteres. Lo escribe
  una persona (RN4), así que sólo se exige un largo razonable.
- **Unicidad del nombre de un estado**: por fuero y **entre los vigentes**,
  como el índice de la base (`schema.prisma`): el nombre de un estado dado de
  baja se puede volver a usar. Lo mismo vale para una calificación, como dice
  el contrato.
- **"Iniciada" no se guarda como un estado.** El contrato dice que es un estado
  de sistema por fuero; el mock lo resuelve sin registro: una causa sin actos
  está en él. Por eso no hay un id de "Iniciada" con el que probar el `404` de
  `GET /procedural-states/{stateId}`. El nombre sí está reservado, sin
  distinguir mayúsculas, tanto al registrar como al renombrar un estado.
- **El fuero de un estado no se modifica** (D-36): un `PATCH` con
  `jurisdiction` es un `400` sobre ese campo, aunque traiga el fuero que ya
  tiene.

**Clientes y causas**

- **Un campo que no corresponde al fuero es un `400`**: `legalQualifications`
  fuera del penal; `counterparty` o `subjectMatter` en el penal;
  `notificationDate` fuera del administrativo. Un `null` o un texto vacío
  cuentan como "no vino".
- **La búsqueda de clientes por DNI acepta puntos**: `34.812` encuentra
  `34812905`.
- **La búsqueda de causas** mira el SAC, la carátula y el nombre del cliente
  en los dos órdenes ("gómez, ariel" y "ariel gómez"), sin distinguir tildes.
  Una causa sin SAC se encuentra por lo demás.
- **`legalQualifications` vacío** en una causa penal equivale a no mandarlo:
  la causa se registra sin calificaciones.
- **Orden de `GET /cases` a igual vencimiento**: por `id`. El contrato ordena
  por `currentState.dueDate` y, las que no tienen, por `id`; no dice cómo
  desempatar dos con el mismo vencimiento.
- **Filtros booleanos de `/cases`**: `openDeadline=false` y
  `withoutProceduralActs=false` equivalen a no mandarlos. Por eso
  `withoutProceduralActs=false` junto con `proceduralStateId` no es un error:
  la exclusión rige cuando vale `true`.
- **Una causa en estado terminal no tiene vencimiento** (`dueDate` en
  `null`), aunque el estado terminal tuviera un plazo cargado.
- **A igual fecha de acto, manda el que se registró después.** El contrato
  dice "el acto con la fecha de acto más reciente" y no desempata.

**Actos procesales**

- **Un `customState` que coincide con un estado vigente del fuero es un
  `400`**: el contrato pide mandar el `proceduralStateId` en ese caso.
- **Un `customState` que diga "Iniciada" también es un `400`**: el estado
  inicial no puede ser destino de un acto (D-34), tampoco escrito a mano.
- **Quién es "el abogado responsable"**: el usuario cuya ficha (`lawyerId`) es
  la del responsable de la causa, tenga los roles que tenga. Un usuario sin
  ficha nunca lo es.
- **Errores de `deadline-preview`**: como `400 INVALID_REQUEST` con el detalle
  por parámetro, que es el formato que el contrato usa para la query.
- **`deadline-preview` sobre una causa en estado terminal** responde igual: el
  `422` lo da recién el registro.
- **En el administrativo, un acto cuyo estado no abre plazo puede no traer
  notificación.** Si igual trae un vencimiento manual, cuenta desde el acto.

### Cosas que el contrato sí resolvió y conviene saber

- **Los estados sin plazo** se expresan con `timeLimitDays: 0` +
  `dayType: "NONE"`. No es lo mismo que "0 días hábiles", que vence hoy: "sin
  plazo" no vence nunca.
- **El alta de usuario con abogado nuevo es transaccional.** `POST /users`
  acepta `lawyerId` (vincular uno existente) o `lawyer` (crear uno nuevo),
  nunca los dos. Con `lawyer`, si el alta del usuario falla, el abogado no se
  crea: el mock valida todo antes de escribir cualquier cosa.
- **Los estados procesales no tienen posición** (D-31): se listan por fuero y,
  dentro de cada uno, por orden de registro (`id` ascendente). No hay nada que
  renumerar al insertar o dar de baja.
- **La causa nace en el estado inicial, "Iniciada"** (D-34): `POST /cases` no
  crea ningún acto y devuelve `currentState` con `initial: true` y sin
  vencimiento. Por eso el alta no depende de que el fuero tenga estados
  cargados. `currentState` nunca es `null`.
- **El primer acto puede llevar la causa a cualquier estado no terminal del
  fuero**, o a uno escrito a mano.
- **Un acto de fecha anterior al último** queda asentado pero no retrocede el
  estado de la causa ni reemplaza su vencimiento (D-14).
- **El teléfono y el interno del instructor van separados** (D-33):
  `instructorPhone` y `instructorExtension`.
- **Un identificador inexistente en el cuerpo** (`clientId`,
  `responsibleLawyerId`, una calificación, un estado) es un
  `400 VALIDATION_ERROR` sobre ese campo, no un `404` (D-22).
- **Todos los mensajes van en castellano** (D-23).

---

## Cómo llegan estos errores a las pantallas

`http.ts` parsea la forma del contrato, así que todo lo que el mock responde
llega al `catch` como un `ApiError` con los tres datos puestos:

```ts
try {
  await http.post('/cases', datos)
} catch (e) {
  if (!isApiError(e)) throw e

  e.status                       // 409
  e.code                         // 'CASE_SAC_ALREADY_EXISTS'
  e.message                      // 'Ya existe una causa registrada con ese número de SAC.'
  e.fieldError('sacNumber')      // el mensaje del campo, en los 400
}
```

Eso hace que el mock sirva para probar el manejo de errores de verdad: los
`409` se distinguen con `e.is(...)`, y los `400 VALIDATION_ERROR` traen
`details` campo por campo para pintar el formulario. En el alta de causa, los
problemas de las calificaciones —falta su fecha del hecho, está repetida, fue
dada de baja— llegan todos bajo la clave `legalQualifications`.

Los códigos viven en `@/shared/api/contract.ts` —no acá— porque son contrato de
producción; este mock los reexporta.

**Todas** las respuestas de error traen `code`, sin excepciones.

---

## Qué pasa cuando el backend publique un endpoint

Todo lo que el mock implementa está en el contrato: no hay endpoints
"propuestos" que existan sólo acá.

Cuando el backend publique uno, se lo saca del mock sin tocar nada más:

```ts
await startMocks({ passthrough: ['/lawyers'] })
// /lawyers y /lawyers/3 van al backend real; el resto sigue mockeado
```

Ese es el camino para ir apagando el mock endpoint por endpoint, en vez de
apagarlo entero el día del primer deploy.

Ojo con apagar a medias recursos que dependen entre sí: con `/cases` contra el
backend real y `/clients` mockeado, los ids de un lado no existen del otro.
Conviene pasar juntos los que se referencian.

Conviene comparar contra las decisiones listadas más arriba —formato de
matrícula, orden de validación, qué registros tienen dependencias— y corregir
lo que no coincida.
