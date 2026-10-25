---
paths:
  - "backend/src/subsystems/cases/**/*.ts"
---

<!-- HU20 y HU22, Sprint 2. Fuente: API_CONTRACT_V3.md §3.7, §4 (Autorización,
     Causa activa, Cómputo de días, Bajas). Verificado el 07/10/2026. -->

# Consultar causas (HU20) y detalle de causa (HU22)

Endpoints en alcance: **tres**, no dos. Verificado contra el índice del
contrato (§1, líneas 103-105) el 08/10/2026.

| Endpoint                   | Contrato               | Qué es                                                                        |
| -------------------------- | ---------------------- | ----------------------------------------------------------------------------- |
| `GET /cases`               | §1 L103, detalle L3280 | El listado (HU20)                                                             |
| `GET /cases/custom-states` | §1 L104, detalle L3495 | Los estados escritos a mano de las causas activas, para el filtro (CA-20.4)   |
| `GET /cases/{caseId}`      | §1 L105, detalle L3564 | El detalle (HU22)                                                             |

Los tres piden **cualquier usuario autenticado**, sin rol específico.

**Orden de declaración en Nest:** `@Get('custom-states')` va **antes** de
`@Get(':caseId')`. Si no, el parámetro captura la ruta y `custom-states`
responde `400 INVALID_PATH_PARAMETER`. La convención ya está en el repo, con
comentario: ver `identity/…/user.controller.ts` y `people/…/client.controller.ts`.

**Lo que NO existe, para que no lo inventes:** no hay `GET /jurisdictions` —
"Todos los fueros" se llena con el enum `Jurisdiction` (§2). No hay
`GET /cases/{caseId}/procedural-acts` para **listar** actos: el contrato sólo
tiene el `POST` y `deadline-preview`; listarlos es HU27, Sprint 3.

## RN11: todo el estudio ve todas las causas

No hay filtrado de causas por usuario. La diferencia entre perfiles está en lo
que pueden **operar**, no en lo que pueden **ver**.

Si se te ocurre filtrar el listado por el `lawyerId` del usuario autenticado,
está mal. El filtro por responsable existe, pero es un parámetro que el cliente
elige (`responsibleLawyerId`), no una restricción de seguridad.

## `GET /cases` — detalles que se escapan

**Orden de los resultados.** Por urgencia: primero las causas con vencimiento,
por `currentState.dueDate` ascendente (**las vencidas quedan primeras**), y
después las que no tienen vencimiento, por `id`. No es orden por `id` ni por
fecha de alta.

**Paginación.** `page` por defecto `1`, mínimo `1`. `limit` por defecto `20`,
entre `1` y `100`.

**`search`** filtra por `sacNumber`, por `caption` **y por apellido y nombres
del cliente**. Los tres campos, no solo los dos primeros. Es el mismo endpoint
que usa el buscador del encabezado de la app.

**Los tres filtros de estado son excluyentes entre sí**, porque en el
desplegable del prototipo el usuario elige una sola opción:

| Grupo del desplegable                   | Parámetro                                                      |
| --------------------------------------- | -------------------------------------------------------------- |
| "Fuero Penal / Administrativo / Amparo" | `proceduralStateId`                                            |
| "Causas nuevas" → "Iniciada"            | `withoutProceduralActs=true`                                   |
| "Escritos a mano en causas"             | `customState` (coincidencia exacta, sin distinguir mayúsculas) |

`withoutProceduralActs=true` significa `currentState.initial` en `true`, y **no
depende del fuero**: combinado con `jurisdiction` devuelve las causas de ese
fuero que siguen en el estado inicial.

**`openDeadline=true`** devuelve solo causas con `currentState.dueDate` no nulo,
**incluidas las vencidas**.

**`clientId`** filtra las causas de un cliente. Está en el contrato (L3301) y
sirve a HU9, "ver las causas de este cliente" desde la ficha del cliente. No es
un endpoint aparte: es un parámetro de este mismo listado.

**Un filtro por un abogado o un estado inexistente no es un error.** Devuelve
una colección vacía, `200`, no `404` ni `400`.

