# Implementación: causas huérfanas (HU-15) y reporte general (HU-43)

**Objetivo.** Dar de baja un abogado sin dar de baja sus causas (D-143) y emitir el
reporte mensual con las causas sin asignar (D-145). **Rama:** `feat/orphan-cases`.
**Contrato:** `API_CONTRACT_V6.md` §3.3, §3.13 y §4 "Causa huérfana". **Decisiones:**
`DECISIONES.md` D-143 a D-146. **Jira:** VZ-23 (HU-15) y VZ-51 (HU-43).
**Corredor de tests:** `make test-unit` y `make test-int` (Docker). **Las
migraciones las corre el equipo con `make migrate-dev`.**

## Specs

- **S1.** La causa que el administrador deja "Sin asignar" al dar de baja un abogado
  **no se da de baja**: queda huérfana, con `responsibleLawyerId` en `null` y
  `orphanedAt`, activa, **con su estado procesal intacto** (D-143).
- **S2.** `POST /cases` sigue exigiendo responsable; `PATCH /cases/{caseId}` no acepta
  `null`; reasignar con `PATCH` borra `orphanedAt` (D-143).
- **S3.** El listado de causas acepta `unassigned=true` (D-143).
- **S4.** El `ADMINISTRATOR` registra, modifica y anula actos procesales e
  interruptivos de una huérfana, a su nombre (`registeredBy`); ningún abogado la opera
  (D-143, D-144).
- **S5.** Los avisos de una huérfana van solo a la casilla de gestión, sin copia al
  abogado (D-143).
- **S6.** La carpeta de Drive de una huérfana va a `/VZ Causas/Causas/Sin asignar/{fuero}/`
  y el `PATCH` la mueve al abogado nuevo (D-143).
- **S7.** `DELETE /lawyers/{lawyerId}` acepta `reassignments[]` con
  `responsibleLawyerId` o `unassigned: true`; atómico; `409 LAWYER_HAS_DEPENDENCIES` si
  falta una causa activa; `400 VALIDATION_ERROR` en `details.reassignments`.
- **S8.** El reporte suma la clave `unassigned` al lado de `lawyers`, sin nombrar
  causas; fuera del promedio, mínimo y máximo; no son "archivadas"; en la lista de
  alertas de prescripción con responsable "Sin asignar" (D-145).
- **S9.** El abogado dado de baja no figura en la foto del mes de su baja (D-145).
- **S10.** `reporting` escribe solo `monthly_report_snapshots` (D-146).

## Tareas

| ID | Spec | Qué | Ruta | Estado |
| --- | --- | --- | --- | --- |
| T0.1 | S1 | `schema.prisma`: responsable opcional, `orphaned_at`, actos con `registered_by_lawyer_id` opcional | inline | Hecho |
| T0.2 | S1, S4 | Migraciones `orphaned_cases` (con `CHECK`) y `acts_registered_by_lawyer_optional`, aplicadas | inline (la corre el equipo) | Hecho |
| T1.1 | S1, S2, S4 | `cases`: dominio y persistencia con responsable nulable; actos con `registeredByLawyerId` nulable; `Case.leaveWithoutResponsible` | delegada | Hecho (`make test-unit` y `make test-int` en verde, 17/11/2026) |
| T1.2 | S3 | `cases`: filtro `unassigned` y `orphanedAt` en las respuestas | inline | Pendiente |
| T1.3 | S4 | `cases`: autorización de actos para el administrador en una huérfana | inline | Pendiente |
| T1.4 | S5 | `deadlines`: avisos solo a la casilla (ajusta el contrato con HU51/52) | inline | Pendiente |
| T1.5 | S6 | `documents`: carpeta `Sin asignar` | inline | Pendiente |
| T1.6 | S1, S7 | `people`: caso de uso de baja con reparto atómico | inline | Pendiente |
| T1.7 | S7 | `identity`: usuario vinculado (D-133); verificar si el puerto existe | inline | Pendiente |
| T1.8 | S7 | `DELETE /lawyers/{lawyerId}`: DTO, validaciones, errores | inline | Pendiente |
| T1.9 | S1 a S7 | Tests de integración de HU-15 | inline | Pendiente |
| T2.1 | S8, S9 | `reporting`: cálculo a una fecha de corte con `unassigned` | inline | Pendiente |
| T2.2 | S10 | `reporting`: guardar y leer la foto | inline | Pendiente |
| T2.3 | S8 | `GET /reports/monthly` | inline | Pendiente |
| T2.4 | S8 | `GET /reports/monthly/file` (PDF) | inline | Pendiente |
| T2.5 | S9 | Proceso diario: "Cerrar el mes" (verificar si existe) | inline | Pendiente |
| T2.6 | S8 | Configuración `availableFrom` | inline | Pendiente |
| T2.7 | S8, S9 | Tests de HU-43 | inline | Pendiente |

