# Plan de tests — D-113 Prescripción declarada por calificación

Revisión del contrato del 08/11/2026 (`docs/Api-Contract/API_CONTRACT_V5.md`:
§3.7 `legalQualifications[]` y `prescription`, `POST /cases/{caseId}/prescription`,
`POST /cases/{caseId}/legal-qualifications/{legalQualificationId}/prescription`,
`PATCH /cases/{caseId}`, `GET /cases/{caseId}/timeline`, §3.9 y §4
Prescripción; `DECISIONES.md`, D-113). Criterios en Jira: HU-33 (VZ-41),
HU-31 (VZ-39) y HU-32 (VZ-40), revisados el 08/11/2026.

**Este documento se escribió desde el contrato y los criterios, antes del
código.** Si un test de este plan falla contra el código, el código está mal (o
el contrato), no el test.

## Respuestas que el contrato fija (textuales)

`POST /cases/{caseId}/legal-qualifications/{legalQualificationId}/prescription`:

| Situación | HTTP | `code` | `message` | `details` |
|---|---|---|---|---|
| Éxito | 200 | — | — | `{ data: <causa> }`, misma forma que `GET /cases/{caseId}` |
| Sin token | 401 | `UNAUTHENTICATED` | "La autenticación es requerida." | `null` |
| Secretaría | 403 | `FORBIDDEN` | "Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación." | `null` |
| Abogado no responsable | 403 | `FORBIDDEN` | "Solo el abogado responsable de la causa puede declarar la prescripción de sus calificaciones legales." | `null` |
| Causa inexistente o dada de baja | 404 | `CASE_NOT_FOUND` | "No se encontró la causa solicitada." | `null` |
| La causa no registra la calificación | 404 | `LEGAL_QUALIFICATION_NOT_FOUND` | "La causa no registra esa calificación legal." | `null` |
| No es penal | 422 | `PRESCRIPTION_NOT_APPLICABLE` | "La prescripción solo aplica a las causas del fuero penal." | `null` |
| Estado terminal | 422 | `CASE_IN_TERMINAL_STATE` | "La causa se encuentra en un estado terminal y no admite esta operación." | `null` |
| Ya declarada | 422 | `LEGAL_QUALIFICATION_ALREADY_PRESCRIBED` | "La calificación legal ya fue declarada prescripta." | `null` |
| Datos inválidos | 400 | `VALIDATION_ERROR` | "Los datos enviados no son válidos." | los de HU33: `prescriptionDate` "No puede ser posterior a hoy.", `resolution` "La resolución que declara la prescripción es obligatoria." |
| Id de ruta no entero | 400 | `INVALID_PATH_PARAMETER` | — | `{ caseId }` o `{ legalQualificationId }` |

**Orden:** 401 → 400 de forma → 404 causa → 403 → 422 fuero → 404 calificación →
422 terminal → 422 ya declarada → 400 de contenido. **Un pedido rechazado no
escribe nada.**

`PATCH /cases/{caseId}`, quitar o cambiar la fecha del hecho de una declarada:
`422 LEGAL_QUALIFICATION_ALREADY_PRESCRIBED`, "No se puede quitar ni modificar
una calificación legal declarada prescripta.", `details: null`.

`POST /cases/{caseId}/prescription`: mismas respuestas que hoy (HU33).

## Datos fijos

**Reloj de integración:** hoy es 06/10/2026 (`test/shared/harness/fixed-clock.ts`).

**Causa de integración**, penal, dos calificaciones con hecho del 10/01/2024:

| Calificación | Meses | Vence | Al 06/10/2026 |
|---|---|---|---|
| A | 24 | 2026-01-10 | 1000 / 731 días → 100 %, `alert` y `expired` |
| C | 72 | 2030-01-10 | 1000 / 2192 días → 45,62 % → 46, sin alerta |

- Sin declarar: `prescription` es A (vence primero, aunque esté cumplida: D-52).
- Declarada A el 15/09/2026: `prescription` pasa a C (46 %); la causa sigue en
  su estado y con su plazo; `prescriptionDeclaration` de la causa sigue `null`.
- Declarada también C: la causa pasa a "Prescripta", `currentState.dueDate` en
  `null`, y `prescriptionDeclaration` de la causa es el de C.

**Acto interruptivo de integración**, sobre la misma causa sin declarar, con
fecha 01/03/2026 (posterior al vencimiento de A, anterior al de C):

- A **no** se reinicia: `prescriptionStartsOn` 2024-01-10, vence 2026-01-10.
- C se reinicia: `prescriptionStartsOn` 2026-03-01, vence 2032-03-01; al
  06/10/2026 lleva 219 / 2192 días → 9,99 % → 10, sin alerta.
- `prescription` sigue siendo A (sin declarar, vence primero),
  `lastInterruptiveActDate` en `null`. En la línea de vida, el acto sale con
  `governsPrescription` en `false`: no fija el cómputo de `prescription`.

