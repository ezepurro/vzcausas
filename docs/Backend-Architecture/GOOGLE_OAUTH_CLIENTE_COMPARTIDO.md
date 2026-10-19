# Cliente OAuth compartido de Google — guía de uso para `documents`

Quién lo necesita: quien escriba `GoogleDriveStorageAdapter` (ADR-003,
`CloudStoragePort`). Este documento es el "cómo lo uso", no el "por qué" —
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

```ts
// documents/infrastructure/external/google-drive-storage.adapter.ts
import { Injectable, Optional } from "@nestjs/common";
import { drive_v3, google } from "googleapis";
import { GoogleOAuthClientService } from "@shared/infrastructure/google/google-oauth-client.service";
import { CloudStoragePort } from "../../core/domain/ports/cloud-storage.port";

export type DriveFilesClient = Pick<drive_v3.Drive, "files" | "permissions">;

@Injectable()
export class GoogleDriveStorageAdapter implements CloudStoragePort {
  private readonly drive: DriveFilesClient;

  constructor(
    oauth: GoogleOAuthClientService,
    @Optional() driveClient?: DriveFilesClient, // inyectable opcional, para testear sin pegarle a Google
  ) {
    this.drive =
      driveClient ?? google.drive({ version: "v3", auth: oauth.getClient() });
  }

  // createFolder, copyFile, uploadFile, downloadFile, grantWriter,
  // revokeAccess, listUserAccess — ver la forma exacta del puerto en
  // ADR-003_GOOGLE_DRIVE.md §2.4.
}
```

El segundo parámetro del constructor (`driveClient`) es opcional a
propósito, igual que `gmailClient`/`sleep` en `GmailApiEmailAdapter`: en
producción no se pasa (se construye con `google.drive(...)`), y en el test
unitario del adaptador se pasa un fake con solo los métodos que tu código
usa — así el test no toca la red ni el OAuth real. Mirá
`gmail-api-email.adapter.spec.ts` como ejemplo del patrón.

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

- **No crea la estructura de carpetas.** `VZ Causas` y
  `VZ Causas/Modelos formales` (ADR-003 §2.2) son tuyas para crear, una
  sola vez, guardando sus identificadores de Drive como
  `GOOGLE_DRIVE_ROOT_FOLDER_ID`/`GOOGLE_DRIVE_TEMPLATES_FOLDER_ID`. Podés
  extender `google-authorize.ts` con un paso que las cree y las imprima, o
  escribir una rutina separada que use tu propio `CloudStoragePort` una vez
  que exista — es una decisión de diseño tuya, no una restricción del
  cliente compartido.
- **No reintenta nada.** `getClient()` solo arma el cliente autenticado; los
  reintentos ante error transitorio (`5xx`, `429`,
  `rateLimitExceeded`/`userRateLimitExceeded`, backoff exponencial, hasta 3
  intentos) son responsabilidad de tu adaptador — ADR-003 §2.5 ya te pide
  ese criterio, y `GmailApiEmailAdapter` lo implementa igual si querés
  copiar la forma.
- **No valida el entorno por vos.** `env.validation.ts` no exige
  `GOOGLE_OAUTH_*` para todo el equipo, a propósito (no romper el arranque
  de quien no toca Drive ni Gmail) — ver el comentario de
  `app.module.ts:20-36`. `documents.module.ts`, cuando exista, va a
  necesitar el mismo patrón de import condicional que
  `deadlines.module.ts:102` si querés que tu módulo tampoco rompa a nadie
  sin la config cargada.

---

## 5. Wiring: tu módulo importa `GoogleOAuthModule` igual que `deadlines`

`GoogleOAuthModule` es `@Global()`, pero eso solo lo hace visible **una vez
que algo lo importa** — no se auto-registra. `deadlines.module.ts:41`
(`imports: [SharedModule, IdentityModule, GoogleOAuthModule]`) es el
ejemplo: tu `documents.module.ts` necesita el mismo import explícito.

---

## 6. Testing

Para pruebas unitarias del adaptador: fake del cliente de `googleapis`
inyectado por constructor (§3). Para pruebas de integración: `ADR-003`
§2.4 ya prevé `InMemoryCloudStorage` como el fake que reemplaza
`CloudStoragePort` completo vía `overrideProvider` — mismo patrón que
`test/shared/fakes/email-sender.fake.ts` (`InMemoryEmailSender`, el primero
de esa carpeta, escrito para los tests de integración de `deadlines`):
implementá el puerto, guardá lo que recibiste, y agregá un flag para
simular una falla si tu CA lo pide.
