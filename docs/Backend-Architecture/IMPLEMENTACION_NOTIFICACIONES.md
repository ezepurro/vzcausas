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
`deadlines.module.ts`, el endpoint del disparo diario, y posiblemente la
mecánica de OAuth, los puede estar escribiendo también el compañero —
ver QN-04 y QN-05 antes de crear algo propio que choque.

---

## 1. Decisiones cerradas

| Id | Decisión | Fecha |
| --- | --- | --- |
| N-01 | **El subsistema se llama `deadlines`, no `notifications`.** Ya estaba en `ARQUITECTURA_BACKEND_V1.md:184` (EP-06, "Plazos y Notificaciones") desde la V1 de la arquitectura; no era una decisión a tomar, sino una corrección. | 18/10/2026 |
| N-02 | **Mi alcance es solo "Avisar" (HU30, HU32).** "Verificar" (HU51 detecta vencimientos, HU52 detecta prescripciones) es de otro integrante. No escribo `DetectUpcomingDeadlines` ni `DetectUpcomingPrescriptions`. | 18/10/2026 |
| N-03 | **Proveedor de correo: Gmail API, cliente OAuth propio.** Scopeado solo a `gmail.send`, independiente del cliente que el compañero use para Drive (que tampoco existe todavía en el código). Se descartó SMTP y proveedores de terceros (Resend, Brevo) porque el "gratis para siempre" pedido no puede depender de la política comercial de un tercero. Detalle: `ADR-004_EMAIL_GMAIL_API.md`. | 18/10/2026 |
| N-04 | **Disparo diario: GitHub Actions → endpoint interno protegido, invocado varias veces por día.** No es una sola corrida: se dispara cada 2-3 horas a propósito, para lograr el reintento del mismo día sin construir un scheduler ni una cola dentro del backend — como el envío es idempotente por destinatario (ver N-08), las invocaciones de más solo reintentan lo que falta. Resuelve R-01 (`ARQUITECTURA_BACKEND_V1.md:683`). | 18/10/2026 |
| N-05 | **HU30 y HU32 convergen en un único caso de uso, `SendDailyNotificationDigest`.** CA-30.6 y CA-32.7 exigen un solo correo diario con todo junto, no uno por historia. Dos casos de uso separados obligarían a juntar los correos después, duplicando trabajo. | 18/10/2026 |
| N-06 | **El correo se construye con un único mapper, reusado para la casilla y para cada abogado.** No hace falta Template Method (el algoritmo no varía, varía el input) ni Strategy (no hay formas intercambiables de la misma cosa) ni Observer (no hay tipos de reacción distintos conectables en tiempo de ejecución — ver N-07 y la sección de abajo). | 18/10/2026 |
| N-07 | **La copia al abogado no es una copia del correo de la casilla.** Es un correo distinto, con contenido filtrado a sus causas, y es el envío que más importa de los dos (CA-30.4 es más auditoría del estudio; que le llegue al responsable es lo que de verdad importa). Si el envío a la casilla sale bien y el de un abogado falla, hay que poder reintentar ese envío puntual el mismo día, sin reenviar a los demás. | 18/10/2026 |
| N-08 | **`sent_notifications` se amplía con `recipient_lawyer_id`** (`NULL` = casilla, con valor = ese abogado), y la clave de "ya avisado" pasa a ser `(case_id, kind, reference_date, recipient_lawyer_id)`. Propuesta escrita en `docs/support/cambios-bdd-sprint3.md:248`; falta prepararla como migración cuando lleguemos a esa parte (la corre mmachuca, no yo). | 18/10/2026 |
| N-09 | **Resolver el email del abogado responsable es mi mitad, no la detección.** Puerto nuevo, `LawyerContactLookupPort`, declarado por `deadlines` e implementado en `people` o `identity` (donde viva el email del usuario vinculado) — mismo patrón que `puertos-acl.md`. | 18/10/2026 |

---

## 2. Preguntas abiertas (coordinación con el compañero)

