---
paths:
  - "backend/src/subsystems/deadlines/**/*.ts"
  - "backend/prisma/schema.prisma"
---

<!-- HU30 y HU32, Sprint 3. Fuente: API_CONTRACT_V4.md §4 "Proceso automático
     diario" y "Prescripción", §8.1 (D-45 a D-84), docs/support/cambios-bdd-sprint3.md,
     ADR-004_EMAIL_GMAIL_API.md. Decisiones tomadas con mmachuca el 18/10/2026.

     Corregido el mismo día: el alcance real es solo "Avisar" (HU30, HU32).
     "Verificar" (HU51, HU52 — detectar vencimientos y prescripciones) es de
     otro integrante del equipo. La primera versión de esta regla mezclaba
     las dos mitades como si fueran todas mías. -->

# Notificar vencimientos (HU30) y prescripción (HU32)

**El plan de implementación, el registro de avance y el estado de cada CA
viven en `docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md`.** Esta
regla explica las decisiones y el por qué; esa bitácora dice qué está hecho y
qué falta. Al empezar a codear, actualizarla ahí, no acá.

## El subsistema se llama `deadlines`, no `notifications`

`ARQUITECTURA_BACKEND_V1.md:184` ya lo nombra: EP-06, "Plazos y
Notificaciones", agregado raíz `Deadline`. No es una decisión a tomar, es una
que ya está en la arquitectura y se pasó por alto al plantear la tarea.

## Mi mitad: Avisar. La otra mitad, Verificar, no es mía

| Paso | HU | De quién |
|---|---|---|
| Verificar vencimientos | 51 | **De otro integrante del equipo.** Detecta vencimientos abiertos de causas activas (actos procesales y acto lesivo de amparos) y clasifica en preaviso / vence hoy |
| Verificar prescripción | 52 | **De otro integrante.** Detecta causas penales que llegan al 70% o cumplen el plazo |
| Avisar vencimientos | 30 | **Mía.** Envía por correo lo que encontró 51 |
| Avisar prescripción | 32 | **Mía.** Envía por correo lo que encontró 52 |

No escribo `DetectUpcomingDeadlines` ni `DetectUpcomingPrescriptions`. Si una
tarea me pide tocar esa detección, no es HU30/HU32 — frenar y avisar.

## Por qué converge en un solo caso de uso, no dos

CA-30.6 ("un solo correo por día con todos los avisos juntos") y CA-32.7
("estos avisos van en el mismo correo diario que los vencimientos") dicen lo
mismo desde los dos lados: **HU30 y HU32 no mandan dos correos separados**.
Mandan uno. Decidido con mmachuca el 18/10/2026: un único caso de uso,
`SendDailyNotificationDigest`, que recibe los avisos de las dos HU y arma el
correo del día. Dos casos de uso separados obligarían a juntar los correos
después en otro lado, duplicando trabajo contra lo que pide el CA.

```ts
// deadlines/core/application/use-cases/send-daily-notification-digest.use-case.ts
class SendDailyNotificationDigest {
  async execute(input: {
    deadlineNotices: UpcomingDeadlineNotice[];   // viene de HU51 (compañero)
    prescriptionNotices: PrescriptionNotice[];   // viene de HU52 (compañero)
  }): Promise<void> {
    // 1. filtra contra sent_notifications lo que ya se avisó
    // 2. agrupa por destinatario: la casilla (todo) + un grupo por abogado responsable (solo lo suyo)
    // 3. arma el HTML de cada correo
    // 4. envía con EmailSenderPort
    // 5. recién si el envío confirma éxito, inserta en sent_notifications
  }
}
```

## Contrato propuesto con HU51/HU52 — PENDIENTE DE CONFIRMAR CON EL COMPAÑERO

<!-- No es una decisión cerrada. Es lo que propuse el 18/10/2026 para que los
     dos puedan trabajar en paralelo sin bloquearse. Si se acuerda algo
     distinto con el compañero, esta sección se reemplaza por lo acordado. -->

