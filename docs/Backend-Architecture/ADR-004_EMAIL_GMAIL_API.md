# ADR-004 — Envío de correo con la Gmail API, con cliente OAuth propio

| Campo        | Valor                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------- |
| Estado       | Propuesta — pendiente de aceptación por mmachuca                                          |
| Fecha        | 18/10/2026, corregido el mismo día tras confirmar el alcance real                         |
| Subsistema   | `deadlines`                                                                                |
| Historias    | HU30, HU32 (avisan) — Sprint 3. HU51, HU52 (detectan) son de otro integrante del equipo y no son parte de este ADR |
| Relacionado  | `ADR-003_GOOGLE_DRIVE.md` (mismo patrón de autorización, cliente **distinto**) · `ARQUITECTURA_BACKEND_V1.md` (R-01, §6.4, §7.6) · `API_CONTRACT_V4.md` (D-64, D-72, D-79) |

Continúa la numeración de ADR del proyecto: ADR-001 (monolito modular),
ADR-002 (excepción de `reporting`), ADR-003 (Drive).

<!-- Corregido el 18/10/2026: la primera versión de este ADR asumía que la
     autorización OAuth de Drive (ADR-003) ya estaba corriendo y que esto era
     una "reautorización" que le agregaba un scope. Verificado contra el
     código: no existe `subsystems/documents`, no está instalado `googleapis`,
     no hay ninguna variable `GOOGLE_*` ni `MANAGEMENT_MAILBOX` en ningún
     `.env`. ADR-003 es una decisión aceptada, no código escrito. Además, HU34,
     HU35, HU39 y HU40 (Drive) son de otro integrante del equipo, no de
     mmachuca. Por las dos razones, este ADR pasa a ser una autorización
     **propia e independiente**, de cero, scopeada solo a `gmail.send`. -->

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
(`users.messages.send`), usando un cliente OAuth propio de `deadlines`,
pedido **únicamente** con el scope `gmail.send`, sin relación con lo que
construya el compañero que hace Drive.**

Por qué separado y no un cliente único para todo Google: lo de Drive no
existe todavía, lo construye otra persona, y esperarlo bloquearía HU30/HU32
sin necesidad. Tener dos clientes OAuth autorizando la misma cuenta de Gmail
para cosas distintas es perfectamente normal — no hay un límite práctico ni
un motivo técnico para evitarlo. Si en algún momento el equipo decide
unificarlos, es un refactor de infraestructura, no algo que haya que resolver
ahora.

### 2.1 Autorización — de cero, no una extensión

1. Un proyecto de Google Cloud **propio** (puede ser el mismo que use Drive
   si ya existe, o uno nuevo — no importa, son clientes independientes), con
   la Gmail API habilitada.
2. Un cliente OAuth tipo **aplicación de escritorio**, con un único scope:

   ```ts
   const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];
   ```

3. Un script de una sola vez, `npm run gmail:authorize` (nombre propio, para
   no chocar con un eventual `drive:authorize` de tu compañero):
   - Abre el navegador con `access_type=offline` y `prompt=consent`.
   - Recibe el código en `http://127.0.0.1:{puerto}` (redirección *loopback*,
     la única que Google admite para apps de escritorio).
   - Canjea el código por un refresh token.
   - Imprime `client_id`, `client_secret` y el refresh token, para cargarlos
     como variables de entorno.
4. **Quién lo corre.** En desarrollo, con tu propia cuenta de Gmail o una de
   prueba. La cuenta real de gestión del estudio solo se autoriza una vez,
   más adelante, cuando el backend esté listo para desplegarse — igual que
   ADR-003 §2.6 prevé para Drive, cada uno con su propio trámite.
5. **Pantalla de consentimiento.** `gmail.send` es sensible, no restringido:
   no exige verificación de Google para uso personal. Quien autoriza acepta
   una vez el aviso de "esta app no está verificada".

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
`deadlines/infrastructure/external/`, con `googleapis` (se instala como
dependencia nueva; no asumas que ya está, porque no está).

