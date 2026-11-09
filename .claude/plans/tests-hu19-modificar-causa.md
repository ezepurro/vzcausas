# Plan de tests — HU19 Modificar causa

`PATCH /api/v1/cases/{caseId}` · contrato `docs/Api-Contract/API_CONTRACT_V5.md:4203`
· decisiones D-95, D-96, D-97, D-104 y D-105 (`docs/Api-Contract/DECISIONES.md:28-38`)
· auditoría `docs/Backend-Architecture/AUDITORIA_Y_TRAZABILIDAD.md` §3 y §4.

**Este documento se escribió desde los criterios de aceptación y el contrato, antes del
código.** Los tests de integración se escriben leyendo este documento, no la
implementación. Si un test falla contra el código, el código está mal (o el contrato),
no el test.

## Datos fijos

- Reloj fijo: hoy es **06/10/2026**, ahora **06/10/2026 12:30 en Córdoba**
  (`2026-10-06T15:30:00Z`, `test/shared/harness/fixed-clock.ts:11`).
- Causa penal de referencia: la del escenario de actos procesales
  (`setUpProceduralActScenario`), responsable Ríos, Malena, en "Iniciada", sin SAC.
- Una causa vigente con SAC **`13284571`**, para el conflicto.
- Una causa **dada de baja** con SAC **`20000001`**, para comprobar que su SAC se libera.

## Respuestas que el contrato fija (textuales)

| Situación | HTTP | `code` | `message` | `details` |
|---|---|---|---|---|
| Éxito | 200 | — | — | `{ data: <causa> }`, misma forma que `GET /cases/{caseId}` |
| Sin token | 401 | `UNAUTHENTICATED` | "La autenticación es requerida." | `null` |
| `caseId` no entero | 400 | `INVALID_PATH_PARAMETER` | "El identificador de la causa no es válido." | `{ caseId: "Debe ser un número entero válido." }` |
| Inexistente o dada de baja | 404 | `CASE_NOT_FOUND` | "No se encontró la causa solicitada." | `null` |
| SAC de otra causa vigente | 409 | `CASE_SAC_ALREADY_EXISTS` | "Ya existe una causa registrada con ese número de SAC." | `null` |
| "Prescripta" + `legalQualifications` | 422 | `CASE_IN_TERMINAL_STATE` | "La causa se encuentra en un estado terminal y no admite esta operación." | `null` |
| Datos inválidos | 400 | `VALIDATION_ERROR` | "Los datos enviados no son válidos." | por campo, ver abajo |

`details` de `VALIDATION_ERROR`:

| Campo | Falla | Texto |
|---|---|---|
| `jurisdiction` | enviado | "El fuero de una causa no se puede modificar." *(del contrato)* |
| `startDate` | queda con fecha y sin SAC | "Sin número de SAC la causa no tiene fecha de inicio." *(del contrato)* |
| `startDate` | queda con SAC y sin fecha | "Es obligatoria cuando se informa el número de SAC." *(el del alta)* |
| `startDate` | posterior a hoy | "No puede ser posterior a la fecha de hoy." *(el del alta)* |
| `sacNumber` | no son 8 dígitos | "Debe contener exactamente 8 dígitos." *(el del alta)* |
| `caption` | vacía, espacios o `null` | "Es obligatoria." *(el del alta)* |
| `legalQualifications` | en un fuero no penal | "Solo corresponden al fuero penal." *(el del alta)* |
| `clientDetained` | fuera del penal | "Solo corresponde al fuero penal." *(el del alta)* |
| `harmfulAct*`, `injunctionGranted` | fuera del amparo | "Solo corresponde al fuero de amparo." *(el del alta)* |
| `harmfulActDate` | posterior a hoy | "No puede ser posterior a la fecha de hoy." *(el del alta)* |
| `clientId` | cliente no vigente | "No existe un cliente vigente con ese identificador." *(el del alta)* |
| `responsibleLawyerId` | abogado no vigente | "No existe un abogado vigente con ese identificador." *(el del alta)* |
| campo no anulable en `null` | p. ej. `courtFeePaid: null` | "No puede quedar vacío." *(texto propio)* |
| `body` | ningún campo | "Debe enviarse al menos un campo para modificar." *(el de HU14 e `identity`)* |
| `folder`, `active`, otros | enviado | "No es un campo admitido." *(el del pipe global)* |

Los errores de datos se informan **todos juntos**.

**Orden de los chequeos:** 401 → 400 de forma (pipe: tipos, `jurisdiction`, campos no
admitidos) → 400 de `caseId` → 404 → 422 → 400 de contenido → 409. Un pedido rechazado
**no escribe nada**: ni la causa, ni sus calificaciones, ni la auditoría.

## Efectos de un `200`

- La causa queda con los valores nuevos. Un campo omitido no cambia. Un anulable en
  `null` queda vacío (CA-19.1).
- **Cliente nuevo:** `clientId` cambia, y la carátula queda la enviada o la anterior.
  El backend no la recalcula (CA-19.7).
- **Responsable nuevo:** desde la próxima petición registra él los actos, y el anterior
  recibe 403. Los actos ya registrados conservan su `registeredBy` (CA-19.8).
- **Calificaciones:** reemplazan la lista entera, y `[]` la vacía. La prescripción que
  devuelve la causa cambia (CA-19.11).
- **Acto lesivo:** `harmfulActDeadline` se recalcula, y `harmfulActDate: null` lo borra
  con todos sus datos (CA-19.12).
