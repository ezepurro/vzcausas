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
| T1.2 | S3 | `cases`: filtro `unassigned` y `orphanedAt` en las respuestas | inline | Hecho (unitarios e integración en verde, 17/11/2026) |
| T1.3 | S4 | `cases`: autorización de actos para el administrador en una huérfana | inline | Hecho (en verde, 17/11/2026). Modificar y anular actos (HU28/HU29) usan la misma regla pero no tienen test propio |
| T1.4 | S5 | `deadlines`: avisos solo a la casilla (ajusta el contrato con HU51/52) | inline | Hecho (`daily-run` en verde, 17/11/2026). El código lo dejó T1.1 |
| T1.5 | S6 | `documents`: carpeta `Sin asignar` (migraciones `cloud_folder_unassigned_kinds` y `cloud_folders_unassigned_constraints`) | inline | Hecho (migraciones aplicadas; unitarios e integración en verde, 18/11/2026). Falta el test de punta a punta con la baja real: va en T1.9 |
| T1.6 | S1, S7 | `people`: caso de uso de baja con reparto atómico (`DeactivateLawyerUseCase`, `CaseReassignmentPlan`); `cases`: `ReassignLawyerCases`, `AnnounceReassignedCaseFolders`, `Case.reassignTo` | inline | Hecho (unitarios en verde, 19/11/2026) |
| T1.7 | S7 | `identity`: `UnlinkLawyerUserUseCase` y `User.loseLawyerProfile` (D-133); el puerto `LawyerUserPort` es de `people` | inline | Hecho (unitarios en verde, 19/11/2026) |
| T1.8 | S7 | `DELETE /lawyers/{lawyerId}`: DTO, controller, módulos con `forwardRef` entre `people` e `identity` | inline | Hecho (la app levanta con el `forwardRef` entre `people` e `identity`; integración en verde, 19/11/2026) |
| T1.9 | S1 a S7 | Tests de integración de HU-15 (`deactivate-lawyer.int.spec.ts`; ruta nueva en el smoke de 401) | inline | Hecho (`deactivate-lawyer` y smoke en verde, 19/11/2026). La atomicidad con falla real no tiene test de integración (ver el archivo) |
| T1.10 | S1 | Carpeta del propio abogado a `Papelera` (D-132): `RecycleLawyerFolder` y `LawyerDeactivatedListener` en `documents`; el evento lleva `keepsHistory`, que `people` pide a `cases` (`countCasesInForceOf`) | inline | Hecho (unitarios y `deactivate-lawyer-folders` en verde, 19/11/2026). Las filas de `cloud_folders` del abogado no se tocan (decisión A) |
| T2.1 | S8, S9 | `reporting`: cálculo a una fecha de corte con `unassigned` | delegada (respaldo de contexto) | Código y unitarios en verde (19/11/2026); integración **sin correr** |
| T2.2 | S10 | `reporting`: guardar y leer la foto | delegada | Código y unitarios en verde; integración **sin correr** |
| T2.3 | S8 | `GET /reports/monthly` | delegada | Código y unitarios en verde; integración **sin correr** |
| T2.4 | S8 | `GET /reports/monthly/file` (PDF) | delegada | Código y unitarios en verde; el PDF usa Helvetica y Courier (sin Figtree ni Roboto Mono); integración **sin correr** |
| T2.5 | S9 | Proceso diario: "Cerrar el mes" (verificar si existe) | delegada + inline | Hecho (unitarios en verde, 19/11/2026): `deadlines` declara `MONTHLY_REPORT_CLOSER`, `reporting` lo implementa (`DeadlinesMonthlyReportCloserAdapter`) y el proceso diario lo llama al final, aparte; integración **sin correr** |
| T2.6 | S8 | Configuración `availableFrom` | delegada | Hecho: variable `MONTHLY_REPORT_AVAILABLE_FROM`, opcional; **falta definirla** en los `.env` (tuyo) |
| T2.7 | S8, S9 | Tests de HU-43 | delegada | Unitarios en verde (129 de `reporting`); `monthly-report.int.spec.ts` escrito, **sin correr** |

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
- T1.1 tocó `deadlines`: puertos, `UpcomingDeadlineNotice` y una línea del digest
  (`groupByResponsibleLawyer` salta el `null`). T1.4 verificó el resto: las consultas
  reales de `cases` (`prisma-open-deadline-query.adapter.ts`,
  `criminal-prescription-query-prisma.adapter.ts`) no filtran por abogado, así que
  entregan las huérfanas con `responsibleLawyerId: null`. **Falta avisar al compañero de
  HU51/52** que `responsibleLawyerId` pasa a `number | null` en los dos avisos
  (`.claude/rules/notificaciones.md` ya lo dice).
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
- **L11 (19/11/2026).** Decisiones del equipo sobre HU-43 (respuestas a las preguntas del escritor):
  (3) "Dejemos lo implementado": pedir un mes cerrado sin foto lo calcula y lo guarda en el momento.
  (4) PDF: "como prefieras pero que se vea bonito": se deja Helvetica y Courier con guion largo en lugar
  del signo menos, que se ve casi igual; las fuentes Figtree y Roboto Mono piden `fontkit` y archivos de
  fuente, una dependencia nueva que se suma aparte. (5) "Que cuente como sin asignar": una causa activa
  cuyo abogado ya no está vigente cuenta en `unassigned`, queda fuera del promedio, el mínimo y el máximo
  y figura en las alertas sin nombre (`ReportCase.countedUnder`); así `lawyers` + `unassigned` siempre
  suman `activeCases`. (1) Cerrar el mes se enchufa al proceso diario existente, por un puerto de `deadlines`
  y un adaptador de `reporting`, al final y con su propio `try/catch`. (2) `MONTHLY_REPORT_AVAILABLE_FROM=2026-11`
  también en desarrollo.
