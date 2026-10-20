# Implementación de la detección diaria (HU51, HU52) — Bitácora

Mismo formato que `IMPLEMENTACION_NOTIFICACIONES.md`, `IMPLEMENTACION_AUTH.md`
e `IMPLEMENTACION_CALIFICACIONES.md`.

Cubre **HU51** (Verificar vencimiento de plazo de presentación, VZ-176) y
**HU52** (Verificar plazo de prescripción, VZ-175), épica EP-06, Sprint 3.

Las dos historias son la mitad "Verificar" del subsistema `deadlines`. La
otra mitad, "Avisar" (HU30, HU32), es de mmachuca y ya está hecha: ver
`IMPLEMENTACION_NOTIFICACIONES.md`. Por eso los identificadores van con
sufijo `V` (de "Verificar"): `V-xx` decisiones, `QV-xx` preguntas, `CV-xx`
contradicciones, `TV-xx` deuda. Así no chocan con los `N-xx` de esa bitácora.

**Regla de convivencia.** Lo que hizo mmachuca no se modifica sin preguntar
antes: el digest, el adaptador de Gmail, `sent_notifications`, el controller
del disparo diario, sus fakes y sus tests. Esta bitácora tampoco actualiza la
suya; lo que haya que cambiarle se coordina con él.

---

## 1. Decisiones cerradas

| Id | Decisión | Fecha |
| --- | --- | --- |
| V-01 | **Se empieza por HU52.** Todas sus reglas ya existen en `cases` y tienen tests (`summarizePrescription`, `cases/core/domain/prescription.ts:85`), y no tiene preguntas de negocio abiertas. HU51 depende del vencimiento del acto lesivo (D-78), que no está implementado ni decidido de quién es (QV-01). | 20/10/2026 |
| V-02 | **Plazo cumplido → solo `PRESCRIPTION_EXPIRED`, nunca también la alerta.** La alerta del 70 % corresponde a los días entre el umbral y el vencimiento. Una causa que el sistema ve por primera vez ya prescripta recibe solo el aviso de cumplida. | 20/10/2026 |
| V-03 | **La detección es de solo lectura.** No escribe en ninguna tabla, ni en `cases` ni en `daily_job_runs`. "Registrar qué se avisó" (CA-51.7, CA-52.7) lo hace el digest en `sent_notifications`, después de enviar. CA-52.5 se cumple por construcción: el caso de uso no tiene ningún puerto de escritura. | 20/10/2026 |
| V-04 | **Las reglas se reusan de `cases`, no se reescriben.** El 70 %, la calificación que prescribe primero, el acto interruptivo más reciente, la causa activa (`ACTIVE_CASE`, `case-query-prisma.adapter.ts:274`) y los días hábiles son de `cases`. `deadlines` solo clasifica el resultado. Es lo que garantiza que la detección coincida con la causa y los tableros (D-72, CA-51.9). | 20/10/2026 |
| V-05 | **El adaptador ACL vive en `cases/infrastructure/acl/`**, del lado del proveedor. Es la práctica del repo (`legal-parameters-active-cases-counter.adapter.ts:11`, `identity/infrastructure/acl/deadlines-lawyer-contact-lookup.adapter.ts`), aunque `ARQUITECTURA_BACKEND_V1.md` §6.2 lo ubique del lado del consumidor (CV-04). | 20/10/2026 |
| V-06 | **El puerto de `deadlines` recibe `today` y devuelve fechas en ISO.** `today` lo elige la detección, así toda la corrida usa una sola fecha. La conversión a `YYYY-MM-DD` la hace el adaptador ACL con `toIsoDate`, porque `deadlines/core` no puede importar infraestructura y `PrescriptionNotice.referenceDate` ya es `string`. | 20/10/2026 |
| V-07 | **`cases` expone un caso de uso (`ListActivePrescriptions`), no una consulta suelta.** Hay una regla que aplicar sobre los datos (la prescripción), y `ARQUITECTURA_BACKEND_V1.md` §6.3 pide que un subsistema exponga casos de uso. El precedente sin caso de uso (`legal-parameters-active-cases-counter.adapter.ts:20-24`) se justifica justamente porque allí no hay regla. | 20/10/2026 |
| V-08 | **Consulta propia en `cases` (`CriminalPrescriptionQueryPort`)**, no un método más en `CaseQueryPort`, para no tocar el puerto y el adaptador de HU20/HU22. | 20/10/2026 |
| V-09 | **Cambiar los meses de una calificación vuelve a enviar la alerta** si la causa sigue arriba del 70 %: cambia `expiresOn`, que es parte de la clave de `sent_notifications`. El contrato solo menciona el acto interruptivo (`API_CONTRACT_V4.md:7017-7019`), pero es información nueva y se acepta. | 20/10/2026 |
| V-10 | **La primera corrida en producción manda junto todo lo que ya está en alerta.** Aceptado. | 20/10/2026 |
| V-11 | **Fakes propios** en `deadlines/core/application/use-cases/test-support/detection-fakes.ts`, con su propio reloj falso. No se toca `deadlines-fakes.ts`, que es de mmachuca. | 20/10/2026 |
| V-12 | **(HU51) Preaviso en ventana:** se detecta mientras faltan entre 1 y N días hábiles, no solo el día exacto. El digest manda una sola vez por la clave de `sent_notifications` (`schema.prisma:750`). Cubre el día sin corrida y el plazo abierto con menos de N días. | 20/10/2026 |
| V-13 | **(HU51) Los vencidos se clasifican pero no se avisan** (D-64). La función de dominio los distingue, así CA-51.3 tiene test; se cuentan en el log, sin aviso. | 20/10/2026 |
| V-14 | **(HU51) Días de preaviso en la variable `DEADLINE_WARNING_BUSINESS_DAYS`**, opcional, 3 por defecto (D-79), mismo criterio que `COPY_TO_RESPONSIBLE_LAWYER` en `deadlines.module.ts:63-67`. | 20/10/2026 |

