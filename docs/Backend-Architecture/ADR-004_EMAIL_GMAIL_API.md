# ADR-004 — Envío de correo con la Gmail API, con cliente OAuth compartido

| Campo        | Valor                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------- |
| Estado       | Aceptada, corregida 18/10/2026 (2da vez)                                                  |
| Fecha        | 18/10/2026, corregido el mismo día tras confirmar el alcance real, y otra vez tras resolver QN-05 |
| Subsistema   | `deadlines` (el envío); el cliente OAuth vive en `shared/`                                |
| Historias    | HU30, HU32 (avisan) — Sprint 3. HU51, HU52 (detectan) son de otro integrante del equipo y no son parte de este ADR |
| Relacionado  | `ADR-003_GOOGLE_DRIVE.md` (mismo cliente OAuth, no uno distinto — ver corrección de abajo) · `ARQUITECTURA_BACKEND_V1.md` (R-01, §6.4, §7.6) · `API_CONTRACT_V4.md` (D-64, D-72, D-79) · `IMPLEMENTACION_NOTIFICACIONES.md` (N-10) |

Continúa la numeración de ADR del proyecto: ADR-001 (monolito modular),
ADR-002 (excepción de `reporting`), ADR-003 (Drive).

<!-- Corregido el 18/10/2026: la primera versión de este ADR asumía que la
     autorización OAuth de Drive (ADR-003) ya estaba corriendo y que esto era
     una "reautorización" que le agregaba un scope. Verificado contra el
     código: no existe `subsystems/documents`, no está instalado `googleapis`,
     no hay ninguna variable `GOOGLE_*` ni `MANAGEMENT_MAILBOX` en ningún
     `.env`. ADR-003 es una decisión aceptada, no código escrito. Además, HU34,
     HU35, HU39 y HU40 (Drive) son de otro integrante del equipo, no de
     mmachuca. Por esas dos razones, esta ADR pasó a asumir una autorización
     propia e independiente, de cero, scopeada solo a `gmail.send`
     (QN-05 de `IMPLEMENTACION_NOTIFICACIONES.md` seguía sin respuesta). -->

<!-- Corregido otra vez el 18/10/2026, tras resolver QN-05 con mmachuca: NO es
     un cliente propio de `deadlines`. Es un único cliente OAuth, con los dos
     scopes juntos (`drive.file` + `gmail.send`), que vive en `shared/` y
     comparten `deadlines` (este ADR) y `documents` (ADR-003, cuando el
     compañero llegue a esa parte). Lo construye mmachuca ahora, porque el
     compañero no arrancó su mitad y acordó que se acopla después a lo que
     mmachuca haga. Decisión registrada como N-10 en
     `IMPLEMENTACION_NOTIFICACIONES.md`. Las secciones 2.1 y 2.3 de abajo
     quedan reescritas; la sección 3 (alternativas) conserva la fila original
     con una nota, porque la alternativa que se había descartado es,
     literalmente, lo que se termina haciendo. -->

---

## 1. Contexto

RNF 5 exige avisar vencimientos por correo. `API_CONTRACT_V4.md` (D-79) fija
que la casilla de gestión, los días de preaviso, la hora de la corrida y la
copia al responsable son **configuración del servidor**, no de la API.
`ARQUITECTURA_BACKEND_V1.md:622` había previsto variables genéricas
`SMTP_HOST/PORT/USER/PASSWORD`, pero **ningún documento llegó a elegir un
proveedor**. Es el hueco que cierra este ADR.

Restricciones:

- **Presupuesto nulo**, y tiene que seguir siendo gratis indefinidamente, no
  solo mientras dure el free tier de un proveedor comercial.
- **No hay nada de Google ya autorizado en este proyecto.** ADR-003 (Drive)
  describe una decisión tomada, no algo en funcionamiento, y además es
  responsabilidad de otro integrante del equipo. Este ADR no depende de que
  esa autorización exista ni de cuándo se construya.

De la documentación de Google:

| Hecho | Fuente |
| --- | --- |
| La Gmail API envía correo con `users.messages.send`, recibiendo el mensaje como MIME RFC 2822 codificado en base64url | Gmail API, *Sending Email* |
| `gmail.send` es un scope **Sensible** (no Restringido): alcanza con la excepción de app sin verificar para uso personal (menos de 100 usuarios) | Gmail API, *OAuth Scopes for Gmail API* |
| El remitente de un mensaje enviado por la API tiene que ser la cuenta autenticada (o un alias verificado suyo) | Gmail API, *Sending Email* |

---

## 2. Decisión

**El backend envía los correos de HU30/HU32 con la Gmail API v1
(`users.messages.send`), usando un cliente OAuth único y compartido, que vive
en `shared/` y pide los dos scopes juntos (`drive.file` + `gmail.send`) en
una sola autorización. `deadlines` no tiene cliente OAuth propio.**

