# Plan de tests — HU33 Registrar prescripción

`POST /api/v1/cases/{caseId}/prescription` · contrato `docs/Api-Contract/API_CONTRACT_V4.md:4358-4616`
· decisiones D-52, D-53, D-54, D-69, D-74 (`:7372-7374`).

**Este documento se escribió desde los criterios de aceptación y el contrato, antes del
código.** Los tests de integración se escriben leyendo este documento, no la
implementación: lo que fijan es lo que el contrato promete, no lo que el código hace.
Si un test de este plan falla contra el código, el código está mal (o el contrato), no
el test.

## Datos fijos

- Reloj fijo de integración: hoy es **06/10/2026**, ahora es **06/10/2026 12:30 en Córdoba**
  (`2026-10-06T15:30:00Z`, `test/shared/harness/fixed-clock.ts`). Un `registeredAt`
  registrado ahora sale como **`"2026-10-06T12:30:00-03:00"`**.
- Causa penal de referencia: una calificación de **96 meses** con hecho del
  **27/02/2021**. Su prescripción vence el **27/02/2029** y al 06/10/2026 lleva el
  **70 %** (`alert: true`, `expired: false`): el plazo **no** está cumplido (CA-33.10).
- Cuerpo válido:

```json
{
	"prescriptionDate": "2026-09-15",
	"resolution": "Sentencia N° 214 del Juzgado de Control N° 3",
	"grounds": "Transcurrió el plazo del art. 62 inc. 2 CP sin actos interruptivos."
}
```

## Respuestas que el contrato fija (textuales)

| Situación | HTTP | `code` | `message` | `details` |
|---|---|---|---|---|
| Éxito | 200 | — | — | `{ data: <causa> }`, misma forma que `GET /cases/{caseId}` (30 claves) |
| Sin token | 401 | `UNAUTHENTICATED` | "La autenticación es requerida." | `null` |
| Secretaría | 403 | `FORBIDDEN` | "Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación." | `null` |
| Datos inválidos | 400 | `VALIDATION_ERROR` | "Los datos enviados no son válidos." | por campo, ver abajo |
| `caseId` no entero | 400 | `INVALID_PATH_PARAMETER` | — | `{ caseId }` |
| Causa inexistente o dada de baja | 404 | `CASE_NOT_FOUND` | "No se encontró la causa solicitada." | `null` |
| No es penal | 422 | `PRESCRIPTION_NOT_APPLICABLE` | "La prescripción solo aplica a las causas del fuero penal." | `null` |
| Penal sin calificaciones | 422 | `PRESCRIPTION_NOT_APPLICABLE` | "La causa no tiene calificaciones legales: no puede prescribir." | `null` |
| Estado terminal (prescripta, archivada) | 422 | `CASE_IN_TERMINAL_STATE` | "La causa se encuentra en un estado terminal y no admite esta operación." | `null` |
| `PATCH`/`DELETE` sobre "Prescripta" | 422 | `PROCEDURAL_STATE_PROTECTED` | "El estado Prescripta es un estado del sistema y no puede modificarse ni darse de baja." | `null` |
| `POST` de otro "Prescripta" en el penal | 409 | `PROCEDURAL_STATE_ALREADY_EXISTS` | — | — |

`details` de `VALIDATION_ERROR` (`:4527-4536` y la tabla del cuerpo, `:4394-4398`):

| Campo | Falla | Texto |
|---|---|---|
| `prescriptionDate` | posterior a hoy | "No puede ser posterior a hoy." |
| `resolution` | vacía o ausente | "La resolución que declara la prescripción es obligatoria." |
| `prescriptionDate` | ausente | "La fecha de la prescripción es obligatoria." *(texto propio: el contrato no lo da)* |
| `resolution` | más de 255 | "Debe tener como máximo 255 caracteres." *(texto propio)* |
| `grounds` | más de 2000 | "Debe tener como máximo 2000 caracteres." *(texto propio)* |

Los errores de datos se informan **todos juntos** (el ejemplo del contrato trae dos
campos a la vez).

**Orden de los chequeos** (el negocio antes que los datos, como HU31): 401 → 400 de
forma → 403 → 404 → 422 fuero → 422 terminal → 422 sin calificaciones → 400 de
contenido. Un pedido rechazado **no escribe nada**.

## Efectos de un `200` (`:4405-4423`)

- `currentState`: `name` "Prescripta", `proceduralStateId` el id de ese estado,
  `custom: false`, `initial: false`, **`proceduralActId: null`**, **`dueDate: null`**,
  **`businessDaysRemaining: null`**, `manuallyAdjusted: false`.
- `prescriptionDeclaration`: `prescriptionDate`, `resolution`, `grounds` (o `null`),
  `registeredBy: { id, lastName, firstName }` del usuario que marcó, `registeredAt` con
  offset.