| V-15 | **HU51 completa, cadena del acto lesivo incluida (D-67, D-78, D-82).** Decidido con Matusan30. Lo que ya está en `develop` (regla, alta, lectura) se reusa, no se reescribe. | 20/10/2026 |
| V-16 | **HU51 se hace en dos fases.** A: vencimientos de actos procesales (todas las reglas existen). B: acto lesivo en la detección, en `GET /cases` (D-82) y en los tableros. | 20/10/2026 |
| V-17 | **`harmfulActOf` se exporta desde `list-cases.use-case.ts` (código de MateoCastro304) en vez de copiarse.** Su parámetro pasa a `HarmfulActFields` (solo los seis campos que lee); el comportamiento no cambia. Así la causa y la detección deciden igual cuándo un amparo tiene plazo. Aprobado por Matusan30 (opción a). | 20/10/2026 |
---

## 2. Preguntas abiertas

| Id | Pregunta |
| --- | --- |
| QV-01 | ~~(HU51) ¿De quién es el vencimiento del acto lesivo (D-78)?~~ **Resuelta el 20/10/2026 (V-15):** la cadena completa es nuestra. Al rebasar sobre `develop` resultó que MateoCastro304 ya había hecho la regla (`cases/core/domain/value-objects/harmful-act.ts`), el alta con todos los datos de D-67 y la lectura con `harmfulActDeadline` (`0e446d3`). Queda: orden y filtro de `GET /cases` (D-82), los dos tableros con `HARMFUL_ACT` y la detección. |
| QV-02 | **¿Cuántas veces por día corre el disparo?** CA-51.1 y D-79 dicen una vez a las 08:00; N-04 de mmachuca dice cada 3 horas, para reintentar en el día. A la detección no le cambia nada (es de solo lectura). Argumento para charlar con mmachuca: el aviso de "vence hoy" solo existe ese día; si la única corrida falla, se pierde. Lo decide Matusan30 con mmachuca. |
| QV-03 | **TN-03 de `IMPLEMENTACION_NOTIFICACIONES.md:84`:** borrar los puertos temporales `DEADLINE_DETECTION`/`PRESCRIPTION_DETECTION` e inyectar los casos de uso directo en el controller. Lo coordina Matusan30 con mmachuca. Mientras tanto, el token se ata al caso de uso real con `useExisting`, sin romper los tests de mmachuca. |

