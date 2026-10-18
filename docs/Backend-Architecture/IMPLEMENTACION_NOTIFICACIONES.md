# Implementación de notificaciones (HU30, HU32) — Bitácora

Mismo formato que `IMPLEMENTACION_AUTH.md`, `IMPLEMENTACION_PEOPLE.md` e
`IMPLEMENTACION_CALIFICACIONES.md`.

Cubre **HU30** (Notificar fin de plazo de presentación) y **HU32** (Notificar
prescripción de causa), épica EP-06, Sprint 3.

Las dos historias viven **dentro de `deadlines`**, un subsistema cuya otra
mitad —detectar vencimientos (HU51) y detectar prescripciones (HU52)— es de
otro integrante del equipo. Por eso los identificadores van con sufijo `N`
(de "Notificar"): `N-xx` decisiones, `QN-xx` preguntas, `CN-xx` correcciones,
`TN-xx` deuda. Así no chocan con los que use el compañero para su mitad.

**Estado al 18/10/2026: nada implementado todavía.** Este documento es el
plan de trabajo armado antes de escribir código — no hay `subsystems/deadlines`
en el repo, no está instalado `googleapis`, y no hay ninguna variable
`GMAIL_*` ni `MANAGEMENT_MAILBOX` en ningún `.env`. Se arrancó así a
propósito: todo lo que sigue se decidió antes de tocar una línea, según
`.claude/CLAUDE.md` ("Toda implementación lleva planificación previa").

**Qué se va a tocar de otro, previsible desde ya:** el módulo
`deadlines.module.ts` y el endpoint del disparo diario los puede estar
escribiendo también el compañero — ver QN-04 antes de crear algo propio que
choque. La mecánica de OAuth (QN-05) ya no es "posiblemente del compañero":
ver N-10.

---

## 1. Decisiones cerradas

| Id | Decisión | Fecha |
| --- | --- | --- |
| N-01 | **El subsistema se llama `deadlines`, no `notifications`.** Ya estaba en `ARQUITECTURA_BACKEND_V1.md:184` (EP-06, "Plazos y Notificaciones") desde la V1 de la arquitectura; no era una decisión a tomar, sino una corrección. | 18/10/2026 |
| N-02 | **Mi alcance es solo "Avisar" (HU30, HU32).** "Verificar" (HU51 detecta vencimientos, HU52 detecta prescripciones) es de otro integrante. No escribo `DetectUpcomingDeadlines` ni `DetectUpcomingPrescriptions`. | 18/10/2026 |
| N-03 | **Proveedor de correo: Gmail API.** Se descartó SMTP y proveedores de terceros (Resend, Brevo) porque el "gratis para siempre" pedido no puede depender de la política comercial de un tercero. **La autorización OAuth no es un cliente propio de `deadlines`** — ver N-10, que reemplaza la parte de este ítem sobre un cliente independiente. Detalle: `ADR-004_EMAIL_GMAIL_API.md`. | 18/10/2026, corregido 18/10/2026 (N-10) |
| N-04 | **Disparo diario: GitHub Actions → endpoint interno protegido, invocado varias veces por día.** No es una sola corrida: se dispara cada 2-3 horas a propósito, para lograr el reintento del mismo día sin construir un scheduler ni una cola dentro del backend — como el envío es idempotente por destinatario (ver N-08), las invocaciones de más solo reintentan lo que falta. Resuelve R-01 (`ARQUITECTURA_BACKEND_V1.md:683`). | 18/10/2026 |
| N-05 | **HU30 y HU32 convergen en un único caso de uso, `SendDailyNotificationDigest`.** CA-30.6 y CA-32.7 exigen un solo correo diario con todo junto, no uno por historia. Dos casos de uso separados obligarían a juntar los correos después, duplicando trabajo. | 18/10/2026 |
| N-06 | **El correo se construye con un único mapper, reusado para la casilla y para cada abogado.** No hace falta Template Method (el algoritmo no varía, varía el input) ni Strategy (no hay formas intercambiables de la misma cosa) ni Observer (no hay tipos de reacción distintos conectables en tiempo de ejecución — ver N-07 y la sección de abajo). | 18/10/2026 |
| N-07 | **La copia al abogado no es una copia del correo de la casilla.** Es un correo distinto, con contenido filtrado a sus causas, y es el envío que más importa de los dos (CA-30.4 es más auditoría del estudio; que le llegue al responsable es lo que de verdad importa). Si el envío a la casilla sale bien y el de un abogado falla, hay que poder reintentar ese envío puntual el mismo día, sin reenviar a los demás. | 18/10/2026 |
| N-08 | **`sent_notifications` se amplía con `recipient_lawyer_id`** (`NULL` = casilla, con valor = ese abogado), y la clave de "ya avisado" pasa a ser `(case_id, kind, reference_date, recipient_lawyer_id)`. Propuesta escrita en `docs/support/cambios-bdd-sprint3.md:248`; falta prepararla como migración cuando lleguemos a esa parte (la corre mmachuca, no yo). | 18/10/2026 |
| N-09 | **Resolver el email del abogado responsable es mi mitad, no la detección.** Puerto nuevo, `LawyerContactLookupPort`, declarado por `deadlines` e implementado en `people` o `identity` (donde viva el email del usuario vinculado) — mismo patrón que `puertos-acl.md`. | 18/10/2026 |
| N-10 | **QN-05 resuelta: un único cliente OAuth, con los dos scopes juntos (`drive.file` + `gmail.send`), vive en `shared/`.** Es la opción 2 planteada en `.claude/rules/notificaciones.md:295` — no la opción 1 que el ADR daba como más consistente con la regla de admisión a `shared/` (`ARQUITECTURA_BACKEND_V1.md:540`); se eligió la 2 igual. **Lo construye mmachuca ahora, no el compañero**: el compañero no arrancó su mitad (HU51/HU52, ni Drive) y acordó que lo que mmachuca construya, él lo acopla después. Reemplaza la parte de N-03 sobre un cliente propio de `deadlines`, y reescribe `ADR-004_EMAIL_GMAIL_API.md` §2.1/§2.3. `TN-01` queda sin efecto: nunca hubo dos clientes, se decidió unificado desde el principio. | 18/10/2026 |
| N-11 | **QN-01 adoptada como hipótesis de trabajo, no como acuerdo cerrado con el compañero.** La forma de `UpcomingDeadlineNotice` / `PrescriptionNotice` propuesta en `.claude/rules/notificaciones.md:78-108` se usa para destrabar los pasos 1, 5 y 6 del plan. Si el compañero pide una forma distinta cuando escriba HU51/HU52, se ajusta ahí — no es una migración de esquema, son tipos de TypeScript en `core/domain/types`. | 18/10/2026 |

