# Plan de tests — Cambios de responsable en la línea de vida (HU27, D-147)

`GET /api/v1/cases/{caseId}/timeline`, apartado "Cambio de responsable en la línea de vida"
(`API_CONTRACT_V6.md:5442`), más lo que escribe `PATCH /cases/{caseId}` y la baja de un
abogado (`DELETE /lawyers/{lawyerId}`). Decisión D-147 (`DECISIONES.md:80`). Tareas T1.1 a
T1.4 de `docs/Backend-Architecture/IMPLEMENTACION_HISTORIAL_RESPONSABLE.md`.

**Escrito desde el contrato, antes del código.** Si un test de este plan falla contra el
código, el código está mal (o el contrato), no el test.

## Datos fijos

- Reloj fijo de integración: `withFixedClock` (`test/shared/harness/fixed-clock.ts`).
- Abogados: **Ríos** (id 3 en el ejemplo del contrato), **Gaga** (id 4). Usuario que hace
  el cambio: un `ADMINISTRATOR` ("Vázquez, Fernando G.") en la baja; quien modifica en el `PATCH`.
- Huso del estudio: `America/Argentina/Cordoba` (`-03:00`). Un `changedAt` de
  `2026-11-19T01:30:00Z` es el 18/11 en Córdoba: su `date` es `2026-11-18`.

## Respuesta que el contrato fija (textual)

Entrada de la línea de vida (`:5457`):

```json
{
	"type": "RESPONSIBLE_LAWYER_CHANGE",
	"date": "2026-11-19",
	"responsibleLawyerChange": {
		"id": 7,
		"caseId": 1,
		"kind": "REASSIGNED",
		"previousLawyer": { "id": 3, "lastName": "Ríos", "firstName": "Malena" },
		"newLawyer": { "id": 4, "lastName": "Gaga", "firstName": "Pablo" },
		"origin": "LAWYER_REMOVAL",
		"changedBy": { "id": 1, "lastName": "Vázquez", "firstName": "Fernando G." },
		"changedAt": "2026-11-19T10:15:00-03:00"
	}
}
```

Claves de `responsibleLawyerChange`, en este orden: `id`, `caseId`, `kind`, `previousLawyer`,
`newLawyer`, `origin`, `changedBy`, `changedAt` (8). Claves de la entrada: `type`, `date`,
`responsibleLawyerChange` (3).

| Situación | `kind` | `previousLawyer` | `newLawyer` |
|---|---|---|---|
| Pasó de un abogado a otro | `REASSIGNED` | objeto | objeto |
| Quedó sin abogado (D-143) | `ORPHANED` | objeto | `null` |
| Una huérfana recibió abogado | `ASSIGNED_FROM_ORPHAN` | `null` | objeto |

`origin`: `LAWYER_REMOVAL` (la baja) o `MANUAL` (`PATCH /cases/{caseId}`). Errores de la
ruta sin cambios: 400 `INVALID_PATH_PARAMETER`, 401 `UNAUTHENTICATED`, 404 `CASE_NOT_FOUND`
("No se encontró la causa solicitada.").

## CA → test

| # | Criterio (contrato, D-147) | Nivel | Dónde | Qué fija |
|---|---|---|---|---|
| 1 | `kind` lo calcula el backend a partir de los dos abogados (`:5476`) | Unitario | `case-responsible-change.entity.spec.ts` | `REASSIGNED`, `ORPHANED`, `ASSIGNED_FROM_ORPHAN` |
| 2 | Nunca los dos nulos ni iguales (CHECK `ck_case_responsible_changes_differs`) | Unitario + integración | entidad spec; `case-responsible-changes-check.int.spec.ts` | La entidad rechaza ambos; la base rechaza ambos nulos y los iguales y acepta las tres combinaciones válidas |
| 3 | `PATCH` que cambia de abogado deja un cambio, origen `MANUAL`, `changedBy` = quien modifica (`:5480`) | Unitario + integración | `update-case.use-case.spec.ts`; `update-case.int.spec.ts` | Un registro con previo, nuevo, origen y usuario correctos |
| 4 | `PATCH` con el mismo abogado, o que no toca el responsable, no deja nada (`:5498`) | Unitario + integración | ídem | Cero registros |
| 5 | `PATCH` que le da abogado a una huérfana: `ASSIGNED_FROM_ORPHAN`, `previousLawyer` nulo | Unitario + integración | ídem | `kind` y `previousLawyerId` null |
| 6 | La baja deja un cambio por causa: reasignada `REASSIGNED`, huérfana `ORPHANED`; origen `LAWYER_REMOVAL`; `changedBy` el administrador | Unitario + integración | `reassign-lawyer-cases.use-case.spec.ts`; `deactivate-lawyer.int.spec.ts` | Un registro por causa tocada; previo = abogado dado de baja |
| 7 | Se escribe en la misma transacción que el cambio (`:5446`) | Unitario | use cases | El registro se guarda dentro de `runInTransaction`; un fallo del registro no deja la modificación (atomicidad ya cubierta por la baja, `deactivate-lawyer.int.spec.ts`) |
| 8 | Registrar la causa no deja entrada (`:5499`) | Integración | `consult-cases.int.spec.ts` (línea de vida) | Una causa recién registrada tiene la línea de vida vacía de este tipo |
| 9 | Forma exacta de la entrada | Integración + unitario del mapper | `consult-cases.int.spec.ts`; `timeline-http.mapper.spec.ts` | Las 3 claves de la entrada y las 8 del recurso, `toEqual` con el JSON de arriba; `changedAt` con `-03:00` |
| 10 | `date` = fecha civil de `changedAt` en Córdoba | Unitario del mapper/adaptador + integración | mapper; adaptador vía integración | Un `changedAt` de las 01:30Z da el día anterior |
| 11 | El abogado dado de baja sigue figurando (`:5495`, RN12) | Integración | `consult-cases.int.spec.ts` | `previousLawyer` con nombre aunque `lawyers.active = false` |
| 12 | `changedBy` es el usuario (`id` del usuario, nombre de su ficha) | Integración | ídem | `changedBy.id` = id del usuario, no del abogado |
| 13 | Aparece en todos los fueros (`:5492`) | Unitario + integración | `get-case-timeline.use-case.spec.ts`; `consult-cases.int.spec.ts` | Una causa administrativa o amparo muestra la entrada |
| 14 | Orden: por `date` y, a igual fecha, primero el último registrado (`changedAt`) (`:5503`) | Unitario + integración | use case spec; `consult-cases.int.spec.ts` | Entrada mezclada con actos; dos cambios el mismo día, el último primero |
| 15 | Solo hacia adelante: lo anterior no aparece (`:5501`) | Sin test | — | No hay dato que reconstruir (S7); una causa sin filas devuelve la línea de vida de siempre (cubierto por el resto de la suite) |
| 16 | Causa inexistente o dada de baja: 404 `CASE_NOT_FOUND` | Integración | ya cubierto en la suite de la línea de vida | Sin cambios |
| 17 | Las suites que borran causas no fallan por la FK `ON DELETE RESTRICT` | Integración | helpers y specs | Se borran los cambios antes que las causas |

## Para revisión manual

- `date` por huso con datos reales cerca de medianoche: lo fija el punto 10 con un `changedAt`
  explícito, no con el reloj de la máquina.
