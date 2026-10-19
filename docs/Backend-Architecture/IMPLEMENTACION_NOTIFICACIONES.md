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

**Estado al 19/10/2026: los 12 pasos del plan están hechos**, incluidos los
tests de integración (paso 12). `DeadlinesModule` está wireado a
`AppModule` (importado condicionalmente, ver `app.module.ts:37-55`), y la
suite completa está en verde (70/872 unitarios, 18/428 de integración). Lo
que falta no es código propio: es HU51/HU52 (detección, de otro
integrante) — hasta que existan, los dos puertos temporales de TN-03 siguen
atados a stubs que devuelven `[]`, así que el digest corre pero no tiene
nada que avisar todavía. Ver "Estado de los criterios" más abajo para el
detalle fila por fila, y "Lo que el test de integración NO cubre" para lo
que queda de revisión manual.

Este documento nació como el plan de trabajo armado antes de escribir
código, según `.claude/CLAUDE.md` ("Toda implementación lleva planificación
previa") — lo que sigue debajo de esta nota es el registro histórico de esa
planificación y de cada paso según se fue haciendo.

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
| N-11 | **QN-01 confirmada con el compañero el 19/10/2026 — ya no es solo una hipótesis de trabajo.** La forma de `UpcomingDeadlineNotice` / `PrescriptionNotice` propuesta en `.claude/rules/notificaciones.md:78-108` sigue siendo la que HU51/HU52 van a entregar; él se adapta a lo que ya está escrito. Dicho eso, sigue siendo código (no un contrato versionado), así que si al escribir HU51/HU52 aparece algo que no encaja, se ajusta ahí igual. | 18/10/2026, confirmada 19/10/2026 |

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
| TN-03 | **`deadline-detection.port.ts` / `prescription-detection.port.ts` son un seam temporal, no un ACL real** (paso 10, 18/10/2026). `ARQUITECTURA_BACKEND_V1.md:458` dice que el disparador invoca `DetectUpcomingDeadlines.execute()`/`DetectUpcomingPrescriptions.execute()` directamente — detección y aviso son la misma mitad de subsistema, no dos subsistemas con un puerto entre medio. Estos dos archivos existen solo para que `daily-run.controller.ts` tenga algo que inyectar hoy. Cuando HU51/HU52 existan, lo esperable es **borrar estos dos archivos** e inyectar los casos de uso reales directo en el controller — no escribir un adaptador que los implemente. |

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
| 5 | `core/application/use-cases/send-daily-notification-digest.use-case.ts` | ¿En qué orden pasan las cosas? (algoritmo de `.claude/rules/notificaciones.md`) | Hecho: casilla y cada abogado se filtran, envían y registran por separado (idempotencia por destinatario, N-08); `SentNotificationRepository` esencial (propaga si falla), `EmailSenderPort`/`LawyerContactLookupPort` complementarios por destinatario (N-07). `copyToResponsibleLawyer` y `managementMailbox` entran por constructor — su origen real (QN-03) sigue sin resolver |
| 6 | Tests unitarios del caso de uso (con fakes de los tres puertos) | ¿Funciona el agrupamiento, el filtro de ya-avisados, el fallo parcial? | Hecho: 8 tests (`send-daily-notification-digest.use-case.spec.ts`) con fakes en `test-support/deadlines-fakes.ts`, mismo patrón que `people-fakes.ts`/`identity-fakes.ts` |
| 7 | `infrastructure/persistence/prisma-sent-notification.repository.ts` | ¿Cómo se guarda de verdad? | Hecho (`tsc --noEmit` limpio). **Sin verificar contra una base real** — eso es el paso 12 (`test:int`) |
| 8 | `identity/infrastructure/acl/deadlines-lawyer-contact-lookup.adapter.ts` | ¿Cómo hablo con `people`/`identity`? | Hecho: vive en `identity` (el email está en `User`, no en `Lawyer` de `people`). Agregado `UserRepository.findActiveByLawyerId` (aditivo), implementado en Prisma, in-memory y los fakes. `fullName` sale de `User.lastName/firstName`, no de `people.Lawyer` — un solo round-trip. Sin test unitario propio, mismo criterio que `lawyer-lookup.adapter.ts` |
| 8bis | `shared/infrastructure/google/` — cliente OAuth único (`drive.file` + `gmail.send`), script `google:authorize` (N-10) | ¿Cómo autorizo una sola vez para Drive y Gmail juntos? | Hecho: `google-oauth-client.service.ts` + `google-oauth.module.ts` + test, mismo molde que `PrismaService`. **No está importado en `app.module.ts` todavía** — se conecta junto con `deadlines.module.ts` (QN-04, sigue abierta) |
| 9 | `infrastructure/external/gmail-api-email.adapter.ts` (con `googleapis`) | ¿Cómo mando el correo de verdad? | Hecho: MIME a mano + `users.messages.send`, reintentos (3, backoff exponencial) ante `5xx`/`429`/`rateLimitExceeded`, `From` = `MANAGEMENT_MAILBOX`. Test unitario con fake de `gmail_v1.Gmail` y `sleep` inyectable (sin esperar de verdad). **Sin conectar a `deadlines.module.ts` todavía** (no existe — QN-04) |
| 10 | `infrastructure/http/internal/daily-run.controller.ts` + `internal-trigger.guard.ts` | ¿Cómo me dispara GitHub Actions? | Hecho, mmachuca lo toma (mismo criterio que N-10: compañero no arrancó). `POST /internal/deadlines/daily-run`, `@Public()` + guard de secreto compartido (`INTERNAL_TRIGGER_SECRET`, comparación con `timingSafeEqual`), sin auth de usuario. No es endpoint del contrato V4 — confirmado contra `API_CONTRACT_V4.md:7515`, que deja "el mecanismo que dispara el proceso diario" fuera de la API pública. Invoca detección + mi digest vía dos puertos **temporales** (`deadline-detection.port.ts`, `prescription-detection.port.ts`) sin implementación real — ver nota de TN-03 abajo. `.github/workflows/deadlines-daily-run.yml` creado (`cron: 0 */3 * * *` + `workflow_dispatch`). 7 tests nuevos (guard + controller), todos en verde |
| 11 | `deadlines.module.ts` (binding de puertos a adaptadores) | ¿Cómo se arma todo? | Hecho. `EMAIL_SENDER`→`GmailApiEmailAdapter`, `SENT_NOTIFICATION_REPOSITORY`→`PrismaSentNotificationRepository`, `LAWYER_CONTACT_LOOKUP`→`useExisting` del adaptador que ahora exporta `IdentityModule` (agregado ahí, no acá — el puerto es del consumidor). `MANAGEMENT_MAILBOX` sale de `ConfigService`; `COPY_TO_RESPONSIBLE_LAWYER` hardcodeado en `true` (default del contrato, `API_CONTRACT_V4.md:7383`) porque QN-03 sigue sin resolver. `DEADLINE_DETECTION`/`PRESCRIPTION_DETECTION` (TN-03) bindeados a stubs que devuelven `[]` — módulo auto-consistente, pero el digest no manda nada hasta que HU51/HU52 reemplacen esos dos. Requirió agregar `@Inject()` a `managementMailbox`/`copyToResponsibleLawyer` en el caso de uso (antes eran parámetros sueltos, sin token — Nest no puede inyectar eso), vía dos tokens nuevos en `daily-digest-config.port.ts`. **No importado en `app.module.ts` todavía, a propósito:** haría que la app no arranque para nadie sin `GOOGLE_OAUTH_*`/`MANAGEMENT_MAILBOX`/`INTERNAL_TRIGGER_SECRET` en su `.env`, compañero incluido. `tsc --noEmit` limpio, suite completa 70/872 en verde. **Sin verificar que el grafo de DI bootee de punta a punta** (necesitaría Postgres real + env completo) — eso es integración, paso 12 |
| 12 | Tests de integración, con `InMemoryEmailSender` como fake (mismo patrón que `InMemoryCloudStorage` de ADR-003) | ¿La forma de la respuesta y el comportamiento end-to-end son correctos? | Hecho: `test/subsystems/deadlines/daily-run.int.spec.ts`, 7 tests contra PostgreSQL real. `EMAIL_SENDER` reemplazado por `InMemoryEmailSender` (`test/shared/fakes/email-sender.fake.ts`, primero de esa carpeta — `test/README.md` §3.8), `DEADLINE_DETECTION`/`PRESCRIPTION_DETECTION` reemplazados por fakes controlables (`test/shared/fakes/deadline-detection.fake.ts`) porque los stubs reales de TN-03 siempre devuelven `[]`. Las 5 variables de `deadlines` se suman a `TEST_ENV` en `global-setup.ts` con valores inventados — seguro porque `GoogleOAuthClientService` no hace ninguna llamada de red al construirse. **Encontró un bug real, no de los tests:** al cargar `DeadlinesModule` de verdad por primera vez (nunca había pasado, ni en producción), `GmailApiEmailAdapter` no arrancaba — sus dos parámetros opcionales del constructor (`gmailClient`, `sleep`) no tenían `@Optional()`, y Nest los trataba como dependencias obligatorias de un tipo que no existe en runtime (interfaz/función), rompiendo el arranque de *cualquier* test de integración de la suite, no solo el nuevo. Corregido agregando `@Optional()` a los dos (`gmail-api-email.adapter.ts:45-46`). Suite completa verde: 70/872 unitarios, 18/428 de integración |

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
| 18/10/2026 | Paso 9: `deadlines/infrastructure/external/gmail-api-email.adapter.ts` (`GmailApiEmailAdapter implements EmailSenderPort`). Arma el MIME a mano y lo manda con `users.messages.send`; reintenta hasta 3 veces con backoff exponencial ante `5xx`/`429`/`rateLimitExceeded`/`userRateLimitExceeded` (ADR-004 §2.2, mismo criterio que `CloudStoragePort` de ADR-003 §2.5); no reintenta nada más, `invalid_grant` incluido. `From` sale de `MANAGEMENT_MAILBOX`. El cliente `gmail_v1.Gmail` y el `sleep` del backoff son inyectables opcionales para poder testear sin pegarle a Gmail ni esperar de verdad. 5 tests unitarios, los 5 en verde (`tsc --noEmit` también limpio). **Sin conectar a ningún módulo de Nest todavía** — `deadlines.module.ts` no existe (QN-04 sigue abierta). | — |
| 18/10/2026 | Perf: Jest sin `isolatedModules` tipaba el programa completo en cada corrida (2-5 min, un crash por falta de memoria). Agregado `"isolatedModules": true` en `backend/tsconfig.json` (no en la config de `ts-jest`, que lo tiene deprecado) — `tsc --noEmit` sigue cubriendo tipos aparte, no se pierde nada. Suite completa: de ~5 min a ~12-23 s, 68 suites / 866 tests en verde. No es una decisión de `deadlines`, beneficia a todo el equipo. | — |
| 18/10/2026 | Paso 7: `infrastructure/persistence/prisma-sent-notification.repository.ts` (`PrismaSentNotificationRepository`), `tsc --noEmit` limpio. Al escribirlo encontré que `SentNotificationKey` (paso 4) no incluía `deadlineKind`, aunque la restricción única real (`sent_notifications_once_key`, `schema.prisma:750`) sí — una causa con un vencimiento `PROCEDURAL_ACT` y otro `HARMFUL_ACT` coincidiendo en `kind`/`referenceDate` se leería como "ya avisado" sin estarlo. **Corregido a pedido de mmachuca**, no dejado como deuda: `SentNotificationKey` ahora incluye `deadlineKind` (`sent-notification.repository.ts`), `keyFor`/`recordFor` del caso de uso (paso 5) recalculados, `existsFor` del repositorio filtra por las 5 columnas, y los fakes/tests (paso 6) actualizados — incluye un test nuevo que prueba exactamente este caso (dos vencimientos del mismo tipo de aviso y fecha, distinto `deadlineKind`, los dos se avisan). Suite de `deadlines`: 13/13 en verde; suite completa: 866/866. | — |
| 18/10/2026 | Paso 8: `identity/infrastructure/acl/deadlines-lawyer-contact-lookup.adapter.ts`. Confirmado leyendo el código: el email vive en `User` (`identity`), no en `Lawyer` (`people`) — `glosario`/`dominio.md` ya lo distingue ("el usuario es la cuenta; el abogado es la ficha profesional"). Agregado `UserRepository.findActiveByLawyerId(lawyerId): Promise<User \| null>`, aditivo (la propia interfaz invita a esto: "the frontier is additive"); implementado en `PrismaUserRepository`, `InMemoryUserRepository` y `test-support/identity-fakes.ts`. Rompía la compilación de cuatro `FakeUserRepository` locales y duplicadas, preexistentes, en specs de `identity` (`authenticate-user`, `change-password`, `refresh-session`, `access-token-verifier`) — completadas mecánicamente con el mismo patrón que ya tenían. Suite completa: 68 suites / 866 tests en verde. | — |
| 19/10/2026 | `COPY_TO_RESPONSIBLE_LAWYER` dejó de estar hardcodeado: ahora es la variable de entorno opcional `COPY_TO_RESPONSIBLE_LAWYER` (`deadlines.module.ts`, default `"true"` si no está definida — no se agregó a `REQUIRED_VARS` de `env.validation.ts`, a pedido de mmachuca: no tiene sentido obligarla a todo el equipo todavía). Agregada a `backend/.env.example` y `docker/.env.example`. | — |
| 19/10/2026 | Paso 12 (tests de integración): hecho, `test/subsystems/deadlines/daily-run.int.spec.ts`, 7/7 en verde contra PostgreSQL real — ver fila del paso 12 arriba para el detalle, incluido el bug de `@Optional()` que encontró y se corrigió en `gmail-api-email.adapter.ts`. Suite completa: 70/872 unitarios, 18/428 de integración. | — |
| 19/10/2026 | `ADR-003_GOOGLE_DRIVE.md` §2.1 y §2.6 corregidos: hablaban de un cliente OAuth y un script (`drive:authorize`) propios de `documents`, que N-10 (18/10) ya había reemplazado por el cliente único de `shared/` — igual que se corrigió ADR-004 (CN-02), a ADR-003 nunca se le había aplicado la corrección. Se agregó `GOOGLE_OAUTH_CLIENTE_COMPARTIDO.md`: guía práctica de cómo el compañero de Drive consume `GoogleOAuthClientService`, con el mismo patrón que `GmailApiEmailAdapter` (incluido el `@Optional()` recién corregido, para que no repita el bug). | — |
| 19/10/2026 | Corregido a pedido de mmachuca: en desarrollo, **cada integrante autoriza con su propia cuenta de Gmail**, no se comparte un único refresh token entre `deadlines` y Drive. El cliente (`GOOGLE_OAUTH_CLIENT_ID/SECRET`) sí es el mismo para los dos; `GOOGLE_OAUTH_REFRESH_TOKEN` es personal, sale de que cada uno corra `npm run google:authorize` con su propia cuenta, agregada antes como *test user* del proyecto `vzcausas-dev`. Ajustado en `GOOGLE_OAUTH_CLIENTE_COMPARTIDO.md` §2 (reescrita) y en la nota de "Entornos" de `ADR-003_GOOGLE_DRIVE.md` §2.6, que decía "una cuenta de Gmail del equipo" en singular y quedaba ambiguo. Aclarado que esto es solo para desarrollo: en producción sigue siendo una sola cuenta (la del estudio) con un solo refresh token para todo, como ya decía N-10. | — |
| 18/10/2026 | Paso 10: endpoint del disparo diario. mmachuca lo toma (compañero no arrancó, mismo criterio que N-10) — queda avisado después. `deadlines/infrastructure/http/internal/daily-run.controller.ts` (`POST /internal/deadlines/daily-run`, `@Public()` + `SkipThrottle`) + `internal-trigger.guard.ts` (secreto compartido `INTERNAL_TRIGGER_SECRET`, `timingSafeEqual`). Confirmado que no es un endpoint del contrato V4 (`API_CONTRACT_V4.md:7515` lo deja fuera explícitamente). Detección conectada vía dos puertos temporales, sin implementación — **TN-03**, a borrar cuando HU51/HU52 existan. `.github/workflows/deadlines-daily-run.yml`: `cron: 0 */3 * * *` + `workflow_dispatch`, secretos de repo `DEADLINES_API_URL`/`INTERNAL_TRIGGER_SECRET` (a cargar a mano en GitHub, no commiteados). `INTERNAL_TRIGGER_SECRET` agregado a los `.env.example`, sin tocar `env.validation.ts` todavía (nada conectado a `app.module.ts`). 7 tests nuevos, todos en verde. Suite completa: 70 suites / 872 tests. **Ajustado el mismo día:** el proyecto todavía no está desplegado, así que el `schedule: cron` queda comentado (solo `workflow_dispatch` activo) para no generar fallos automáticos cada 3 horas contra una URL que no existe — descomentar cuando haya despliegue real. | — |

### Estado de los criterios

| CA | Estado | De quién |
| --- | --- | --- |
| 30.1 Preaviso configurable, 3 días hábiles por defecto | Pendiente | Mío (el valor lo aplica mi digest; quién lo detecta es HU51) |
| 30.2 Vence hoy | Pendiente | Mío |
| 30.3 No avisar vencidos | Pendiente | HU51 (detección) — no entra un notice vencido a mi digest |
| 30.4 Siempre a la casilla | **Verificado (test de integración)** | Mío |
| 30.5 Copia al responsable, solo sus causas, sin user sin email no recibe | **Verificado (test de integración)** | Mío (N-07, N-09) |
| 30.6 Un correo por día, nada si no hay avisos | **Verificado (test de integración)** | Mío (N-05) |
| 30.7 Una sola vez por vencimiento | **Verificado (test de integración)** | Mío (N-08) |
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

### Lo que el test de integración NO cubre — pendiente de revisión manual

- **`PrescriptionNotice` no se ejercitó en `daily-run.int.spec.ts`** contra la
  base real — solo `UpcomingDeadlineNotice`. El código es el mismo algoritmo
  (`Notice = UpcomingDeadlineNotice | PrescriptionNotice`) y sí está cubierto
  por el test unitario del caso de uso con fakes, pero el *round-trip* real
  contra `sent_notifications` (en particular, `deadline_kind: null` para una
  prescripción) no se verificó end-to-end. Agregar un caso si se quiere
  cerrar esto del todo.
- **CA-32.\* siguen en "Pendiente"**: igual que CA-30.9/30.10/30.11, dependen
  de que HU52 entregue datos reales — el mecanismo de envío ya está probado,
  pero nada llega a ejercitarlo en producción hasta que la detección exista.