---

## 2. Preguntas abiertas (coordinación con el compañero)

| Id | Pregunta |
| --- | --- |
| QN-01 | **¿Qué forma tiene exactamente lo que entrega HU51/HU52?** Propuse `UpcomingDeadlineNotice` y `PrescriptionNotice` (ver `.claude/rules/notificaciones.md`), como lista plana sin agrupar, con `responsibleLawyerId` pero sin el email resuelto. **Adoptada como hipótesis de trabajo el 18/10/2026 → N-11.** Sigue sin ser un acuerdo firme con el compañero; se revisa si él pide otra forma. |
| QN-02 | **¿Qué pasa con `daily_job_runs` ahora que el disparo es varias veces por día?** Ya no puede significar "correr una sola vez al día" si la idea es reintentar — probablemente pase a ser solo informativo. Lo define quien sea dueño de esa tabla (la detección, probablemente). |
| QN-03 | **¿Dónde viven los valores de configuración de D-79** (días de preaviso, si se copia al responsable)? Supongo variables de entorno nuevas, pero no hay ningún `env.validation.ts` que las liste todavía — a confirmar si las agrego yo o ya las previó el compañero. |
| QN-04 | **¿Quién escribe el endpoint del disparo diario, y quién crea `deadlines.module.ts`?** El endpoint tiene que invocar tanto la detección como mi digest; si el compañero arranca primero con HU51/HU52, los dos ya van a existir cuando yo llegue — coordinar antes de crear algo propio que choque. |
| QN-05 | **Resuelta el 18/10/2026 → N-10.** Es la opción 2: una sola autorización con los dos scopes (`drive.file` + `gmail.send`) juntos, un único refresh token. La construye mmachuca, no el compañero (no arrancó su mitad). N-03 y `ADR-004_EMAIL_GMAIL_API.md` quedan reescritos. |

---

## 3. Correcciones a documentación existente

| Id | Corrección |
| --- | --- |
| CN-01 | **`cambios-bdd-sprint3.md` ampliado** con `recipient_lawyer_id` en `sent_notifications` (N-08). Ya aplicado. |
| CN-02 | **`ADR-004_EMAIL_GMAIL_API.md` corregido**: la primera versión asumía que la autorización de Drive (ADR-003) ya estaba corriendo y que esto era una extensión. No existe nada de Drive en el código todavía y es de otro integrante — quedó como autorización propia e independiente. Ya aplicado. |

---