- Construye el MIME (RFC 2822): `From`, `To`, `Cc`, `Subject`, `Content-Type:
  text/html`, cuerpo, todo codificado en base64url, y lo manda con
  `gmail.users.messages.send({ userId: 'me', requestBody: { raw } })`.
- `From` es `MANAGEMENT_MAILBOX` — tiene que ser la cuenta autenticada, o
  Gmail rechaza el envío.
- Reintentos ante error transitorio: hasta 3 intentos con espera exponencial,
  ante `5xx`, `429` o `403 rateLimitExceeded` — mismo criterio que
  `CloudStoragePort` en ADR-003 §2.5, aplicado acá de forma independiente.
- Ante `invalid_grant` (token revocado o 6 meses sin uso): se registra un
  error de severidad alta y hace falta repetir §2.1. **No se pierde el
  aviso**: el caso de uso no marca `sent_notifications` hasta que el envío
  confirma éxito, así que al otro día lo reintenta (idempotencia exigida por
  `ARQUITECTURA_BACKEND_V1.md:464`).

### 2.3 Variables de entorno — nuevas, propias de este ADR

```text
GMAIL_OAUTH_CLIENT_ID
GMAIL_OAUTH_CLIENT_SECRET
GMAIL_OAUTH_REFRESH_TOKEN     # secreto: nunca en el repositorio ni en los logs
MANAGEMENT_MAILBOX            # ya prevista en ARQUITECTURA_BACKEND_V1.md:623; acá es además el remitente
```

Nombradas `GMAIL_*` y no `GOOGLE_*`, a propósito: si más adelante aparece
`GOOGLE_OAUTH_CLIENT_ID` para Drive, tienen que poder convivir sin pisarse.

**Se retiran** de la lista prevista en `ARQUITECTURA_BACKEND_V1.md:622`,
porque nunca se implementaron y este ADR las reemplaza:

```text
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD
```

---

## 3. Alternativas evaluadas

| Alternativa | Por qué se descartó |
| --- | --- |
| **Esperar y compartir el cliente OAuth de Drive** | Drive no existe todavía y lo hace otro integrante del equipo; HU30/HU32 no tienen por qué depender de su cronograma |
| **SMTP de Gmail con contraseña de aplicación** | Mecanismo distinto (no OAuth), y Google viene restringiendo el acceso por contraseña en cuentas con verificación en dos pasos |
| **API transaccional de terceros (Resend, Brevo, SendGrid)** | El "gratis para siempre" pedido por el equipo dependería de la política comercial de un tercero, no de la cuenta del estudio |
| **Cuenta de servicio de Google Workspace** | Mismo motivo que ADR-003 §3: sin Workspace no hay delegación de dominio, y una cuenta de servicio no puede enviar correo "como" la cuenta de gestión |

---

## 4. Consecuencias

**Lo que se gana**

- Cero dependencia de otro integrante del equipo ni de su cronograma.
- Costo cero indefinido: es la cuenta de Gmail del estudio, no un proveedor
  con fines de lucro.
- El scope es el mínimo posible: `gmail.send` no da acceso a leer ni borrar
  correo, solo a mandarlo como esa cuenta.

**Lo que se paga**

| Riesgo | Mitigación |
| --- | --- |
| Dos clientes OAuth autorizando la misma cuenta (este y el eventual de Drive), cada uno con su propio refresh token | No es un problema técnico; son independientes. Si se unifican alguna vez, es un refactor de infraestructura explícito, no una limpieza de "más vale tarde" |
| El refresh token da permiso de mandar correo como la casilla del estudio: si se filtra, alcanza para eso | Se guarda como secreto, nunca en el repositorio ni en los logs — mismo tratamiento que cualquier otro secreto del proyecto |

---

## 5. Fuentes

- Gmail API — *Sending Email*: https://developers.google.com/gmail/api/guides/sending
- Gmail API — *users.messages.send* (referencia): https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send
- Gmail API — *OAuth scopes for Gmail API*: https://developers.google.com/gmail/api/auth/scopes
- Google Identity — *Using OAuth 2.0 to Access Google APIs*: https://developers.google.com/identity/protocols/oauth2
- Google Cloud — *When is verification not needed*: https://support.google.com/cloud/answer/13464323