Para no depender del código real de la detección, necesito que HU51/HU52 me
entreguen algo con esta forma (o equivalente — lo importante es el contenido,
no los nombres exactos):

```ts
// deadlines/core/domain/types/upcoming-deadline-notice.ts
export type NotificationKind =
  | 'DEADLINE_WARNING'
  | 'DEADLINE_DUE_TODAY'
  | 'PRESCRIPTION_ALERT'
  | 'PRESCRIPTION_EXPIRED';
// mismos literales que el enum notification_kind de sent_notifications —
// sin capa de traducción entre lo que detecta HU51/52 y lo que persisto yo.

export interface UpcomingDeadlineNotice {
  caseId: number;
  caption: string;                 // carátula, para el cuerpo del correo
  sacNumber: string | null;
  jurisdiction: Jurisdiction;      // enum ya existente en legal-parameters
  responsibleLawyerId: number;     // yo resuelvo el email, no HU51/52 (ver abajo)
  kind: 'DEADLINE_WARNING' | 'DEADLINE_DUE_TODAY';
  origin: 'PROCEDURAL_ACT' | 'HARMFUL_ACT';   // deadline_kind
  dueDate: string;                 // ISO. La misma fecha que currentState.dueDate o harmfulActDeadline (CA-30.10)
  proceduralActId: number | null;  // el acto que abrió el plazo; null si origin es HARMFUL_ACT
}

export interface PrescriptionNotice {
  caseId: number;
  caption: string;
  sacNumber: string | null;
  responsibleLawyerId: number;
  kind: 'PRESCRIPTION_ALERT' | 'PRESCRIPTION_EXPIRED';
  referenceDate: string;           // ISO. La prescriptionExpiresOn de la calificación que rige
  legalQualificationName: string;  // para que el correo diga "por <calificación>", no solo "prescribe"
}
```

**Por qué `responsibleLawyerId` y no el email ya resuelto:** resolver "¿este
abogado tiene un usuario con correo?" (CA-30.5) es lógica de **a quién
avisar**, que es mía, no de la detección. HU51/HU52 no tienen por qué saber
nada de `identity` ni de `people`. Para esto declaro un puerto nuevo:

```ts
// deadlines/core/domain/ports/lawyer-contact-lookup.port.ts
export const LAWYER_CONTACT_LOOKUP = Symbol('LAWYER_CONTACT_LOOKUP');

export interface LawyerContact {
  fullName: string;
  userEmail: string | null;   // null si no tiene usuario vinculado, o el usuario no tiene email
}

export interface LawyerContactLookupPort {
  findContactByLawyerId(lawyerId: number): Promise<LawyerContact | null>;
}
```

Implementado en `people/infrastructure/acl/` (o `identity`, donde viva el
email del usuario vinculado) — mismo patrón que `puertos-acl.md`: lo declaro
yo porque lo necesito yo.

## No se guarda nada calculado — es la trampa de esta HU

D-72 es textual: la verificación "no guarda un estado calculado en la causa:
aplica las mismas reglas que la API usa en cada lectura". Esto es
responsabilidad de HU51/HU52, pero me toca a mí vigilarlo desde el otro lado:
**las fechas que mando en el correo tienen que ser exactamente las que
entrega la detección**, sin recalcular nada de mi lado. Si el correo y el
detalle de la causa (`GET /cases/{caseId}`) alguna vez muestran fechas
distintas (viola CA-30.10), lo más probable es que yo esté transformando algo
que debería pasar tal cual.

## Cómo se agrupa y arma cada correo

Mi compañero me entrega una **lista plana, sin agrupar**: todos los avisos de
todas las causas que tienen algo que reportar hoy. Agrupar por destinatario es
mío, porque "a quién le interesa esto" es lógica de avisar, no de detectar.