**Dominio** (`prescription.spec.ts`): calificación de 10 meses con hecho del
01/01/2026, que vence el 01/11/2026.

| Actos interruptivos | Declarada | Inicio | Vence | Por qué |
|---|---|---|---|---|
| 31/10/2026 | no | 31/10/2026 | 31/08/2027 | anterior al vencimiento: reinicia |
| 01/11/2026 | no | 01/01/2026 | 01/11/2026 | el día del vencimiento ya está cumplido |
| 01/12/2026 | no | 01/01/2026 | 01/11/2026 | posterior al vencimiento |
| 01/12/2025 | no | 01/01/2026 | 01/11/2026 | anterior al hecho (CA-31.5) |
| 01/06/2026 y 01/03/2027 | no | 01/03/2027 | 01/01/2028 | el primero lleva a 01/04/2027; el segundo es anterior: reinicia |
| 01/06/2026 y 01/05/2027 | no | 01/06/2026 | 01/04/2027 | el segundo es posterior al vencimiento nuevo |
| los mismos dos, al revés | no | igual | igual | el orden de carga no importa |
| 01/10/2026 | el 15/09/2026 | 01/01/2026 | 01/11/2026 | posterior a la declaración |
| 01/09/2026 | el 15/09/2026 | 01/09/2026 | 01/07/2027 | anterior a la declaración y al vencimiento |

`lastInterruptiveActDate` de cada cómputo es el acto que fijó su inicio, o
`null`.

## Regla → test

| Regla | Nivel | Dónde |
|---|---|---|
| Reinicio por actos (tabla de arriba), CA-31.2 a 31.5, CA-31.14 | Unitario (dominio) | `prescription.spec.ts` |
| La que rige se elige entre las no declaradas; todas declaradas → entre todas (§3.7) | Unitario (dominio) | `prescription.spec.ts` |
| Declarar una calificación: guarda la declaración; no cierra la causa si quedan otras; cierra si era la última (CA-33.4, 33.5) | Unitario (entidad) | `criminal-case` / `case.entity.spec.ts` |
| Ya declarada, calificación ajena a la causa, causa terminal, fuera del penal (CA-33.8, 33.9) | Unitario (entidad) | ídem, un test por rechazo |
| Marcar toda la causa declara las que faltan y conserva las declaradas (CA-33.17) | Unitario (entidad) | ídem |
| Modificar causa: no quitar ni cambiar la fecha del hecho de una declarada; sí sumar y quitar otras (CA-33.18) | Unitario (entidad) | `case-modify.spec.ts` |
| Orden de chequeos y "un rechazo no escribe" | Unitario (caso de uso) | `declare-qualification-prescription.use-case.spec.ts` |
| La respuesta la arma `GetCase` | Unitario (caso de uso) | ídem |
| Mapper: `prescriptionDeclaration` por calificación y la entrada de línea de vida | Unitario (infraestructura) | `case-http.mapper.spec.ts`, `timeline-http.mapper.spec.ts` |
| Caso feliz con forma exacta: declarar A, después C (CA-33.1, 33.4, 33.5) | Integración | `declare-prescription.int.spec.ts`, `describe` nuevo |
| Errores 403 (abogado ajeno), 404 (calificación ajena), 422 (ya declarada), con la base sin cambios | Integración | ídem, un test con varias variantes |
| Marcar toda la causa con una ya declarada (CA-33.17) | Integración | ídem |
| Acto posterior al vencimiento no reinicia (CA-31.14) y `governsPrescription` | Integración | `interruptive-acts.int.spec.ts` |
| `PATCH` rechaza quitar una declarada (CA-33.18) | Integración | `update-case.int.spec.ts` |
| Declarada sale de las alertas del tablero; sin declarar sigue (CA-32.8) | Integración | `dashboards.int.spec.ts` |
| El aviso diario no avisa por una declarada (CA-32.5) | Integración | `detect-upcoming-prescriptions.int.spec.ts` |
| 401 sin token del endpoint nuevo | Integración | `test/smoke/app.int.spec.ts`: sumar la ruta |
| Lo de HU33 que no cambia (permisos de la causa entera, terminal, sin calificaciones) | — | Ya lo cubre `declare-prescription.int.spec.ts` |

## Para revisión manual

- **La copia de datos de la migración**: a las calificaciones de las causas ya
  marcadas prescriptas se les copia la declaración de la causa. La base de
  integración arranca vacía, así que ningún test lo recorre. Revisar el SQL y
  probarlo en una base de dev con una causa prescripta.

## Fuera de alcance

- El frontend (pasos 9 y 10 del plan).
- Que un acto interruptivo alcance solo a algunos delitos: se acordó que los
  alcanza a todos los que siguen corriendo.