---

## 3. Contradicciones encontradas (documentadas, no corregidas)

| Id | Contradicción |
| --- | --- |
| CV-01 | `.claude/CLAUDE.md:195-198` dice que el avance de la prescripción y la calificación que prescribe primero "los calcula el cliente". V4 D-51 (`API_CONTRACT_V4.md:7355`) dice que los calcula el backend, y `prescription.ts` ya lo hace. Manda V4. |
| CV-02 | `.claude/rules/consultar-causas.md:146-147` dice que el calendario "incluye sábados, domingos y feriados". V4 §4 (`API_CONTRACT_V4.md:6896`) y CA-51.4: solo sábados y domingos son no hábiles. |
| CV-03 | El comentario de `daily_job_runs` en `schema.prisma:754-755` ("para que no corra dos veces el mismo día") choca con N-04 (varias corridas por día). Es QN-02 de mmachuca, todavía abierta. |
| CV-04 | `ARQUITECTURA_BACKEND_V1.md` §6.2 ubica el adaptador ACL en el consumidor; el repo lo ubica en el proveedor. Se sigue el repo (V-05). |
| CV-05 | CA-51.9 no se puede verificar del todo hoy: `GET /cases` no devuelve `prescription` ni `harmfulActDeadline` (V4 §3.7), y los tableros solo listan `PROCEDURAL_ACT` (`get-lawyer-dashboard.use-case.ts:22`). |
| CV-06 | `.claude/CLAUDE.md:69` dice "no está en V3"; debería decir V4. |

---

## 4. Deuda técnica

| Id | Deuda |
| --- | --- |
| TV-01 | `useExisting` sobre el token temporal `PRESCRIPTION_DETECTION` es un puente hasta resolver QV-03, no el diseño final. |
| TV-02 | **Aislamiento de los tests de integración:** `daily-run.int.spec.ts` no limpia `sent_notifications` al terminar, y cuatro limpiezas de `cases` no la borran antes que `cases`. Fallan o no según el orden de las suites. Lo arregla mmachuca. El spec de integración de HU52 (paso 8) tiene que limpiar lo que escribe al terminar. |
| TV-03 | **Test inestable ajeno:** `case-folder-contract.int.spec.ts` › CA-39.6 falla a veces con la suite completa (`CREATING` en vez de `CREATED`) y pasa solo. Es del módulo de documentos (HU39); avisar a su autor. |
| TV-04 | **La suite de integración en segundo plano se corta sola** cuando coincide con el hook `Stop` del harness (`.claude/hooks/verificar.ps1`), que corre `tsc` y `npm test` al cerrar cada turno: Jest termina sin error y sin resumen (código 127). Correrla en primer plano evita la superposición. Es del harness, no del código. |

---

## 5. Plan de implementación — HU52

De adentro hacia afuera, mismo criterio que `EJEMPLO_CASO_DE_USO.md` §15.
Cada paso se commitea por separado (los commits los hace Matusan30).