```
notices = deadlineNotices + prescriptionNotices          // lista plana del compañero
pendientes = notices.filter(n => falta ALGÚN envío suyo en sent_notifications)

si pendientes está vacío → no se manda nada (CA-30.6)

// 1. La casilla: TODOS los pendientes, sin filtrar
correoCasilla = render(pendientes)
intentar enviar(MANAGEMENT_MAILBOX, correoCasilla)
si confirma éxito → insertar fila (case_id, kind, reference_date, recipient_lawyer_id: NULL) por cada notice incluido

// 2. Cada abogado: SOLO sus causas — no es una copia del correo de la casilla
si copyToResponsibleLawyer está habilitado:
  gruposPorAbogado = groupBy(pendientes, n => n.responsibleLawyerId)
  para cada (lawyerId, susAvisos) en gruposPorAbogado:
    contacto = LawyerContactLookupPort.findContactByLawyerId(lawyerId)
    si contacto?.userEmail existe:
      correoAbogado = render(susAvisos)                   // mismo render(), otro input
      intentar enviar(contacto.userEmail, correoAbogado)
      si confirma éxito → insertar fila (..., recipient_lawyer_id: lawyerId) por cada notice en susAvisos
```

**El `render()` es el mismo en los dos casos** (un `mapper`, en el sentido que
ya usa el proyecto para `case-http.mapper.ts` / `case-prisma.mapper.ts`): no
hay dos algoritmos, hay un algoritmo aplicado a dos subconjuntos de datos. No
es Template Method (no varía el comportamiento, varía el input) ni Strategy
(no hay formas intercambiables de la misma cosa). Tampoco es Observer —ver
abajo, por qué no, con detalle— porque los destinatarios no son tipos de
reacción distintos que se suscriben: son filas de un `Map` que yo mismo
calculé con `groupBy`.

## La casilla y la copia del abogado son envíos independientes, no uno y su copia

Corregido el 18/10/2026, con mmachuca: **la copia del abogado NO es una copia
del correo de la casilla — es un correo distinto, con contenido distinto, y
es el más importante de los dos** (CA-30.4 es más auditoría del estudio;
llegarle al responsable es lo que de verdad importa). Consecuencia directa:
si el envío a la casilla sale bien y el de un abogado falla, **no alcanza con
reintentar al otro día** — hay que poder reintentar ESE envío puntual, el
mismo día, sin volver a mandarle a la casilla ni a los abogados cuyo correo
ya salió.

Esto exige que `sent_notifications` sepa **por destinatario**, no solo por
causa — ver la sección de abajo.

## Qué guardo yo: `sent_notifications`

De `docs/support/cambios-bdd-sprint3.md:248`, ampliada el 18/10/2026 para
soportar el reintento independiente. Es lo único que mi mitad escribe, y
existe por una sola razón: no avisar dos veces (CA-30.7, CA-32.6) — ahora
"avisar" se cuenta por envío puntual, no por causa.

| Columna | Qué es |
|---|---|
| `case_id` | la causa |
| `kind` | `notification_kind` |
| `deadline_kind` | `PROCEDURAL_ACT` o `HARMFUL_ACT`, solo en avisos de vencimiento |
| `procedural_act_id` | el acto que abrió el plazo avisado |
| `reference_date` | el vencimiento o la fecha de prescripción avisada |
| `recipient_lawyer_id` | `NULL` = la casilla del estudio; con valor = la copia de ese abogado |
| `sent_at` | cuándo se confirmó ESE envío puntual |

**Antes de enviar a un destinatario dado, busco si ya existe una fila con
`(case_id, kind, reference_date, recipient_lawyer_id)`.** Si existe, no le
mando de nuevo a ese destinatario — pero sigo evaluando a los demás. Inserto
la fila **recién después de que ese envío puntual confirme éxito**: si se
inserta antes y el envío falla, el aviso se pierde para siempre para ese
destinatario.

**Por qué `reference_date` en la clave:** una renovación del acto lesivo abre
un vencimiento nuevo con otra fecha (CA-30.8), y un acto interruptivo que
reinicia la prescripción hace que la causa vuelva a llegar al 70% con otra
`prescriptionExpiresOn` (CA-32.6). Sin la fecha, la segunda vez no se
avisaría a nadie.