Decidido con mmachuca el 18/10/2026 (N-10 de
`IMPLEMENTACION_NOTIFICACIONES.md`): entre las dos lecturas de "lo de OAuth lo
hago en `shared/`" que el compañero había dejado abiertas (mecánica genérica
con credenciales por subsistema, o una sola autorización con los dos scopes
juntos), se elige la segunda. **Quién lo construye:** mmachuca, no el
compañero — el compañero no arrancó su mitad (ni HU51/HU52 ni Drive) y acordó
que lo que mmachuca construya ahora, él lo acopla después cuando llegue a
Drive.

Por qué un cliente único y no dos (lo que este ADR proponía en su primera
versión): ya no aplica la razón original —"Drive no existe todavía, lo
construye otra persona, esperarlo bloquearía HU30/HU32"— porque ahora el que
construye la pieza de Drive-y-Gmail es la misma persona que construye
HU30/HU32. No tiene sentido que mmachuca se bloquee a sí mismo esperando algo
que él mismo va a escribir.

### 2.1 Autorización — un solo trámite para los dos scopes

1. Un proyecto de Google Cloud (el mismo que prevé ADR-003 §2.1, si ya se
   creó; si no, se crea ahora — es uno solo para todo Google en este
   proyecto), con la Gmail API **y** la Drive API habilitadas.
2. Un cliente OAuth tipo **aplicación de escritorio**, con los dos scopes
   juntos:

   ```ts
   const SCOPES = [
     'https://www.googleapis.com/auth/drive.file',
     'https://www.googleapis.com/auth/gmail.send',
   ];
   ```

3. Un script de una sola vez, `npm run google:authorize` (reemplaza a los
   `drive:authorize` / `gmail:authorize` que ADR-003 y la versión anterior de
   este ADR proponían por separado):
   - Abre el navegador con `access_type=offline` y `prompt=consent`.
   - Recibe el código en `http://127.0.0.1:{puerto}` (redirección *loopback*,
     la única que Google admite para apps de escritorio).
   - Canjea el código por un refresh token único, válido para ambos scopes.
   - Imprime `client_id`, `client_secret` y el refresh token, para cargarlos
     como variables de entorno.
4. **Quién lo corre.** En desarrollo, con una cuenta de Gmail propia o de
   prueba. La cuenta real de gestión del estudio se autoriza una sola vez,
   más adelante, cuando el backend esté listo para desplegarse — un trámite
   único para Drive y Gmail juntos, no uno por subsistema.
5. **Pantalla de consentimiento.** `gmail.send` es sensible y `drive.file` no
   sensible; ninguno exige verificación de Google para uso personal (menos de
   100 usuarios). Quien autoriza acepta una vez el aviso de "esta app no está
   verificada", para los dos scopes juntos.
6. **Dónde vive el cliente.** `shared/infrastructure/google/` expone un
   `OAuth2Client` (`google-auth-library`) ya autenticado (mismo criterio que `PrismaService` en
   `ARQUITECTURA_BACKEND_V1.md:551`: es mecánica genérica, libre de reglas de
   negocio — no sabe si lo usa Gmail o Drive). `deadlines/infrastructure` lo
   inyecta para construir `gmail.users.messages.send(...)`; `documents/infrastructure`
   hará lo mismo para `drive.files.*` cuando el compañero llegue a esa parte.
   Diseño exacto (nombre de la clase, del módulo) pendiente de acuerdo final
   con mmachuca antes de escribirse — ver paso 8bis del plan en
   `IMPLEMENTACION_NOTIFICACIONES.md`.

### 2.2 Envío del correo

Puerto nuevo, declarado por `deadlines` (quien lo necesita, no quien lo
implementa — mismo criterio que `puertos-acl.md`):

```ts
// deadlines/core/domain/ports/email-sender.port.ts
export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export interface EmailMessage {
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
}

export interface EmailSenderPort {
  send(message: EmailMessage): Promise<void>;
}
```

Nombrado por necesidad, no por tecnología: el día de mañana podría ser otra
API y la interfaz seguiría siendo correcta.

Implementación: `GmailApiEmailAdapter`, en
`deadlines/infrastructure/external/`, con `@googleapis/gmail`. Se usa el paquete de la API y no `googleapis`
entero: el índice de `googleapis` declara los tipos de todas las APIs de Google (~180 MB) y dejaba al compilador sin memoria (01/11/2026).

- Construye el MIME (RFC 2822): `From`, `To`, `Cc`, `Subject`, `Content-Type:
  text/html`, cuerpo, todo codificado en base64url, y lo manda con
  `gmail.users.messages.send({ userId: 'me', requestBody: { raw } })`.
- `From` es `MANAGEMENT_MAILBOX` — tiene que ser la cuenta autenticada, o
  Gmail rechaza el envío.
- Reintentos ante error transitorio: hasta 3 intentos con espera exponencial,
  ante `5xx`, `429` o `403 rateLimitExceeded` — mismo criterio que
  `CloudStoragePort` en ADR-003 §2.5, aplicado acá de forma independiente.