- En `audit_log`, **una** fila:
  - `action`: `case.updated`;
  - `entity_type`: `Case`;
  - `entity_id`: el id de la causa;
  - `actor_user_id`: quien modificó;
  - `occurred_at`: `2026-10-06T15:30:00Z`;
  - `metadata`: `{ changedFields: [...] }`, **solo los nombres** de los campos, nunca
    los valores;
  - `correlation_id`: el de la petición (CA-19.15).
- Si cambió la carátula o el responsable **y** la carpeta está `CREATED`: se publica
  `cases.case-modified.v1` después de guardar. Sin carpeta no se publica nada (CA-19.9).

## Mapa de criterios

| CA | Cubierto por |
|---|---|
| 19.1 Éxito; omisión vs `null` | UNIT entidad · INT D1.1 |
| 19.2 Sin campos | UNIT entidad · INT D2.2 |
| 19.3 `jurisdiction` y no modificables | INT D2.2 (pipe y DTO) |
| 19.4 Dato de otro fuero | UNIT entidad (las tres subclases) · INT D2.1 |
| 19.5 SAC único entre vigentes y formato | UNIT entidad y caso de uso · INT D3.1, D3.2 |
| 19.6 SAC ↔ fecha de inicio | UNIT entidad · INT D2.1 |
| 19.7 Cliente nuevo, carátula no recalculada | UNIT entidad · INT D4.1 |
| 19.8 Responsable nuevo | INT D4.2 (el nuevo registra un acto: 201; el anterior: 403; el acto previo conserva su `registeredBy`) |
| 19.9 La carpeta sigue a la causa | UNIT caso de uso (`UpdateCase`): se publica solo con carpeta `CREATED` y si cambió carátula o responsable · UNIT `SyncCaseFolder` (renombra, mueve creando las carpetas del abogado, las dos a la vez en una llamada, reutiliza carpetas, idempotente, sin carpeta no hace nada) · UNIT `CaseModifiedListener`, `CaseFolder` y los adaptadores (`relocateFolder` de Drive y de memoria) · INT F1, F2 (`case-folder.int.spec.ts`) |
| 19.10 Drive no hace fallar | UNIT `SyncCaseFolder` (falla de Drive: la fila queda como estaba; el reintento completa) · UNIT `CaseModifiedListener` (no propaga el error) · INT F3 (`PATCH` responde 200, la causa se guarda y la carpeta conserva su nombre) |
| 19.11 Calificaciones, reemplazo total | UNIT `CriminalCase` · INT D4.3 |
| 19.12 Acto lesivo | UNIT `Amparo` · INT D5.1 |
| 19.13 Terminal sí; "Prescripta" + calificaciones 422 | UNIT `CriminalCase` · INT D5.2 |
| 19.14 404 y 400 de id | UNIT caso de uso · INT D3.3 |
| 19.15 Auditoría | UNIT caso de uso (misma transacción) · INT D1.2 |

## Tests de integración (`test/subsystems/cases/update-case.int.spec.ts`)

HU19 es grande: se usa el margen flexible del límite (5 `describe`, hasta 3 `it`, con
`it.each` para las variantes).

| `describe` | `it` |
|---|---|
| D1 Modificación exitosa | 1.1 la forma de `GET` y la relectura; omisión vs `null` · 1.2 la fila de auditoría |
| D2 Datos inválidos | 2.1 `it.each` (SAC/fecha, carátula, dato de otro fuero, `null` en no anulable) con `details` exacto y base sin cambios · 2.2 sin campos, `jurisdiction` y `active` |
| D3 SAC y existencia | 3.1 SAC de otra vigente: 409 · 3.2 el de una dada de baja se acepta · 3.3 inexistente o dada de baja: 404; id no entero: 400 |
| D4 Cliente, responsable y calificaciones | 4.1 cliente nuevo y carátula · 4.2 responsable nuevo · 4.3 reemplazo de calificaciones |
| D5 Amparo y estados terminales | 5.1 acto lesivo, recalculado y borrado · 5.2 "Archivada" se corrige; "Prescripta" + calificaciones: 422 |

Cada error verifica que **no** se escribió nada.

### La carpeta sigue a la causa (CA-19.9, CA-19.10, D-104)

Van en `test/subsystems/cases/case-folder.int.spec.ts`, que ya tiene el almacenamiento en
memoria y registra causas con carpeta (una suite por recurso o flujo). Un `describe` con 3
`it`. `documents` actúa por un suscriptor asíncrono: se espera a ver la fila de
`cloud_folders` en la base, sin pausas fijas.

| `it` | Qué prueba |
|---|---|
| F1 | Cambiar la carátula renombra la carpeta (nombre limpio con las reglas de nombre), conserva su id y su padre, y `folder.path` del detalle informa el nombre nuevo |
| F2 | Cambiar el responsable mueve la carpeta bajo el abogado nuevo, crea sus carpetas, conserva el id y el nombre, y no duplica la carpeta de la causa; `folder.path` informa la ubicación nueva |
| F3 | Si Drive falla, `PATCH` responde 200, la causa se guarda y la carpeta queda con su nombre anterior; `folder.path` dice dónde está realmente |

**No cubierto en integración:** la pila HTTP falsa de Google (`fake-google.ts`) no entiende
`PATCH /files/{id}`, así que la llamada real de `relocateFolder` (`addParents` y
`removeParents`) solo está probada con el cliente de Drive falso del unitario del adaptador.

## Desvíos conocidos

Ninguno de entrada. Si aparece alguno, se nombra acá y el test no lo fija.