## 4. Deuda técnica anticipada

| Id | Deuda |
| --- | --- |
| ~~TN-01~~ | ~~Dos clientes OAuth autorizando la misma cuenta de Gmail (este, y el eventual de Drive).~~ **Sin efecto tras N-10 (18/10/2026):** se decidió un único cliente desde el principio, no hubo que unificar nada después. | 
| TN-02 | **`daily_job_runs` puede quedar con una responsabilidad ambigua** si nadie redefine su alcance tras N-04 (QN-03). Revisar cuando el compañero tenga su mitad escrita. |

---

## 5. Plan de implementación

De adentro hacia afuera, mismo criterio que `EJEMPLO_CASO_DE_USO.md` §15 — los
pasos 1 a 5 se completan **antes** de escribir infraestructura.

| # | Archivo (propuesto) | Pregunta que responde | Bloqueado por |
| --- | --- | --- | --- |
| 1 | Tipos compartidos: `UpcomingDeadlineNotice`, `PrescriptionNotice`, `NotificationKind` | ¿Qué me entrega la detección? | Ninguno — hipótesis provisoria N-11, se ajusta si el compañero pide otra forma |
| 2 | `core/domain/ports/email-sender.port.ts` (`EmailSenderPort`, `EmailMessage`) | ¿Qué necesito del exterior para mandar un correo? | Nada — puedo escribirlo ya |
| 3 | `core/domain/ports/lawyer-contact-lookup.port.ts` (`LawyerContactLookupPort`, `LawyerContact`) | ¿Cómo resuelvo el email del responsable? | Nada — puedo escribirlo ya |
| 4 | `core/domain/ports/sent-notification.repository.ts` (`existsFor(...)`, `record(...)`) | ¿Cómo evito avisar dos veces a un mismo destinatario? | N-08 (forma final de la fila) |
| 5 | `core/application/use-cases/send-daily-notification-digest.use-case.ts` | ¿En qué orden pasan las cosas? (algoritmo de `.claude/rules/notificaciones.md`) | Pasos 1-4 |
| 6 | Tests unitarios del caso de uso (con fakes de los tres puertos) | ¿Funciona el agrupamiento, el filtro de ya-avisados, el fallo parcial? | Paso 5 |
| 7 | `infrastructure/persistence/prisma-sent-notification.repository.ts` | ¿Cómo se guarda de verdad? | Migración de N-08 aplicada |
| 8 | `infrastructure/acl/<subsistema>-lawyer-contact-lookup.adapter.ts` | ¿Cómo hablo con `people`/`identity`? | Confirmar en cuál de los dos vive el email del usuario vinculado |
| 8bis | `shared/infrastructure/google/` — cliente OAuth único (`drive.file` + `gmail.send`), script `google:authorize` (N-10) | ¿Cómo autorizo una sola vez para Drive y Gmail juntos? | Hecho: `google-oauth-client.service.ts` + `google-oauth.module.ts` + test, mismo molde que `PrismaService`. **No está importado en `app.module.ts` todavía** — se conecta junto con `deadlines.module.ts` (QN-04, sigue abierta) |
| 9 | `infrastructure/external/gmail-api-email.adapter.ts` (con `googleapis`) | ¿Cómo mando el correo de verdad? | Paso 8bis |
| 10 | `infrastructure/http/internal/...controller.ts` (endpoint del disparo) | ¿Cómo me dispara GitHub Actions? | QN-04 — a coordinar, puede no ser mío |
| 11 | `deadlines.module.ts` (binding de puertos a adaptadores) | ¿Cómo se arma todo? | QN-04 — puede ya existir si el compañero arrancó primero |
| 12 | Tests de integración, con `InMemoryEmailSender` como fake (mismo patrón que `InMemoryCloudStorage` de ADR-003) | ¿La forma de la respuesta y el comportamiento end-to-end son correctos? | Pasos 7-11 |

Fuera de la numeración: el punto 8bis es nuevo respecto al plan original. Antes el script de puesta en marcha (autorización manual, `npm run gmail:authorize`) estaba listado como "fuera del plan, no es código, no tiene test". Deja de ser así: ahora `shared/infrastructure/google/` **sí es código propio, con test**, porque lo construye mmachuca y lo va a consumir también `documents` cuando el compañero llegue a Drive.

Fuera de este plan, puesta en marcha manual (no es código, no tiene test):
correr una vez el script `npm run google:authorize` (paso 8bis) con una cuenta
de Gmail de prueba propia o del equipo, y cargar `GOOGLE_OAUTH_CLIENT_ID/
SECRET/REFRESH_TOKEN` y `MANAGEMENT_MAILBOX` en `.env` — ver ADR-004 §2.1 y
§2.3. La autorización real con la cuenta de gestión del estudio se hace más
adelante, al desplegar.