- Ante `invalid_grant` (token revocado o 6 meses sin uso): se registra un
  error de severidad alta y hace falta repetir §2.1 — y esa vez afecta a
  Gmail **y** Drive juntos, porque es el mismo refresh token (ver riesgo en
  §4). **No se pierde el aviso**: el caso de uso no marca `sent_notifications`
  hasta que el envío confirma éxito, así que al otro día lo reintenta
  (idempotencia exigida por `ARQUITECTURA_BACKEND_V1.md:464`).

### 2.3 Variables de entorno — compartidas con Drive, no propias de este ADR

```text
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REFRESH_TOKEN     # secreto: nunca en el repositorio ni en los logs
MANAGEMENT_MAILBOX             # ya prevista en ARQUITECTURA_BACKEND_V1.md:623; acá es además el remitente
```

**Ya no son `GMAIL_*`.** La versión anterior de este ADR las nombraba así a
propósito, para no pisarse con un futuro `GOOGLE_OAUTH_CLIENT_ID` de Drive.
Esa razón desaparece: ahora es la misma variable para los dos, con el nombre
que ya preveía `ADR-003_GOOGLE_DRIVE.md:208-210`. `MANAGEMENT_MAILBOX` sigue
siendo propia de `deadlines` (es el remitente del correo, no una credencial
OAuth) y no se toca.

**Se retiran** de la lista prevista en `ARQUITECTURA_BACKEND_V1.md:622`,
porque nunca se implementaron y este ADR las reemplaza:

```text
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD
```

---

## 3. Alternativas evaluadas

| Alternativa | Por qué se descartó |
| --- | --- |
| ~~Esperar y compartir el cliente OAuth de Drive~~ | ~~Drive no existe todavía y lo hace otro integrante del equipo; HU30/HU32 no tienen por qué depender de su cronograma.~~ **Es, literalmente, la decisión final (N-10).** La razón para descartarla deja de valer el 18/10/2026: ya no hay que "esperar" a que el compañero construya Drive, porque es mmachuca quien construye el cliente compartido ahora, antes de que exista ningún código de `documents` |
| **SMTP de Gmail con contraseña de aplicación** | Mecanismo distinto (no OAuth), y Google viene restringiendo el acceso por contraseña en cuentas con verificación en dos pasos |
| **API transaccional de terceros (Resend, Brevo, SendGrid)** | El "gratis para siempre" pedido por el equipo dependería de la política comercial de un tercero, no de la cuenta del estudio |
| **Cuenta de servicio de Google Workspace** | Mismo motivo que ADR-003 §3: sin Workspace no hay delegación de dominio, y una cuenta de servicio no puede enviar correo "como" la cuenta de gestión |

---

## 4. Consecuencias

**Lo que se gana**

- Un solo trámite de autorización para todo Google, no dos — el estudio
  acepta una sola vez el aviso de "app no verificada", para Drive y Gmail
  juntos.
- Costo cero indefinido: es la cuenta de Gmail del estudio, no un proveedor
  con fines de lucro.
- Los scopes son los mínimos posibles para lo que hace cada subsistema:
  `gmail.send` no da acceso a leer ni borrar correo; `drive.file` solo da
  acceso a lo que la app crea.

**Lo que se paga**

| Riesgo | Mitigación |
| --- | --- |
| **Un único refresh token para Drive y Gmail:** si se revoca o vence (`invalid_grant`), se cae el envío de correo **y** todo lo de Drive a la vez, no uno por separado | Mismo procedimiento que antes (repetir §2.1), pero ahora en un solo lugar — no hay que repetirlo dos veces para cada integración. Cada falla sigue siendo complementaria (R-03): ni el alta de una causa ni el envío del digest abortan por esto |
| **mmachuca construye ahora una pieza que iba a ser del compañero** (la mitad de Drive del cliente OAuth), sin haber acordado con él la forma exacta todavía | Se avisa explícitamente en `IMPLEMENTACION_NOTIFICACIONES.md` (N-10) que el diseño queda abierto a que el compañero lo ajuste cuando llegue a HU34/HU35/HU39/HU40 — no es una decisión unilateral escondida |
| El refresh token da permiso de mandar correo como la casilla del estudio y de operar sobre lo que la app crea en Drive: si se filtra, alcanza para las dos cosas | Se guarda como secreto, nunca en el repositorio ni en los logs — mismo tratamiento que cualquier otro secreto del proyecto |

---

## 5. Fuentes

- Gmail API — *Sending Email*: https://developers.google.com/gmail/api/guides/sending
- Gmail API — *users.messages.send* (referencia): https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send
- Gmail API — *OAuth scopes for Gmail API*: https://developers.google.com/gmail/api/auth/scopes
- Google Identity — *Using OAuth 2.0 to Access Google APIs*: https://developers.google.com/identity/protocols/oauth2
- Google Cloud — *When is verification not needed*: https://support.google.com/cloud/answer/13464323