`daily_job_runs` no es mío: resuelve que la **detección** (HU51/HU52) no
recalcule de más, no que mi envío no se reintente. Son carreras distintas —
ver "Disparo diario" abajo, que ahora dispara varias veces por día a
propósito.

## Por qué no es Observer

Observer encaja cuando hay **tipos de reacción distintos y conectables en
tiempo de ejecución** ante el mismo evento — por ejemplo, si mañana además de
correo hubiera que mandar una notificación push o un mensaje a Slack: ahí sí
valdría un `NotificationChannel` (interfaz) con `EmailChannel` como una
implementación entre varias, y el caso de uso notificando "a todos los
canales" sin saber cuántos hay.

Lo que tengo acá es **un solo tipo de reacción (mandar un correo) aplicado a
varios destinatarios que yo mismo calculé agrupando datos**. No hay
polimorfismo entre reacciones, hay el mismo código corriendo con distinto
input — eso es simplemente iterar sobre un `Map`. Meter una clase `Subject`
con `attach/detach/notify` para esto es ceremonia sin beneficio (R-02 de
`ARQUITECTURA_BACKEND_V1.md` ya advierte contra esto exactamente). Si aparece
un canal nuevo, ahí es el momento de revisar esta decisión — no antes.

## El 70% es fijo — no es configuración

D-51: la alerta de prescripción es "al 70% fijo... no forma parte de la
configuración de avisos". Esto lo decide HU52 (no mío), pero si alguien me
pide que el correo permita cambiar el umbral, es un cambio de alcance — no es
mi HU ni la de HU52 tal como están escritas.

## Disparo diario: GitHub Actions → endpoint protegido, varias veces por día

Resuelve R-01 (`ARQUITECTURA_BACKEND_V1.md:683`). Decidido con mmachuca el
18/10/2026, ajustado el mismo día tras el tema del reintento:

- GitHub Actions con `schedule: cron` pega un `POST` a un endpoint interno,
  validado con un secreto compartido en un header, no con auth de usuario.
- **No es una sola vez al día.** Se dispara varias veces (por ejemplo, cada
  2-3 horas), **a propósito**, para lograr el reintento del mismo día sin
  construir un scheduler ni una cola de reintentos adentro del backend: como
  mi envío es idempotente por `(case_id, kind, reference_date,
  recipient_lawyer_id)`, cada invocación de más solo manda lo que todavía no
  salió. Si todo salió bien en la primera corrida del día, las siguientes no
  hacen nada (todo ya está en `sent_notifications`).
- Dentro de una misma invocación, el adaptador ya reintenta 3 veces ante
  error transitorio (ADR-004 §2.2) antes de darse por vencido con ese envío
  puntual — eso cubre fallas de segundos; las invocaciones repetidas del día
  cubren fallas más largas (Gmail caído 20 minutos, por ejemplo).
- **A confirmar con el compañero:** ese endpoint tiene que invocar tanto la
  detección (51/52) como mi digest (30/32) en secuencia — quién escribe esa
  pieza de glue es una costura más a acordar. Como ahora se invoca varias
  veces por día, también hay que acordar con él qué hace `daily_job_runs`:
  ya no puede significar "la detección corrió una vez hoy, no correr de
  nuevo" si la idea es que se vuelva a evaluar en cada disparo — probablemente
  pase a ser solo informativo (para monitoreo), no un guard que bloquee
  corridas repetidas.

## Envío de correo: Gmail API — OAuth resuelto (N-10), lo construyo yo

**QN-05 resuelta con mmachuca el 18/10/2026.** Era la pregunta sobre qué
significaba "lo de OAuth lo hago en `shared/`" que había dejado el
compañero. Dos lecturas posibles:

1. Mecánica compartida, credenciales propias por subsistema (más consistente
   con `ARQUITECTURA_BACKEND_V1.md:536`, mismo criterio que `PrismaService`).
2. **Una sola autorización con los dos scopes juntos** (`drive.file` +
   `gmail.send`, un solo refresh token para toda la app).