- **L10 (19/11/2026).** Verificación independiente de HU-15 (S1 a S7, sobre el árbol al cierre de
  T1.10): todas cumplidas, sin bloqueos; ningún `core` importa de otro subsistema; toda escritura de
  la baja pasa por `prisma.db` (misma transacción). Se corrigieron dos observaciones: el 404 se
  resuelve antes que el cuerpo (el DTO ya no valida la lista) y una entrada del reparto con un campo
  que el contrato no define se rechaza. **Quedan como observaciones sin tratar:** (1) la transacción
  usa el tiempo límite por defecto de Prisma (5 s) y la baja hace una escritura por causa en serie,
  así que un abogado con muchísimas causas activas podría pasarse (deshace todo, 500); no se midió;
  (2) un abogado de destino dado de baja justo durante la operación no se detecta (misma clase que
  la carrera documentada); (3) `saveModification` no tiene control de versión (previo); (4) el
  mensaje del 403 es el del guard, no el del ejemplo del contrato (previo); (5) no hay test de
  integración de modificar o anular un acto de una huérfana (HU28, HU29).
- **L9 (19/11/2026).** `case-folder.int.spec.ts` es intermitente por tiempos, **previo a esta rama**:
  su `WAIT_MS` es 300 ms y, con la máquina cargada, el alta responde `CREATING` en el test que
  justo toque (en una corrida fallaron "sin la estructura configurada"; en otra, "reintenta una
  carpeta en ERROR" y "perfil LAWYER"). Pasa solo cuando se corre de nuevo. No se corrigió: es un
  archivo ajeno a HU-15 y un arreglo parcial no cierra la clase de problema (subir `WAIT_MS` o
  esperar `CREATED` en todos sus tests lo decide el equipo).
- **L8 (17/11/2026).** T1.2 y T1.3 en verde. Una corrida de integración dio 65 fallos con
  500 porque el cliente de Prisma del contenedor no tenía `orphanedAt` (la entidad rechaza
  `orphanedAt` indefinido con responsable nulo); se arregló con `npm run prisma:generate` y
  reiniciando el backend. Si pasa de nuevo tras recrear contenedores, es lo primero a mirar.
  Un test de T1.1 (`case-orphan.spec.ts`) fijaba que el administrador-abogado no operaba una
  huérfana; contradecía D-143 y se corrigió.
- **L6 (17/11/2026).** Tras la migración, el compilador marca 16 errores propios.
  La base se reseteó con `make nuke-v` porque la local tenía datos de Sprint 3 que
  chocaban con la migración `…client_document_address_lawyer_optional_registration`.

## Cosas abiertas pero a propósito

Lo que **se dejó sin resolver sabiéndolo**, con su motivo, para que nadie lo "arregle" por error ni lo
dé por un olvido. No es lo mismo que *Pendientes abiertos* (arriba): esos esperan una confirmación o
una decisión; estos ya se decidieron dejar así, y cada uno dice qué lo cerraría.

### Previo a esta rama (no lo causó HU-15 ni HU-43)

- **`details` de los `404`.** `LAWYER_NOT_FOUND` y `USER_NOT_FOUND` responden `details: { lawyerId }` o
  `{ userId }` y el contrato dice `null`. Es común a `GET` y `PATCH` de abogados; los tests de esos
  endpoints lo esquivan con `toMatchObject`. Se mira solo el código y el mensaje. *Lo cerraría:* un
  cambio único de `LawyerNotFoundError` y de `UserNotFoundError`, con sus tests.
- **Mensaje del `403`.** El guard responde "No tiene permisos para realizar esta operación." y el
  contrato muestra "Se requiere el rol ADMINISTRATOR…". Común a todas las rutas con permiso.
- **`case-folder.int.spec.ts` es intermitente por tiempos.** Su espera es de 300 ms (`WAIT_MS`) y con la
  máquina cargada el alta responde `CREATING` en el test que justo toque (L9). Pasa corriéndolo de nuevo.
  *Lo cerraría:* subir `WAIT_MS` o esperar `CREATED` en todos sus tests; lo decide el equipo.
- **`saveModification` sin control de versión.** Una modificación simultánea de la misma causa puede
  pisar a la otra. Ventana angosta.

### De HU-15 (baja de abogado, causas huérfanas)

- **Carreras de la baja.** Una causa asignada al abogado en el mismo instante del commit, o un abogado
  de destino dado de baja durante la operación, no se detectan. Cerrarlo pide un bloqueo entre
  subsistemas. Lo que sí se detecta (una causa asignada entre la lectura y la escritura) deshace todo.
- **Tiempo límite de la transacción.** La baja escribe una causa por vez, dentro de la transacción de
  Prisma con su límite por defecto (5 s). Con muchísimas causas activas podría pasarse: deshace todo y
  responde 500. No se midió. *Lo cerraría:* medirlo, y subir el límite o procesar por lotes.
- **Sin test de integración que fuerce una falla a mitad de la baja.** La atomicidad está cubierta con
  dobles (`deactivate-lawyer.use-case.spec.ts`) y por la transacción compartida de la base.
- **Sin test de integración de modificar o anular un acto de una huérfana (HU28, HU29).** Los cubre la
  regla del dominio (`Case.assertCanRegisterActs`), que los dos usan.
- **Las filas de `cloud_folders` del abogado dado de baja no se tocan** cuando su carpeta va a
  `Papelera` (decisión A): `Papelera` no tiene fila y la del abogado queda como registro. Nadie la lee.
- **No se devuelven a su lugar las carpetas de otros abogados** que alguien arrastró a mano a la carpeta
  del abogado dado de baja (D-132). Depende del proceso diario de `documents`, que no existe.
- **D-83, el acceso de Drive del usuario, queda fuera.** No existe ni al cambiar roles hoy; la baja no
  puede depender de algo que no está.
- **Errores internos sin código en el contrato.** `CASE_CANNOT_BE_ORPHANED` y
  `CASE_CANNOT_BE_REASSIGNED` son guardas de la entidad: el caso de uso solo le ofrece causas
  vigentes, así que no se alcanzan por la API.
- **El tablero del administrador no cuenta las huérfanas** hasta cerrar C-49
  (`lawyer-dashboard-prisma.query.ts` las filtra).

### De HU-43 (reporte mensual)

- **Un mes cerrado sin foto se calcula y se guarda en el momento**, con los responsables de hoy: el
  sistema no guarda el historial de responsables. Por eso la foto se saca en la primera corrida del mes.
  *Lo cerraría:* guardar ese historial, o mostrar esos meses como "Sin datos".
- **Causa reabierta al corregir un acto (D-99).** En el mes de la reapertura, "inicio + ingresadas −
  archivadas = cierre" queda corrido en 1. Cada cifra es verdadera para su fecha.
- **PDF con Helvetica y Courier**, y guion largo en lugar del signo menos. El prototipo
  (`docs/prototypes/reporte-mensual-pdf.html`) usa Figtree y Roboto Mono; el contrato permite
  reemplazarlas. Se decidió el 19/11/2026 dejarlo así por ahora. *Lo cerraría:* sumar
  `@pdf-lib/fontkit` (1.1.1) y los archivos Figtree (Regular, SemiBold, Bold) y Roboto Mono (Regular,
  Medium), de licencia OFL, y cambiar la carga de las cuatro fuentes en
  `pdf-lib-monthly-report.renderer.ts` (líneas 87-90), con caída a Helvetica si falta un archivo.
- **El prototipo del PDF y el frontend no conocen `unassigned`** (D-145, posterior al prototipo del
  13/11): falta la fila "Sin asignar" en la carga por abogado y las alertas sin nombre. Es de frontend y
  del OpenAPI; el PDF del backend ya las tiene.
- **`MONTHLY_REPORT_AVAILABLE_FROM` es opcional.** Sin ella solo existe el reporte del mes en curso. En
  desarrollo vale `2026-11`. *Lo cerraría:* hacerla obligatoria en `env.validation.ts` y en el entorno
  de tests cuando haya un valor definitivo.