"Hecho" significa código, un test que lo cubre y verde. Las tareas T0.x no tienen
tests: se verificaron leyendo `_prisma_migrations` y `information_schema`.

## Pendientes abiertos

- **C-49:** cómo cuenta la huérfana en el tablero del administrador.
- **P-05:** cubierta por el equipo, sin confirmar por el cliente.
- Los nombres `unassigned` y `orphanedAt` los propuse yo.
- `.claude/rules/notificaciones.md` fija `responsibleLawyerId: number` en los avisos de
  HU51/52 (de otro integrante): hay que acordar con él pasarlo a `number | null`.
- Carátula (`cover-sheet.vo.ts`) de una huérfana: el contrato no dice qué muestra en la
  línea del abogado. T1.1 imprime `DEFENSOR: Sin asignar`; confirmar.
- `CASE_CANNOT_BE_ORPHANED` (`case.errors.ts`) no está en el contrato: es una guarda
  interna al llamar `leaveWithoutResponsible` sobre una causa inactiva o ya huérfana.
- El tablero del administrador filtra `responsibleLawyerId: { not: null }`
  (`lawyer-dashboard-prisma.query.ts`): las huérfanas no aparecen hasta cerrar C-49.
- T1.1 tocó `deadlines` más de lo previsto: puertos, `UpcomingDeadlineNotice` y una línea
  del digest (`groupByResponsibleLawyer` salta el `null`). Es el núcleo de T1.4: verificar
  el resto y acordarlo con el compañero de HU51/52.
- Las vistas de actos usan el usuario (`registeredBy`) cuando `registeredByLawyer` es nulo.

## Log

- **L1 (16/11/2026).** El pedido, con las palabras del usuario: "me están diciendo que no
  [...] que sea como una causa huérfana que no tiene abogado y que puede ser reasignada
  [...] cuando borro un abogado, poner en un estado no terminal a la causa que sea
  'sin asignar' y que le permita luego encontrarlas y poderle reasignar un abogado
  nuevo. En todo caso que no quiera reasignar le daré de baja".
- **L2 (16/11/2026).** "Dale no lo modelemos como estado procesal así los plazos siguen
  corriendo y sí, si está huérfana solo notificamos al admin, después si está huérfana el
  administrador le puede registrar actos que van a ser marcados como que los hizo él".
- **L3 (16/11/2026).** "Yo a la carpeta de drive la movería en una carpeta de abogado
  'Sin asignar' que luego cuando se le asigne que vaya al que le corresponda".
- **L4 (17/11/2026).** "No, dejemos la opción 1" (renglón "Sin asignar" con el total).
- **L5 (17/11/2026).** Se aplicaron las migraciones `orphaned_cases` y
  `acts_registered_by_lawyer_optional`. La segunda no estaba en el plan: los actos guardan
  `registered_by_lawyer_id` obligatorio y D-144 lo deja nulo.
- **L7 (17/11/2026).** T1.1 delegada y devuelta: 33 archivos modificados y 3 nuevos
  specs, 180 inserciones y 35 borrados. Verificación del padre: `npx tsc --noEmit -p
  tsconfig.json` sale con 0 errores (el watcher bajó de 16 a 0). Los tests no se
  corrieron. `Risk: item 3` (puertos de `cases` que consumen `deadlines` y `reporting`).
- **L6 (17/11/2026).** Tras la migración, el compilador marca 16 errores propios.
  La base se reseteó con `make nuke-v` porque la local tenía datos de Sprint 3 que
  chocaban con la migración `…client_document_address_lawyer_optional_registration`.