**Se eligió la opción 2.** Y con un cambio más: **lo construyo yo (mmachuca),
no el compañero.** El compañero no arrancó ni su mitad de detección
(HU51/HU52) ni Drive, y acordó que lo que yo construya ahora, él lo acopla
después. Esto reescribe `N-03` y `ADR-004_EMAIL_GMAIL_API.md` (ya aplicado).

Resumen de lo que cambia respecto a la primera versión de esta sección:

- **No hay cliente OAuth propio de `deadlines`.** Hay un único cliente,
  compartido, en `shared/infrastructure/google/` (diseño exacto — nombre de
  clase, de módulo — a confirmar con mmachuca antes de escribirlo, paso 8bis
  del plan).
- Variables: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
  `GOOGLE_OAUTH_REFRESH_TOKEN` (mismos nombres que `ADR-003_GOOGLE_DRIVE.md`
  ya preveía para Drive — ya no hace falta el prefijo `GMAIL_*` para evitar
  pisarlas, porque son la misma variable) y `MANAGEMENT_MAILBOX` (esta sí
  propia de `deadlines`, es el remitente). Ninguna existe todavía en ningún
  `.env` — hay que agregarlas.
- Script de puesta en marcha: **uno solo**, `npm run google:authorize`, pide
  los dos scopes juntos. Reemplaza a los `drive:authorize` / `gmail:authorize`
  separados que se habían planteado antes.
- Puerto: `EmailSenderPort` en `deadlines/core/domain/ports/` — sin cambios,
  sigue siendo lo único que `deadlines/core` conoce de esto.
- Adaptador: `GmailApiEmailAdapter` en `deadlines/infrastructure/external/`,
  con `googleapis` (dependencia nueva a instalar, todavía no está). Consume
  el cliente de `shared/infrastructure/google/` igual que cualquier adaptador
  de infraestructura consume `PrismaService` — no construye su propio
  `OAuth2Client`.

Ver `ADR-004_EMAIL_GMAIL_API.md` completo para el detalle y las consecuencias
(un solo refresh token para Drive y Gmail: si se revoca, se caen los dos
juntos — asumido y documentado, no es un olvido).

## A quién se manda (CA-30.4, CA-30.5, CA-32.4)

- **Siempre** a `MANAGEMENT_MAILBOX` (config de servidor, D-79).
- **Si está configurada la copia al responsable**: un correo por abogado,
  solo con sus causas, resuelto vía `LawyerContactLookupPort` (ver arriba).
- Un abogado sin usuario vinculado, o con usuario sin email, **no recibe
  copia** y no es un error: se omite en silencio (CA-30.5).

## Qué NO hace mi mitad

- No cambia el estado de ninguna causa (CA-30.12, D-52).
- No detecta nada (eso es HU51/HU52).
- No recalcula `businessDaysRemaining` ni `prescription.elapsedPercentage`:
  los recibe ya calculados en `UpcomingDeadlineNotice` / `PrescriptionNotice`.

## Pendientes, en orden de bloqueo

1. **Acordar con el compañero** la forma real de `UpcomingDeadlineNotice` y
   `PrescriptionNotice` (la de arriba se adoptó como hipótesis de trabajo el
   18/10/2026 — N-11 — para no bloquearse, pero no es un acuerdo cerrado).
2. **Acordar quién escribe el endpoint del disparo diario**, porque invoca
   las dos mitades, y qué pasa con `daily_job_runs` ahora que el disparo es
   varias veces por día (ver "Disparo diario" arriba).
3. **La migración de `sent_notifications`** (columna `recipient_lawyer_id`,
   confirmada con mmachuca el 18/10/2026, propuesta ya escrita en
   `docs/support/cambios-bdd-sprint3.md:248`) la prepara él cuando lleguemos
   a esa parte del plan — no generar el SQL todavía, esto es solo la
   decisión de forma.
4. Crear el proyecto de Google Cloud + cliente OAuth único (`drive.file` +
   `gmail.send`) + script `google:authorize` en `shared/infrastructure/google/`
   (N-10, ADR-004 §2.1) — a cargo de mmachuca ahora; diseño exacto a
   confirmar antes de escribirlo.
