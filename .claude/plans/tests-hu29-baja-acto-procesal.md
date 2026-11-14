# Plan de tests — HU29 Dar de baja un acto procesal

`DELETE /api/v1/cases/{caseId}/procedural-acts/{actId}`.

**Fuentes:**
- contrato `docs/Api-Contract/API_CONTRACT_V6.md:6993-7134`;
- D-124 (`DECISIONES.md:36`), D-99, D-14 y D-30;
- RN12;
- columnas de la baja: `backend/prisma/schema.prisma:605-614`;
- CHECK `ck_procedural_acts_deactivation_coherent` y `ck_procedural_acts_deactivation_reason_not_blank` (`20261113211334_sprint5_manual_constraints`).

**Este documento se escribió desde los criterios de aceptación y el contrato, antes del
código.** Los tests de integración se escriben leyendo este documento, no la
implementación. Si un test falla contra el código, el código está mal (o el contrato),
no el test.

**Vocabulario:** la HU dice "dar de baja"; el contrato dice "anular". Es lo mismo. Los
textos del 403 y del 422 se copian del contrato, con "anular".

## Datos fijos

- **Reloj fijo:** ahora es el **martes 06/10/2026 12:30 en Córdoba** (`2026-10-06T15:30:00Z`).
- **La causa de referencia** es la del escenario de actos procesales (`setUpProceduralActScenario`): penal, en "Iniciada", responsable Ríos, Malena.
- **Los actos se preparan con el `POST` real**, como en HU28, así sus plazos son los del cálculo verdadero:
  - **A**: "Oposición al requerimiento de elevación" (5 días hábiles), del lunes 28/09. **Vence el lunes 05/10**: hoy ya está vencido.
  - **B**: "Archivada" (terminal), del 30/09. Es el estado actual: la causa está cerrada.
- **Amparo:**
  - acto lesivo del 01/09/2026, plazo de 30 días corridos, vence el 01/10/2026;
  - el estado "Pedido de informe" del fuero AMPARO.
- **Causa prescripta:** en el estado "Prescripta", con su declaración, y un acto previo cargado con la factory.

## Respuestas que el contrato fija (textuales)

| Situación | HTTP | `code` | `message` | `details` |
|---|---|---|---|---|
| Éxito | 204 | — | — | sin cuerpo |
| `reason` de más de 500 | 400 | `VALIDATION_ERROR` | "Los datos enviados no son válidos." | `{ reason: "Debe tener hasta 500 caracteres." }` (`:7071-7075`) |
| `caseId` / `actId` no entero | 400 | `INVALID_PATH_PARAMETER` | el de los otros endpoints de actos | — (`:7080`) |
| No es el responsable (otro abogado, o administrador) | 403 | `FORBIDDEN` | "Solo el abogado responsable de la causa puede anular sus actos procesales." | `null` (`:7100`) |
| Causa inexistente o dada de baja | 404 | `CASE_NOT_FOUND` | "No se encontró la causa solicitada." | `null` (`:7108`) |
| Acto inexistente, ya dado de baja o de otra causa | 404 | `PROCEDURAL_ACT_NOT_FOUND` | "No se encontró el acto procesal solicitado." | `null` (`:7108-7118`) |
| Causa "Prescripta" | 422 | `CASE_IN_TERMINAL_STATE` | "La causa está prescripta: sus actos procesales no se pueden anular." | `null` (`:7130`) |

**Orden:** primero el 404 y después el 403 (`:7001-7002`, CA-29.7). La causa se verifica antes que el acto.

## Qué queda escrito

| Dónde | Qué |
|---|---|
| `procedural_acts.active` | `false` |
| `procedural_acts.deactivated_at` | ahora (`2026-10-06T15:30:00Z`) |
| `procedural_acts.deactivated_by_user_id` | la abogada responsable |
| `procedural_acts.deactivation_reason` | el motivo recortado; `null` sin motivo o en blanco |
| `cases.current_*` | el estado del acto vigente más reciente, o "Iniciada" sin acto |
| `audit_log` | una fila: `action: 'procedural-act.deactivated'`, `entityType: 'ProceduralAct'`, `entityId` = id del acto, `metadata: { caseId }`, **sin el motivo** |

**Decisión nombrada (CA-29.12):** el contrato dice que el motivo, el usuario y la fecha
quedan "en la auditoría" (`:7007-7009`). Igual que en HU-21 y HU-11, los tres quedan en
las columnas del acto. El motivo no va a `audit_log`, porque es texto libre
(AUDITORIA §4).

## Tabla CA → test

| CA | Test | Tipo |
|---|---|---|
| 29.1 Baja exitosa | 204 sin cuerpo; columnas cargadas; motivo recortado | INT |
| 29.1 | sin cuerpo → 204, motivo `null` | INT |
| 29.2 El acto no se muestra | no está en `GET /procedural-acts` ni en `/timeline`; `GET` y `PATCH` del acto → 404 `PROCEDURAL_ACT_NOT_FOUND` | INT |
| 29.3 Recálculo | baja del acto actual → estado del vigente más reciente | INT + unitario (`case.entity.spec.ts`) |
| 29.3 | baja del único acto → "Iniciada", sin acto ni vencimiento | INT + unitario |
| 29.3 | amparo: baja del único acto → vuelve `harmfulActDeadline` (`{ actDate: '2026-09-01', renewed: false, dueDate: '2026-10-01' }`) | INT |
| 29.4 Plazo abierto | la causa queda con el vencimiento de A, 05/10, aunque esté vencido | INT |
| 29.5 Reapertura | baja de B ("Archivada") → la causa vuelve a "Oposición…" y deja de ser terminal | INT + unitario |
| 29.6 Lo que no cambia | baja de un acto viejo: el estado actual sigue igual; los actos interruptivos siguen | INT + unitario |
| 29.7 Solo el responsable | otro abogado y un administrador → 403 con el texto exacto; base sin cambios | INT + unitario (caso de uso) |
| 29.7 | 404 antes que 403: otro abogado sobre un acto inexistente → 404 | INT |
| 29.8 Causa prescripta | 422 con el texto exacto; base sin cambios | INT + unitario (`criminal-case`) |
| 29.9 Inexistentes | causa inexistente y causa dada de baja → `CASE_NOT_FOUND`; acto inexistente, ya dado de baja y de otra causa → `PROCEDURAL_ACT_NOT_FOUND`; ids no enteros → `INVALID_PATH_PARAMETER` | INT |
| 29.10 Motivo opcional | 501 caracteres → 400 con `details` exacto; base sin cambios | INT + unitario (`deactivation.vo.spec.ts`) |
| 29.11 Reflejo | el tablero del abogado deja de contar el acto dado de baja como "última actuación" | INT |
| 29.11 | listado de causas y proceso diario: siguen el puntero `current_procedural_act_id`, que mueve la baja; cubierto por el recálculo | (por 29.3) |
| 29.11 | reporte mensual: **sin código todavía**, pendiente para quien haga D-117 | — |
| 29.12 Auditoría | una fila `procedural-act.deactivated` con usuario y fecha, sin el motivo | INT + unitario |
| — Carrera | `saveDeactivation` devuelve `false` → 404 y no audita | unitario (caso de uso) |
| 401 sin token | en `test/smoke/app.int.spec.ts` | INT (smoke) |

## Para revisión manual

- Los avisos ya enviados no se retiran (CA-29.6): la baja no toca `sent_notifications`, y no hay código que los borre. No lleva test.