**Los dos códigos de error del listado son distintos**, y es fácil mandar el
equivocado:

| Qué falló                                                     | Código               |
| ------------------------------------------------------------- | -------------------- |
| `page` o `limit` fuera de rango                               | `INVALID_PAGINATION` |
| Dos filtros de estado combinados, o un `jurisdiction` que no existe | `INVALID_REQUEST`    |

Los dos son `400`. `INVALID_PAGINATION` no es un `INVALID_REQUEST` con otro
mensaje: son dos entradas distintas del catálogo (§5.3).

## `GET /cases/custom-states`

Devuelve los estados escritos a mano que **hoy** tienen las causas **activas**,
sin repetir y en orden alfabético. No está paginado: es una lista de textos
pelados, `{ "data": ["Con acusación, pero con oposición"] }`.

Existe porque esos textos no viven en ninguna tabla de estados: los escribió un
abogado al registrar un acto, y no se pueden deducir de una página del listado.

Dos cosas que se escapan:

- **"Iniciada" no va en esta lista.** No es un estado escrito a mano: es el
  estado inicial, y el filtro lo ofrece aparte como `withoutProceduralActs`.
- **Acá sí hace falta la definición de causa activa** (no dada de baja y estado
  no terminal). Es el único punto del sprint donde se necesita.

Parámetro opcional `jurisdiction`. Un fuero inexistente es `400 INVALID_REQUEST`
— acá sí es error, a diferencia de los filtros del listado.

## `GET /cases/{caseId}`

Devuelve **el mismo recurso que el listado**, no una forma distinta ni ampliada.
Si el listado y el detalle divergen en su forma, es un bug.

Errores: `400 INVALID_PATH_PARAMETER` si el `caseId` no es un entero válido,
`401 UNAUTHENTICATED`, `404 CASE_NOT_FOUND`.

## Causa activa, y por qué importa acá

Una causa es **activa** cuando no fue dada de baja **y** su estado procesal
actual no es terminal (ni "Archivada" ni "Prescripta").

- Un estado escrito a mano **no** es terminal: la causa que lo tiene es activa.
- Una causa en el estado inicial ("Iniciada") **también** es activa.

El campo `active` del recurso vale **siempre `true`** en las respuestas, porque
una causa dada de baja no se devuelve. No lo uses como si pudiera venir en
`false`.

## Bajas: la excepción que importa en el detalle

Para el cliente, un registro dado de baja **no existe**: no aparece en listados,
el `GET` por id responde `404`, y no hay parámetro que permita alcanzarlo.

**Pero las referencias desde una causa son la excepción.** Una causa que está en
un estado procesal dado de baja, o que registra una calificación legal dada de
baja, **las sigue mostrando en su detalle**, porque forman parte de su historia.
Lo que no se puede es elegirlas para una causa o un acto nuevos.

O sea: al armar la respuesta de una causa **no filtres por `active` las
entidades referenciadas**. Es el error más fácil de cometer acá.

## `businessDaysRemaining`

Es la cantidad de **días hábiles** entre hoy (excluido) y el vencimiento
(incluido). Vale `0` si vence hoy y es **negativo** si ya venció.

**En esta versión no se excluyen feriados ni la feria judicial.** El calendario
de días incluye sabados, domingos y feriados.

## Auditoría: fuera del Sprint 2

`AUDITORIA_Y_TRAZABILIDAD.md` exige auditar el acceso al detalle de una causa
por secreto profesional, y el puerto que describe
(`src/shared/domain/audit-trail.port.ts`) **no existe en el código**.

Decidido con mmachuca el 07/10/2026: **fuera del alcance del Sprint 2. No crees
el puerto ni llames a nada de auditoría.** Si una tarea lo necesita, nombralo
como pendiente y pará.

## Pendientes que pueden tocar estas HU

Si la tarea depende de alguno, **frená y preguntá**:

- **P-05** — no hay política de reasignación de causas cuando el abogado
  responsable se da de baja. Toda causa debe tener responsable (RN3), y eso
  choca con la baja de abogados.
