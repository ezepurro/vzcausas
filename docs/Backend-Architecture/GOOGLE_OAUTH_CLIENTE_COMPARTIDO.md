# Cliente OAuth compartido de Google — guía de uso para `documents`

Quién lo necesita: quien toque `GoogleDriveDocumentStorage` (ADR-003, puerto
`DocumentStoragePort`, ya implementado en
`documents/infrastructure/storage/google-drive/`). Este documento es el "cómo lo uso", no el "por qué" —
para el contexto completo de la decisión, ver N-10 en
`IMPLEMENTACION_NOTIFICACIONES.md` y la nota corregida en
`ADR-003_GOOGLE_DRIVE.md` §2.1/§2.6.

---

## 1. Qué es

Un único cliente OAuth 2.0, compartido por toda la app, con **los dos scopes
pedidos juntos en una sola autorización**:

- `https://www.googleapis.com/auth/drive.file` (Drive, tuyo)
- `https://www.googleapis.com/auth/gmail.send` (Gmail, de `deadlines`)

Vive en `backend/src/shared/infrastructure/google/`:

- `google-oauth-client.service.ts` — `GoogleOAuthClientService`. Lee
  `GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN` del `ConfigService`
  (`getOrThrow`, falla fuerte si falta alguna) y expone `getClient()`, que
  devuelve el `OAuth2Client` ya con las credenciales cargadas.
- `google-oauth.module.ts` — `GoogleOAuthModule`, `@Global()`. Exporta
  `GoogleOAuthClientService`.

No sabe nada de Drive ni de Gmail — mismo criterio de admisión a `shared/`
que `PrismaService` (`ARQUITECTURA_BACKEND_V1.md:551`): es transversal, sin
reglas de negocio.

**No hay un cliente propio de `documents`.** Si estás por escribir uno,
pará: es exactamente lo que esto reemplaza.

---

## 2. Autorización: un cliente, dos cuentas distintas

**El cliente OAuth es compartido — la cuenta de Google que autoriza, no.**
En desarrollo, cada uno prueba con su propia cuenta de Gmail: mmachuca con
la suya para `deadlines`, vos con la tuya para Drive. Eso significa que
`GOOGLE_OAUTH_CLIENT_ID`/`GOOGLE_OAUTH_CLIENT_SECRET` son los mismos para
los dos (identifican el proyecto de Google Cloud `vzcausas-dev`, no a una
persona), pero **`GOOGLE_OAUTH_REFRESH_TOKEN` es tuyo, no el de mmachuca**:
sale de autorizar vos, con tu cuenta.

Pasos:

1. **mmachuca te agrega como *test user*** en la pantalla de consentimiento
   OAuth del proyecto `vzcausas-dev` (Google Cloud Console → APIs & Services
   → OAuth consent screen → Test users). El proyecto está en modo
   *Testing*, así que sin esto Google rechaza tu autorización con "app no
   verificada, acceso bloqueado" — no es un error tuyo, es que falta este
   paso.
2. Pedile a mmachuca `GOOGLE_OAUTH_CLIENT_ID` y `GOOGLE_OAUTH_CLIENT_SECRET`
   (esos dos sí se comparten) y cargalos en tu `.env`.
3. Corré vos `npm run google:authorize`
   (`backend/scripts/google-authorize.ts`) con **tu** cuenta de Gmail de
   prueba. El script abre el navegador para que autorices, canjea el código
   por un refresh token — el tuyo, distinto al de mmachuca — y lo imprime
   para que lo cargues en tu `.env` como `GOOGLE_OAUTH_REFRESH_TOKEN`.

Consecuencia práctica: tus pruebas de Drive crean carpetas y archivos en el
**"Mi unidad" de tu propia cuenta**, separado de los correos de prueba que
manda `deadlines` con la cuenta de mmachuca. Nada se pisa entre los dos.

El script, al correrlo, solo hace esto: autoriza y entrega el refresh
token. **No crea `VZ Causas` ni `VZ Causas/Modelos formales`** — ver §4.

**Esto es solo para desarrollo.** En producción vuelve a ser una sola
cuenta para todo: la de gestión del estudio autoriza una única vez, con los
dos scopes juntos, y ese refresh token (uno solo, no uno por subsistema) es
el que carga el servidor real. Que en desarrollo cada uno use su propia
cuenta es una comodidad para no pisarse los datos de prueba, no refleja
cómo funciona en producción.

---

## 3. Cómo lo consume tu adaptador

Mismo patrón que `GmailApiEmailAdapter`
(`deadlines/infrastructure/external/gmail-api-email.adapter.ts:42-53`):
inyectás `GoogleOAuthClientService`, le pedís `getClient()`, y se lo pasás
como `auth` al cliente de `googleapis` que corresponda.

La forma real está en
`documents/infrastructure/storage/google-drive/google-drive-document-storage.adapter.ts`
(`GoogleDriveDocumentStorage implements DocumentStoragePort`):