| # | Archivo | Pregunta que responde | Estado |
| --- | --- | --- | --- |
| 1 | `deadlines/core/domain/prescription-notice-kind.ts` + spec | ¿Qué aviso corresponde hoy? (V-02) | Hecho |
| 2 | `deadlines/core/domain/ports/prescription-status.port.ts` | ¿Qué necesita `deadlines` de `cases`? (V-06) | Hecho |
| 3 | `deadlines/core/application/use-cases/detect-upcoming-prescriptions.use-case.ts` + spec + `test-support/detection-fakes.ts` | ¿En qué orden pasan las cosas? (V-03, V-11) | Hecho. La clase se llama `DetectUpcomingPrescriptionsUseCase`, con el sufijo que usa el resto de `deadlines` (`SendDailyNotificationDigestUseCase`) |
| 4 | `cases/core/domain/ports/criminal-prescription-query.port.ts` + `cases/infrastructure/persistence/criminal-prescription-query-prisma.adapter.ts` | ¿Qué causas se revisan? (CA-52.1, CA-52.4, V-08) | Hecho. El adaptador se llama `*-query-prisma.adapter.ts`, como los demás de lectura de `cases` (`case-query-prisma.adapter.ts`), no `*-prisma.query.ts`, que es la convención de `reporting`. Probado contra la base en el paso 8 |
| 5 | `cases/core/application/use-cases/list-active-prescriptions.use-case.ts` + spec | ¿Cómo se aplica la regla de `cases`? (CA-52.3, CA-52.6, CA-52.8, V-07) | Hecho. 7 tests, con el fake de la consulta dentro del spec para no tocar `case-fakes.ts` |
| 6 | `cases/infrastructure/acl/deadlines-prescription-status.adapter.ts` + spec | ¿Cómo se traduce al vocabulario de `deadlines`? (V-05, V-06) | Hecho. 2 tests con el caso de uso real y la consulta falsa |
| 7 | `case.module.ts` y `deadlines.module.ts` (cableado) | ¿Cómo se arma todo? (QV-03, TV-01) | Hecho, aprobado por Matusan30. `CasesModule` registra la consulta, el caso de uso y el adaptador contra `PRESCRIPTION_STATUS` y exporta solo ese token (mismo mecanismo que los contadores). `DeadlinesModule` importa `CasesModule`, registra `DetectUpcomingPrescriptionsUseCase` y ata `PRESCRIPTION_DETECTION` con `useExisting`. Los comentarios de mmachuca en `deadlines.module.ts` quedaron intactos aunque digan que la prescripción es un stub (opción a): se lo comenta Matusan30 |
| 8 | `test/subsystems/deadlines/detect-upcoming-prescriptions.int.spec.ts` | ¿Funciona contra la base real y coincide con el tablero? | Hecho. 11 tests contra PostgreSQL real, con la detección real (no reemplaza `PRESCRIPTION_DETECTION`); solo el reloj fijo y el correo en memoria. Limpia `sent_notifications` antes que las causas y al terminar (TV-02) |

## 5 bis. Plan de implementación — HU51

### Fase A — vencimientos de actos procesales