---

## 6. Registro de avance

| Fecha | Qué | Commit |
| --- | --- | --- |
| 18/10/2026 | Plan armado, nada implementado. Decisiones N-01 a N-09 cerradas con mmachuca; QN-01 a QN-05 pendientes de hablar con el compañero (QN-05 agregada tras saber que él va a tocar `shared/` para OAuth). | — |
| 18/10/2026 | QN-05 resuelta (N-10): cliente OAuth único en `shared/`, lo construye mmachuca porque el compañero no arrancó. QN-01 adoptada como hipótesis provisoria (N-11). TN-01 sin efecto. Plan ajustado: nuevo paso 8bis (cliente OAuth compartido). Arrancando pasos 1-4 (tipos y puertos de `deadlines`). | — |
| 18/10/2026 | Paso 8bis, parte manual: mmachuca armó a mano el proyecto `vzcausas-dev` en Google Cloud (Drive API y Gmail API habilitadas, pantalla de consentimiento externa en Testing con `teomach047@gmail.com` como test user), creó `backend/scripts/google-authorize.ts` y corrió `npm run google:authorize` con los dos scopes juntos. Refresh token obtenido y cargado en `backend/.env` (`GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN`, `MANAGEMENT_MAILBOX=teomach047@gmail.com`). Falta la parte de código del paso 8bis: el cliente compartido en `shared/infrastructure/google/` que lea estas variables. | — |
| 18/10/2026 | Paso 8bis, parte de código: `shared/infrastructure/google/google-oauth-client.service.ts` (lee las tres variables vía `ConfigService.getOrThrow`, falla fuerte si falta alguna, expone `getClient()`) + `google-oauth.module.ts` (`@Global()`, sin importar todavía en `app.module.ts` — se conecta junto con `deadlines.module.ts`) + test unitario. `tsc --noEmit` sin errores en los archivos nuevos (el resto del proyecto ya tenía errores preexistentes, ver `.claude/audit/verificacion-2026-10-18.md`, no relacionados con este cambio). `.env.example` de `docker/` y `backend/` documentados con placeholders — nunca con los valores reales. Corregido en el camino: `docker/.env.example` había quedado con secretos reales por una copia accidental; revertido antes de llegar a commitearse. | — |

### Estado de los criterios

| CA | Estado | De quién |
| --- | --- | --- |
| 30.1 Preaviso configurable, 3 días hábiles por defecto | Pendiente | Mío (el valor lo aplica mi digest; quién lo detecta es HU51) |
| 30.2 Vence hoy | Pendiente | Mío |
| 30.3 No avisar vencidos | Pendiente | HU51 (detección) — no entra un notice vencido a mi digest |
| 30.4 Siempre a la casilla | Pendiente | Mío |
| 30.5 Copia al responsable, solo sus causas, sin user sin email no recibe | Pendiente | Mío (N-07, N-09) |
| 30.6 Un correo por día, nada si no hay avisos | Pendiente | Mío (N-05) |
| 30.7 Una sola vez por vencimiento | Pendiente | Mío (N-08) |
| 30.8 Renovación de amparo vuelve a avisar | Pendiente | Mío, si `reference_date` cambia en el notice que recibo — depende de QN-01 |
| 30.9 Causas cerradas/baja no generan aviso | Pendiente | HU51 (detección) |
| 30.10 Fechas coinciden con detalle y tablero | Pendiente | Compartido: HU51 calcula, yo no transformo nada |
| 30.11 Config de servidor, no de pantalla | Pendiente | Mío (QN-04) |
| 30.12 No cambia nada de la causa | Pendiente | Mío por diseño — mi digest no escribe en `cases` |
| 32.1 70% fijo | Pendiente | HU52 (detección) |
| 32.2 No aplica a administrativas/amparos/penal sin calificación | Pendiente | HU52 (detección) |
| 32.3 Se actualiza al instante | Pendiente | HU52 (detección) |
| 32.4 Correo al 70% a casilla y responsable | Pendiente | Mío |
| 32.5 Correo al cumplir plazo | Pendiente | Mío |
| 32.6 Una sola vez, se reabre con acto interruptivo | Pendiente | Mío (N-08) |
| 32.7 Mismo correo diario que vencimientos | Pendiente | Mío (N-05) |
| 32.8 No cierra la causa | Pendiente | Mío por diseño |

### Tests pendientes de otros

No aplica todavía — nada se implementó.
