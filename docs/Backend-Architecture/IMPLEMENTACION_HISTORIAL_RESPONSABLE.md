# Implementación: cambios de responsable en la línea de vida (HU27, D-147)

**Objetivo.** Que el ciclo de vida de la causa (`GET /cases/{caseId}/timeline`) muestre cada vez
que cambia su abogado responsable: reasignaciones y causas que quedan huérfanas. **Solo
backend**: el frontend lo hace otro integrante, a partir del contrato. **Rama:**
`feat/case-responsible-changes`. **Contrato:** `API_CONTRACT_V6.md` §3.7, "Cambio de
responsable en la línea de vida". **Decisión:** `DECISIONES.md` D-147. **Corredor de tests:**
`make test-unit` y `make test-int` (Docker). **Las migraciones las corre el equipo.**

## Specs

- **S1.** Cada cambio de abogado responsable se guarda en `case_responsible_changes`, **en la
  misma transacción** que el cambio: con `PATCH /cases/{caseId}` (origen `MANUAL`) y con la baja
  de un abogado (`DELETE /lawyers/{lawyerId}`, origen `LAWYER_REMOVAL`), sea que la causa pase a
  otro abogado o quede huérfana (D-147).
- **S2.** **Solo cuando el responsable cambia de verdad.** Un `PATCH` que manda el mismo abogado,
  o que no toca el responsable, no deja nada. Registrar la causa tampoco (D-147).
- **S3.** `GET /cases/{caseId}/timeline` suma entradas `RESPONSIBLE_LAWYER_CHANGE`, con
  `date` = fecha civil de `changedAt` en Córdoba y `responsibleLawyerChange` = `id`, `caseId`,
  `kind`, `previousLawyer`, `newLawyer`, `origin`, `changedBy`, `changedAt`, tal como las define
  el contrato. Aparecen **en todos los fueros**.
- **S4.** `kind` lo calcula el backend: `REASSIGNED` (los dos abogados), `ORPHANED` (`newLawyer`
  nulo), `ASSIGNED_FROM_ORPHAN` (`previousLawyer` nulo). Nunca los dos nulos ni iguales (CHECK).
- **S5.** Los abogados salen **como son hoy** y el dado de baja sigue figurando (RN12): no se
  filtra por `active`. `changedBy` es el **usuario**, con `id`, `lastName` y `firstName`.
- **S6.** El orden es el del resto de la línea de vida: por `date` y, a igual fecha, primero el
  último registrado (`changedAt`). La línea de vida sigue sin paginar y mezclada en el servidor
  (D-85).
- **S7.** **Solo hacia adelante**: no se reconstruyen cambios anteriores.

## Tareas

| ID | Spec | Qué | Ruta | Estado |
| --- | --- | --- | --- | --- |
| T0.1 | S1, S4 | `schema.prisma`: `CaseResponsibleChange`, enum `ResponsibleChangeOrigin` y relaciones inversas | inline | Hecho (esquema válido) |
| T0.2 | S1, S4 | Migración `case_responsible_changes` (`--create-only`) y su `CHECK` `ck_case_responsible_changes_differs` (`previous_lawyer_id IS DISTINCT FROM new_lawyer_id`) | inline (la corre el equipo) | Hecho (`20261119214107_case_responsible_changes`, aplicada y cliente regenerado, 19/11/2026) |
| T1.1 | S1, S2, S4 | `cases`: registro del cambio (entidad o value object que decide el `kind`, puerto y adaptador Prisma) | delegada | Código y unitarios en verde (993 de `cases` y `people`, 19/11/2026); integración **sin correr** |
| T1.2 | S1, S2 | Escribirlo en `UpdateCase` y en `ReassignLawyerCases`, dentro de la transacción | delegada | Código y unitarios en verde (993 de `cases` y `people`, 19/11/2026); integración **sin correr** |
| T1.3 | S3, S5, S6 | Cuarta fuente del `GetCaseTimeline`: puerto, lectura, entrada, mapper y DTO | delegada | Código y unitarios en verde (993 de `cases` y `people`, 19/11/2026); integración **sin correr** |
| T1.4 | S1 a S7 | Tests: plan en `.claude/plans/tests-historial-responsable.md` antes del código; unitarios; integración (`update-case`, `deactivate-lawyer`, línea de vida) | delegada | Código y unitarios en verde (993 de `cases` y `people`, 19/11/2026); integración **sin correr** |
| T1.5 | S1 a S7 | `DICCIONARIO_DATOS.md`: la tabla nueva | delegada | Hecho: ER, sección "z bis" y tabla de `DICCIONARIO_DATOS.md`; el diagrama no se vio renderizado |

"Hecho" significa código, un test que lo cubre y verde.

## Fuera de alcance

- **El frontend** (`types/timeline.ts`, `CaseTimeline.tsx`, mocks y tests): lo hace otro
  integrante; el contrato es el traspaso.
- Una entrada "Causa registrada, responsable X" al crearla: no se pidió, queda fuera.
- Reconstruir los cambios anteriores: no hay de dónde.

## Log

- **L1 (19/11/2026).** El pedido, con las palabras del usuario: "necesito que ahí también se
  muestre cuando se reasigna un abogado o cuando quedó huérfana, se tiene que sumar al ciclo con
  los siguientes datos: el abogado que hizo el cambio y no sé qué más, ofréceme datos pero la
  idea sería además de mandarles los estados procesales por los cuales transitó también
  informar cuando se reasigna una causa".
- **L2 (19/11/2026).** "Quiero que hagamos la parte de backend, la parte de frontend la delego
  a un compañero".
- **L3 (19/11/2026).** Hallazgo del mapeo: ni el abogado anterior ni el nuevo se guardaban en
  ningún lado (la auditoría registra `changedFields` sin valores, `schema.prisma` de `audit_log`),
  así que hay que empezar a guardarlos. Se descartó ampliar la auditoría (solo de escritura y sin
  endpoint de consulta). Contrato y D-147 escritos antes del código.

## Cosas abiertas pero a propósito

- **No hay historial de los cambios anteriores a esta revisión** (S7). Cerrarlo no es posible:
  los datos no existen.
- **El reporte mensual sigue tomando la foto al cerrar el mes** (D-117), aunque ahora haya
  cambios de responsable guardados: usarlos para reconstruir meses viejos no se pidió y no
  cubriría lo anterior a esta revisión.