| # | Archivo | Pregunta que responde | Estado |
| --- | --- | --- | --- |
| A1 | `deadlines/core/domain/deadline-notice-kind.ts` + spec | ¿Qué es cada vencimiento hoy: preaviso, vence hoy, vencido? (CA-51.3, V-12, V-13) | Hecho |
| A2 | `deadlines/core/domain/ports/open-deadlines.port.ts` | ¿Qué necesita `deadlines` de `cases`? Ya con `origin`, para no cambiarlo en la fase B | Hecho |
| A3 | `deadlines/core/domain/ports/deadline-warning-config.port.ts` | Token de los días de preaviso (D-79, V-14) | Hecho |
| A4 | `deadlines/core/application/use-cases/detect-upcoming-deadlines.use-case.ts` + spec, `FakeOpenDeadlines` en `detection-fakes.ts` | ¿En qué orden pasan las cosas? Los vencidos solo se cuentan en el log | Hecho |
| A5 | `cases/core/domain/ports/open-deadline-query.port.ts` + `cases/infrastructure/persistence/open-deadline-query-prisma.adapter.ts` | ¿Qué vencimientos están abiertos? (`ACTIVE_CASE`, `COALESCE(manual, computado)`, CA-51.4) | Hecho. Probado contra la base en A9 |
| A6 | `cases/core/application/use-cases/list-open-deadlines.use-case.ts` + spec | `businessDaysRemaining` con la regla de `cases` (CA-51.9) | Hecho. 4 tests |
| A7 | `cases/infrastructure/acl/deadlines-open-deadlines.adapter.ts` + spec | Traducción al vocabulario de `deadlines` | Hecho. 2 tests. El fuero se traduce con un mapa exhaustivo: los dos `JurisdictionCode` tienen los mismos valores pero son tipos distintos |
| A8 | `case.module.ts`, `deadlines.module.ts`, `.env.example` | Cableado y variable `DEADLINE_WARNING_BUSINESS_DAYS` | Hecho, aprobado por Matusan30. `CasesModule` registra `ListOpenDeadlines`, la consulta y el adaptador contra `OPEN_DEADLINES` y exporta solo el token. `DeadlinesModule` registra `DetectUpcomingDeadlinesUseCase`, ata `DEADLINE_DETECTION` con `useExisting` y lee la variable (3 por defecto; un valor que no es entero ≥ 1 corta el arranque). Los comentarios de mmachuca sobre los stubs quedaron intactos (opción a), aunque ya no queda ningún stub |
| A9 | `test/subsystems/deadlines/detect-upcoming-deadlines.int.spec.ts` | ¿Funciona contra la base y coincide con la causa y el tablero? | Hecho. 10 tests contra PostgreSQL real con la detección real, con un reloj propio que se mueve entre corridas (el de `fixed-clock.ts` no lo permite). Limpia `sent_notifications` antes que las causas y al terminar (TV-02) |

### Fase B — acto lesivo

| # | Qué | Estado |
| --- | --- | --- |
| B1 | Regla del vencimiento del acto lesivo (D-78) | Hecho en `develop` por MateoCastro304 (`HarmfulAct`) |
| B2 | Alta con los datos por fuero (D-67) | Hecho en `develop` |
| B3 | `harmfulActDeadline` en la lectura, solo en "Iniciada" | Hecho en `develop` (`withDeadlines`, `list-cases.use-case.ts`) |
| B4 | Orden por urgencia y `openDeadline` de `GET /cases` con el acto lesivo (D-82) | Pendiente: decidir en memoria o en SQL |
| B5 | Tableros del abogado y del administrador con `kind: HARMFUL_ACT` | Pendiente |
| B6 | La detección suma el vencimiento del acto lesivo | Hecho. `OpenDeadlineQueryPort` suma `findActiveAmparosWithHarmfulAct` (amparos activos en "Iniciada" con fecha de acto lesivo); `ListOpenDeadlines` les calcula el vencimiento con `harmfulActOf` + `HarmfulAct.deadline`, lo mismo que usa `ListCases` para `harmfulActDeadline` (V-17). El puerto de `deadlines` no cambió. 6 tests de integración nuevos |

---

## 6. Registro de avance