- `prescription` **se sigue devolviendo** (dato histórico, `:4520`).
- `active` sigue en `true`: la causa no se da de baja.
- En la base: las cinco columnas `prescription_*` cargadas, `current_state_id` el de
  "Prescripta", `current_custom_state` y `current_procedural_act_id` en `NULL`.

## Mapa de criterios

| CA | Qué fija | Cubierto por |
|---|---|---|
| 33.1 | Admin o cualquier abogado, aunque no sea el responsable | INT D1.1, D1.2 · UNIT VO `assertCanBeDeclaredBy` |
| 33.2 | La Secretaría no puede | INT D2.1 · UNIT VO, UNIT caso de uso |
| 33.3 | Fecha (no futura) y resolución obligatorias; fundamento opcional | INT D2.2, D1.2 · UNIT VO |
| 33.4 | Pasa a "Prescripta" y se cierran los plazos | INT D1.3 · UNIT agregado |
| 33.5 | Queda quién, cuándo y con qué datos | INT D1.1 (respuesta **y** base) · UNIT agregado |
| 33.6 | Sale de tableros, alertas y `activeCases` | INT D4.2 |
| 33.7 | No se borra; se consulta con su historia y se filtra por "Prescripta" | INT D4.1 |
| 33.8 | Prescripta o archivada no admite actos ni otra marca | INT D3.3, D4.3 · UNIT agregado |
| 33.9 | No penal o penal sin calificación: no | INT D3.1, D3.2 · UNIT agregado |
| 33.10 | Se puede aunque el plazo calculado no esté cumplido | INT D1.2 (`expired: false` antes de marcar) |
| 33.11 | Causa inexistente: se informa | INT D2.3 · UNIT caso de uso |
| 33.12 | No se puede deshacer | Sin endpoint de reversión (no hay nada que testear) · INT D3.3 (volver a marcar falla) |
| 33.13 | "Prescripta" listado pero protegido | INT D5 · UNIT `ProceduralState` |
| 33.14 | "Prescripta" no es destino de un acto | **Ya cubierto**: `register-procedural-act.int.spec.ts:405`, `deadline-preview.int.spec.ts:241`. No se duplica |
| 33.15 | El sistema nunca marca solo | No hay disparo automático que testear; el proceso diario solo avisa (`daily-run.int.spec.ts`) |
| 33.16 | Botón solo en penal y no para Secretaría; el pase se ve en la historia | El botón es del frontend. La historia: INT D4.1 (entrada `PRESCRIPTION_DECLARATION` en la línea de vida) |

## Integración — `test/subsystems/cases/declare-prescription.int.spec.ts`

Reloj fijo. 4 describes en este archivo + 1 en `procedural-states.int.spec.ts`.
Cada `it` verifica respuesta **y** base.

### D1 — Marca exitosa

1. **Un administrador que no es el responsable marca la causa** (CA-33.1, 33.4, 33.5).
   `200`. Las 30 claves exactas del recurso. `currentState` como en "Efectos".
   `prescriptionDeclaration` exacto, con `registeredBy` del administrador y
   `registeredAt` `"2026-10-06T12:30:00-03:00"`. `prescription` presente con
   `expiresOn: "2029-02-27"`. En la base, las cinco columnas y el estado.
2. **Un abogado que no es el responsable marca sin fundamento, con el plazo sin cumplir**
   (CA-33.1, 33.3, 33.10). Antes de marcar, el detalle trae `prescription.expired: false`.
   `200`, `prescriptionDeclaration.grounds: null`, y la columna en `NULL`.
3. **Se cierran los plazos abiertos** (CA-33.4). Una causa con un acto procesal que
   abrió un plazo (`currentState.dueDate` no nulo antes). Después: `dueDate`,
   `businessDaysRemaining` y `proceduralActId` en `null`; el acto sigue en la base.

### D2 — Quién puede y qué datos

1. **`it.each`: sin token → 401; la Secretaría → 403** (CA-33.2). Código y mensaje
   textuales. La causa sigue en su estado y las columnas en `NULL`.
2. **Fecha posterior a hoy y resolución vacía, a la vez → 400** (CA-33.3). `details`
   exacto con los dos campos y sus textos. Nada escrito.
3. **`it.each`: causa inexistente y causa dada de baja → 404 `CASE_NOT_FOUND`** (CA-33.11).
   Mensaje textual.

### D3 — Reglas de negocio (422)

1. **Un amparo → `PRESCRIPTION_NOT_APPLICABLE`** con el mensaje del fuero (CA-33.9).
   Nada escrito.
2. **Una causa penal sin calificaciones → `PRESCRIPTION_NOT_APPLICABLE`** con el mensaje
   de las calificaciones (CA-33.9). Nada escrito.
3. **`it.each`: ya prescripta, y archivada → `CASE_IN_TERMINAL_STATE`** (CA-33.8, 33.12).
   Mensaje textual. La declaración existente no cambia (la "ya prescripta" conserva su
   resolución original).

### D4 — Efectos en el resto del sistema