```ts
constructor(
  oauth: GoogleOAuthClientService,
  config: ConfigService,
  @Optional() driveClient?: DriveClient, // para testear sin pegarle a Google
  @Optional() sleep?: Sleep,             // para no esperar 1 s y 2 s en los tests
)
```

Los dos últimos parámetros son opcionales a propósito, igual que
`gmailClient`/`sleep` en `GmailApiEmailAdapter`: en producción no se pasan
(se construye con `google.drive(...)`), y en el test unitario del adaptador
se pasa un fake con solo los métodos que el código usa. Mirá
`gmail-api-email.adapter.spec.ts` como ejemplo del patrón.

**Reintentos.** Cada llamada a Drive pasa `retry: false`: `googleapis-common`
pone `retry = true` por defecto (`apirequest.js:264`) y `gaxios` reintentaría
por su cuenta encima de los 3 intentos propios (1 s y 2 s de espera). Un solo
dueño de los reintentos: el adaptador.

**El `@Optional()` no es cosmético — sin él, Nest rompe al armar tu
módulo.** `GmailApiEmailAdapter` lo tuvo así (sin `@Optional()`) hasta que
el primer test de integración que levantaba `DeadlinesModule` de verdad lo
sacó a la luz: Nest intenta resolver un parámetro de constructor opcional
igual que cualquier otro, y como el tipo es una interfaz (no sobrevive a la
compilación), no encuentra con qué inyectarlo y tira
`Nest can't resolve dependencies of ... Please make sure that the argument
at index [N] is available`. `@Optional()` le dice a Nest "si no hay
provider para esto, pasá `undefined` y seguí" — sin eso, cualquier
parámetro de constructor con un tipo sin runtime (interfaz, función, unión)
rompe el arranque del módulo entero, aunque tu código le ponga `?` en
TypeScript.

---

## 4. Lo que el cliente compartido NO te da

- **No crea la estructura de carpetas.** `VZ Causas`, `Modelos formales` y
  `Causas` las crea el caso de uso `SetupCloudStorage`, con
  `npm run documents:setup-storage` (idempotente). Ver ADR-005.
- **No reintenta nada.** `getClient()` solo arma el cliente autenticado; los
  reintentos ante error transitorio (`5xx`, `429`,
  `rateLimitExceeded`/`userRateLimitExceeded`, backoff exponencial, hasta 3
  intentos) son responsabilidad de tu adaptador — ADR-003 §2.5 ya te pide
  ese criterio, y `GmailApiEmailAdapter` lo implementa igual si querés
  copiar la forma.
- **No valida el entorno por vos.** `env.validation.ts` no exige
  `GOOGLE_OAUTH_*` para todo el equipo, a propósito (no romper el arranque
  de quien no toca Drive ni Gmail) — ver el comentario de
  `app.module.ts:20-36`. `documents.module.ts` tampoco rompe sin la config:
  ver §5.

---

## 5. Wiring: `documents` NO importa `GoogleOAuthModule`; lo inyecta como opcional

`deadlines.module.ts:41` importa `GoogleOAuthModule` porque solo se carga si
hay credenciales. `documents` tiene que arrancar **sin** credenciales (con
almacenamiento en memoria), y `GoogleOAuthClientService` usa `getOrThrow` en
su constructor: importar el módulo siempre rompería el arranque de todos.

Por eso `DOCUMENT_STORAGE_PROVIDER`
(`documents/infrastructure/storage/document-storage.factory.ts`) declara:

```ts
inject: [ConfigService, { token: GoogleOAuthClientService, optional: true }]
```

Es inyección normal de Nest: si `deadlines` registró el cliente, Nest espera
a que esté construido antes de llamar a la fábrica; si nadie lo registró,
llega `undefined` y la fábrica arma uno propio (solo si las tres
`GOOGLE_OAUTH_*` son reales). No se usa `ModuleRef.get`: puede devolver la
instancia sin construir (reproducido en `document-storage.wiring.spec.ts`).

---

## 6. Testing

Tres niveles:

1. **Unitario del adaptador**: fake del cliente de `googleapis` inyectado por
   constructor (§3).
2. **Integración sin Google**: `InMemoryDocumentStorage` reemplaza
   `DOCUMENT_STORAGE` vía `overrideProvider` (es el valor por defecto de
   `startTestApp`).
3. **Integración con la pila real de Google y un Google falso**:
   `test/shared/fakes/fake-google.ts` reemplaza solo el transporte HTTP
   (`oauthClient.transporter`); corren `googleapis` y `OAuth2Client` reales,
   con el canje del refresh token incluido. Ver `test/README.md` §3.8 y los
   specs `google-oauth-refresh`, `google-drive-case-folder` y
   `google-drive-templates`. No hay prueba automática contra Drive real: la
   lista de verificación manual está en el plan de HU-39.