| Fecha | Qué | Commit |
| --- | --- | --- |
| 20/10/2026 | Plan armado y decisiones V-01 a V-14 cerradas con Matusan30. | — |
| 20/10/2026 | Paso 1: `prescriptionNoticeKind` (función pura) y su spec. | — |
| 20/10/2026 | Pasos 2 y 3: `PrescriptionStatusPort`, `DetectUpcomingPrescriptionsUseCase` (implementa el puerto temporal `PrescriptionDetectionPort`, TV-01), sus 8 tests con fakes propios (`detection-fakes.ts`). Todavía no está cableado: nada lo invoca hasta el paso 7. | — |
| 20/10/2026 | Pasos 4 y 5: `CriminalPrescriptionQueryPort` + `CriminalPrescriptionQueryPrismaAdapter` (reusa `ACTIVE_CASE`, filtra `CRIMINAL` y al menos una calificación) y `ListActivePrescriptions` (aplica `summarizePrescription` contra la fecha recibida), 7 tests. Sin registrar en `CasesModule` todavía (paso 7). | — |
| 20/10/2026 | Paso 6: `DeadlinesPrescriptionStatusAdapter`. Paso 7: cableado en los dos módulos. **Desde acá el disparo diario manda avisos reales de prescripción** donde `DeadlinesModule` se carga. | — |
| 20/10/2026 | Suite de integración de referencia (antes del paso 7): 3 suites de `cases` fallan (35 tests) porque `daily-run.int.spec.ts` deja filas en `sent_notifications` y `case-timeline`, `get-case`, `custom-states` y `procedural-act-scenario.ts` borran `cases` sin borrarlas antes (FK `sent_notifications_case_id_fkey`). Depende del orden de las suites. No es de la detección; Matusan30 se lo pasó a mmachuca (TV-02). | — |
| 20/10/2026 | Suite de integración después del paso 7: 18/18 suites, 428/428 tests (los 35 de la referencia pasaron por orden de suites, no porque TV-02 esté resuelto). | — |
| 20/10/2026 | Paso 8: `detect-upcoming-prescriptions.int.spec.ts`, 11/11 en verde. **HU52 completa** salvo lo marcado como sin verificar abajo (52.1 "todos los días", 52.8 cambio de meses). | — |

| 20/10/2026 | Rebase de `feature/deadline` sobre `origin/develop` (25 commits: documentos y Drive, tablero del administrador, datos por fuero y acto lesivo). Sin conflictos que resolver a mano. Después del rebase: `tsc` 0 errores, 98 suites / 1188 tests unitarios en verde. | — |
| 20/10/2026 | Integración después del rebase: 27/28 suites, 567/568 tests. Falla `case-folder-contract.int.spec.ts` › "responde 200 para el perfil ADMINISTRATOR (CA-39.6)": espera `CREATED` y recibe `CREATING`. Solo pasa 17/17 dos veces seguidas: es de tiempos bajo carga (espera asíncrona de la carpeta, `CASE_FOLDER_WAIT_MS`), del módulo de documentos, no de la detección (TV-03). Los dos specs de `deadlines` pasan. | — |
| 20/10/2026 | HU51, fase A, pasos A1 a A4: `deadlineNoticeKind`, `OpenDeadlinesPort`, `DEADLINE_WARNING_BUSINESS_DAYS` y `DetectUpcomingDeadlinesUseCase`, 14 tests. Sin cablear todavía. | — |
| 20/10/2026 | HU51, fase A, pasos A5 a A7: `OpenDeadlineQueryPort` + adaptador Prisma, `ListOpenDeadlines` y `DeadlinesOpenDeadlinesAdapter`, 6 tests. Sin registrar en `CasesModule` todavía (A8). | — |
| 20/10/2026 | HU51, fase A, paso A8: cableado. **Desde acá el disparo diario manda también avisos reales de vencimiento** (preaviso y "vence hoy") donde `DeadlinesModule` se carga. | — |
| 20/10/2026 | HU51, fase A, paso A9: `detect-upcoming-deadlines.int.spec.ts`, 10/10 en verde. **Fase A terminada.** | — |
| 20/10/2026 | HU51, fase B, paso B6: la detección suma el vencimiento del acto lesivo. Unitarios: 102 suites / 1214 tests. Integración del spec de HU51: 16/16. **CA-51.5 cubierto.** | — |
| 20/10/2026 | Integración completa después de B6, corrida en primer plano: 28/29 suites, 583/584 tests. Falla de nuevo `case-folder-contract.int.spec.ts`, ahora en otro test ("CREATED: tiene exactamente las cinco claves…"), con el mismo `CREATING` en vez de `CREATED`; solo pasa 17/17 (TV-03). Dos corridas en segundo plano se habían cortado a mitad de camino sin ningún test fallado (TV-04). | — |
### Estado de los criterios — HU51 (fase A: actos procesales)