1. **Sigue consultable, filtrable e historiada** (CA-33.7, 33.16). Después de marcar:
   `GET /cases?proceduralStateId=<id de Prescripta>` la trae; `GET /cases/{caseId}`
   responde `200` con el mismo objeto que devolvió la marca; `GET /cases/{caseId}/timeline`
   trae una entrada `PRESCRIPTION_DECLARATION` con `date` igual a `prescriptionDate`.
2. **Sale de las alertas y de la carga de trabajo** (CA-33.6). Antes de marcar, el
   tablero del abogado responsable (`GET /dashboards/lawyer`) la tiene en
   `prescriptionAlerts` (está al 70 %); después, no. El `activeCases` del abogado en
   `GET /lawyers` baja en uno.
3. **No admite actos nuevos** (CA-33.8). `POST /cases/{caseId}/procedural-acts` y
   `POST /cases/{caseId}/interruptive-acts` del responsable → `422 CASE_IN_TERMINAL_STATE`.

### D5 — El estado "Prescripta" protegido (`procedural-states.int.spec.ts`)

1. **`PATCH` → 422 `PROCEDURAL_STATE_PROTECTED`** (CA-33.13), mensaje textual. El nombre
   y el plazo en la base no cambian.
2. **`DELETE` → 422 `PROCEDURAL_STATE_PROTECTED`** (CA-33.13). El estado sigue activo y
   aparece en `GET /procedural-states?jurisdiction=CRIMINAL`.
3. **`POST` de otro "Prescripta" en el fuero penal → 409 `PROCEDURAL_STATE_ALREADY_EXISTS`**
   (CA-33.13, D-53). No se crea otro.

**Total de integración: 15 its** (algunos con `it.each`).

## Unitarios (~70 %)

### `cases/core/domain/value-objects/prescription-declaration.vo.spec.ts`

1. Crea una declaración válida con todos sus datos.
2. Una fecha igual a hoy es válida (el límite es "posterior a hoy").
3. Fecha posterior a hoy → `prescriptionDate`: "No puede ser posterior a hoy."
4. Fecha ausente o inválida → `prescriptionDate`: "La fecha de la prescripción es obligatoria."
5. Resolución vacía, en blanco o ausente → `resolution`: texto del contrato.
6. Resolución de 256 caracteres → `resolution`: largo máximo; 255 pasa.
7. Fundamento de 2001 caracteres → `grounds`: largo máximo; 2000 pasa.
8. Fundamento en blanco o ausente queda en `null`; la resolución se recorta.
9. Varios errores juntos: todos en `details`.
10. `assertCanBeDeclaredBy`: ADMINISTRATOR y LAWYER pasan; SECRETARY → `FORBIDDEN` con
    el mensaje del contrato.

### `cases/core/domain/entities/cases.spec.ts` — `declarePrescription`

1. Una causa administrativa o un amparo → `PRESCRIPTION_NOT_APPLICABLE` (fuero).
2. Una penal sin hechos → `PRESCRIPTION_NOT_APPLICABLE` (calificaciones).
3. Una penal en estado terminal → `CASE_IN_TERMINAL_STATE`, mensaje de "esta operación".
4. Éxito: pasa al estado prescripto, sin estado escrito a mano, sin acto vigente,
   terminal, con la declaración y `updatedAt` en `now`.
5. Después de declararla no acepta actos (`assertAcceptsActs` lanza).
6. No se puede declarar dos veces.
7. El negocio va antes que los datos: una penal sin hechos con datos inválidos da 422,
   no 400.
8. El estado de destino tiene que ser el "Prescripta" del fuero de la causa: otro estado
   es un error de programación.

### `cases/core/application/use-cases/declare-prescription.use-case.spec.ts`

1. La Secretaría → 403, sin cargar la causa.
2. `it.each`: causa inexistente y dada de baja → 404.
3. Un amparo → 422 y nada guardado.
4. Éxito: guarda una vez y devuelve el detalle de la causa.
5. Si el guardado no encuentra la causa sin declarar (otra marca ganó) → 422.
6. Si falta el estado "Prescripta" del fuero → `Error` (dato roto).

### `legal-parameters/core/domain/entities/procedural-states.spec.ts`

1. `it.each`: `rename`, `changeTimeLimit`, `changeTerminal` y `deactivate` sobre
   "Prescripta" → `PROCEDURAL_STATE_PROTECTED`.
2. Un estado común se sigue pudiendo modificar.

**Total de unitarios: ~32 casos.**

## Lo que este plan no cubre (revisión manual)

- La auditoría de la marca (`AUDITORIA_Y_TRAZABILIDAD.md:45`), fuera de alcance desde el
  07/10/2026.
- El botón "Marcar prescripta" y su visibilidad por perfil y fuero (CA-33.16): frontend.
- Dos marcas simultáneas sobre la misma causa: el unitario cubre la respuesta del caso de
  uso; la carrera real contra PostgreSQL no se prueba.