| Id | Pregunta |
| --- | --- |
| QN-01 | **¿Qué forma tiene exactamente lo que entrega HU51/HU52?** Propuse `UpcomingDeadlineNotice` y `PrescriptionNotice` (ver `.claude/rules/notificaciones.md`), como lista plana sin agrupar, con `responsibleLawyerId` pero sin el email resuelto. Es una propuesta mía, no un acuerdo. |
| QN-02 | **¿Qué pasa con `daily_job_runs` ahora que el disparo es varias veces por día?** Ya no puede significar "correr una sola vez al día" si la idea es reintentar — probablemente pase a ser solo informativo. Lo define quien sea dueño de esa tabla (la detección, probablemente). |
| QN-03 | **¿Dónde viven los valores de configuración de D-79** (días de preaviso, si se copia al responsable)? Supongo variables de entorno nuevas, pero no hay ningún `env.validation.ts` que las liste todavía — a confirmar si las agrego yo o ya las previó el compañero. |
| QN-04 | **¿Quién escribe el endpoint del disparo diario, y quién crea `deadlines.module.ts`?** El endpoint tiene que invocar tanto la detección como mi digest; si el compañero arranca primero con HU51/HU52, los dos ya van a existir cuando yo llegue — coordinar antes de crear algo propio que choque. |
| QN-05 | **El compañero dijo que "lo de OAuth" lo hace en `shared/`. ¿Es mecánica compartida con credenciales propias por subsistema, o una sola autorización con los dos scopes (`drive.file` + `gmail.send`) juntos?** Cambia si necesito mi propio proyecto de Google Cloud (N-03 queda igual) o si solo pido que agregue `gmail.send` a lo suyo (N-03 y `ADR-004_EMAIL_GMAIL_API.md` se reescriben). Ver `ARQUITECTURA_BACKEND_V1.md:536` (regla de admisión a `shared/`): la lectura más consistente con esa regla es la primera opción — algo tan genérico y libre de reglas de negocio como `PrismaService`, no una credencial única — pero no está confirmado. **No tocar N-03 ni el ADR hasta tener la respuesta.** |

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
| TN-01 | **Dos clientes OAuth autorizando la misma cuenta de Gmail** (este, y el eventual de Drive). No es un problema hoy; si el equipo decide unificarlos más adelante, es un refactor de infraestructura explícito, no una limpieza apurada. |
| TN-02 | **`daily_job_runs` puede quedar con una responsabilidad ambigua** si nadie redefine su alcance tras N-04 (QN-03). Revisar cuando el compañero tenga su mitad escrita. |

---

## 5. Plan de implementación

De adentro hacia afuera, mismo criterio que `EJEMPLO_CASO_DE_USO.md` §15 — los
pasos 1 a 5 se completan **antes** de escribir infraestructura.

| # | Archivo (propuesto) | Pregunta que responde | Bloqueado por |
| --- | --- | --- | --- |
| 1 | Tipos compartidos: `UpcomingDeadlineNotice`, `PrescriptionNotice`, `NotificationKind` | ¿Qué me entrega la detección? | QN-01 — hoy son una propuesta, no un contrato acordado |
| 2 | `core/domain/ports/email-sender.port.ts` (`EmailSenderPort`, `EmailMessage`) | ¿Qué necesito del exterior para mandar un correo? | Nada — puedo escribirlo ya |
| 3 | `core/domain/ports/lawyer-contact-lookup.port.ts` (`LawyerContactLookupPort`, `LawyerContact`) | ¿Cómo resuelvo el email del responsable? | Nada — puedo escribirlo ya |
| 4 | `core/domain/ports/sent-notification.repository.ts` (`existsFor(...)`, `record(...)`) | ¿Cómo evito avisar dos veces a un mismo destinatario? | N-08 (forma final de la fila) |
| 5 | `core/application/use-cases/send-daily-notification-digest.use-case.ts` | ¿En qué orden pasan las cosas? (algoritmo de `.claude/rules/notificaciones.md`) | Pasos 1-4 |
| 6 | Tests unitarios del caso de uso (con fakes de los tres puertos) | ¿Funciona el agrupamiento, el filtro de ya-avisados, el fallo parcial? | Paso 5 |
| 7 | `infrastructure/persistence/prisma-sent-notification.repository.ts` | ¿Cómo se guarda de verdad? | Migración de N-08 aplicada |
| 8 | `infrastructure/acl/<subsistema>-lawyer-contact-lookup.adapter.ts` | ¿Cómo hablo con `people`/`identity`? | Confirmar en cuál de los dos vive el email del usuario vinculado |
| 9 | `infrastructure/external/gmail-api-email.adapter.ts` (con `googleapis`) | ¿Cómo mando el correo de verdad? | Cliente OAuth autorizado — forma exacta a confirmar (QN-05); hoy asume ADR-004 §2.1 |
| 10 | `infrastructure/http/internal/...controller.ts` (endpoint del disparo) | ¿Cómo me dispara GitHub Actions? | QN-04 — a coordinar, puede no ser mío |
| 11 | `deadlines.module.ts` (binding de puertos a adaptadores) | ¿Cómo se arma todo? | QN-04 — puede ya existir si el compañero arrancó primero |
| 12 | Tests de integración, con `InMemoryEmailSender` como fake (mismo patrón que `InMemoryCloudStorage` de ADR-003) | ¿La forma de la respuesta y el comportamiento end-to-end son correctos? | Pasos 7-11 |

Fuera de este plan, puesta en marcha manual (no es código, no tiene test):
proyecto de Google Cloud propio, cliente OAuth, script `npm run
gmail:authorize`, variables `GMAIL_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN` y
`MANAGEMENT_MAILBOX` en `.env` — ver ADR-004 §2.1 y §2.3.

---

## 6. Registro de avance

| Fecha | Qué | Commit |
| --- | --- | --- |
| 18/10/2026 | Plan armado, nada implementado. Decisiones N-01 a N-09 cerradas con mmachuca; QN-01 a QN-05 pendientes de hablar con el compañero (QN-05 agregada tras saber que él va a tocar `shared/` para OAuth). | — |

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