| CA | Estado | Dónde |
| --- | --- | --- |
| 51.1 Todos los días a una hora fija, sin que nadie lo active | **Sin verificar:** depende del disparo de GitHub Actions, comentado hasta que haya despliegue (QV-02) | — |
| 51.2 Plazos de presentación de las causas activas y de los amparos | **Integración (A9, B6):** actos procesales de penal y administrativo, y el acto lesivo de los amparos | A5, A9, B6 |
| 51.3 Detecta por vencer, vence hoy y vencidos | **Unitario (A1, A4) e integración (A9)** | A1, A4, A9 |
| 51.4 Lunes a viernes; respeta el ajuste manual | **Unitario (A6) e integración (A9):** calculado, atrasado y adelantado a mano | A5, A6, A9 |
| 51.5 Amparos: solo en "Iniciada", con la renovación vigente | **Unitario e integración (B6):** con el primer acto deja de revisarse; la renovación cuenta desde la vigente y se vuelve a avisar con la fecha nueva | B6 |
| 51.6 No revisa archivadas, prescriptas ni dadas de baja | **Integración (A9)** | A5, A9 |
| 51.7 No cambia nada de la causa | **Por construcción (A4) e integración (A9):** causa y acto iguales después del disparo | A4, A9 |
| 51.8 Dos corridas el mismo día no duplican | **Integración (A9):** dos corridas el mismo día y tres días de la ventana, un solo preaviso | A9 |
| 51.9 Coincide con la causa y los tableros | **Integración (A9, B6)** contra `GET /cases/{id}` (`currentState` y `harmfulActDeadline`) y el tablero del abogado para actos procesales. **Pendiente:** los tableros todavía no listan el acto lesivo (B5) y el orden de `GET /cases` no lo considera (B4) | A9, B4, B5, B6 |

### Estado de los criterios — HU52

| CA | Estado | Dónde |
| --- | --- | --- |
| 52.1 Todos los días, penales activas con calificación | **Integración (paso 8)** para "penales activas con calificación". "Todos los días" depende del disparo de GitHub Actions, comentado hasta que haya despliegue (QV-02): **sin verificar** | Pasos 4 y 8 |
| 52.2 Detecta 70 % y plazo cumplido | **Unitario (pasos 1 y 3) e integración (paso 8)**, incluido el borde "vence hoy" | Pasos 1, 3 y 8 |
| 52.3 Calificación que prescribe primero, desde el último acto interruptivo | **Unitario (paso 5) e integración (paso 8)** | Pasos 5 y 8 |
| 52.4 Excluye administrativas, amparos, sin calificación, archivadas, prescriptas, dadas de baja | **Integración (paso 8)**, más los casos que sí entran: estado escrito a mano y calificación dada de baja | Pasos 4 y 8 |
| 52.5 Nunca cambia el estado | **Por construcción (paso 3) e integración (paso 8):** después del disparo diario, la causa con el plazo cumplido queda igual campo por campo | Pasos 3 y 8 |
| 52.6 Se vuelve a detectar tras un acto interruptivo | **Unitario (paso 5) e integración (paso 8):** el acto registrado por la API saca de alerta, y una causa cumplida que se reinicia vuelve a avisarse con la fecha nueva | Pasos 5 y 8 |
| 52.7 Registra para no avisar dos veces | **Integración (paso 8):** dos corridas el mismo día, un solo aviso por destinatario. El registro es del digest (mmachuca) | Paso 8 |
| 52.8 Cambios de plazo o actos interruptivos se ven al día siguiente | **Acto interruptivo: integración (paso 8). Cambio de meses de una calificación: sin test** — se cumple porque nada se guarda calculado (D-08), pero no hay `PATCH /legal-qualifications` implementado para probarlo por la API. Revisión manual | Pasos 5 y 8 |
