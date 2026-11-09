# Plan de tests — HU21 Registrar baja de una causa

`DELETE /api/v1/cases/{caseId}` · contrato `docs/Api-Contract/API_CONTRACT_V5.md:4430-4510`
· §4 Bajas `:8295-8320` · D-97 · RN9, RN12
· auditoría `docs/Backend-Architecture/AUDITORIA_Y_TRAZABILIDAD.md` §3 y §4
· columnas de la baja `backend/prisma/schema.prisma:445-453`.

**Este documento se escribió desde los criterios de aceptación y el contrato, antes del
código.** Los tests de integración se escriben leyendo este documento, no la
implementación. Si un test falla contra el código, el código está mal (o el contrato),
no el test.

## Datos fijos

- Reloj fijo: ahora es **06/10/2026 12:30 en Córdoba** (`2026-10-06T15:30:00Z`,
  `test/shared/harness/fixed-clock.ts:11`).
- Causa penal de referencia: la del escenario de actos procesales
  (`setUpProceduralActScenario`), responsable Ríos, Malena, en "Iniciada", sin SAC.
- Da de baja una **secretaria**: cualquier perfil puede (CA-21.1, `:4435`).
- Una causa con SAC **`20000002`**, para comprobar que el SAC se libera.

## Respuestas que el contrato fija (textuales)

| Situación | HTTP | `code` | `message` | `details` |
|---|---|---|---|---|
| Éxito | 204 | — | — | sin cuerpo |
| Sin token | 401 | `UNAUTHENTICATED` | "La autenticación es requerida." | `null` |
| `caseId` no entero | 400 | `INVALID_PATH_PARAMETER` | "El identificador de la causa no es válido." | `{ caseId: "Debe ser un número entero válido." }` |
| Inexistente o ya dada de baja | 404 | `CASE_NOT_FOUND` | "No se encontró la causa solicitada." | `null` |
| `reason` de más de 500 | 400 | `VALIDATION_ERROR` | "Los datos enviados no son válidos." | `{ reason: "Debe tener hasta 500 caracteres." }` *(`:4501`)* |
| Un campo que no es `reason` | 400 | `VALIDATION_ERROR` | "Los datos enviados no son válidos." | `{ <campo>: "No es un campo admitido." }` *(pipe global)* |

## Qué queda escrito

| Dónde | Qué |
|---|---|
| `cases.active` | `false` |
| `cases.deactivated_at` | ahora (`2026-10-06T15:30:00Z`) |
| `cases.deactivated_by_user_id` | la secretaria |
| `cases.deactivation_reason` | el motivo recortado; `null` sin motivo o en blanco |
| `audit_log` | una fila: `action: 'case.deactivated'`, `entityType: 'Case'`, `entityId` = id de la causa, `actorUserId` = la secretaria, `occurredAt` = ahora, `correlationId` del header, **sin el motivo** |
| actos procesales | los mismos que antes (no se borra nada) |

**Decisión nombrada (CA-21.3):** el contrato dice que el motivo queda "en la auditoría
de la causa" (`:4464`); el schema lo guarda en `cases.deactivation_reason` y no en
`audit_log` porque es texto libre que puede tener datos sensibles
(`schema.prisma:448-450`, AUDITORIA §4). Motivo, usuario y fecha constan; el texto no
va a `audit_log`. Pendiente de alinear la redacción del contrato con Luciano.

## Tabla CA → test

| CA | Test | Tipo |
|---|---|---|
| 21.1 Baja lógica | 204 sin cuerpo; `active` en `false`, columnas cargadas, actos conservados | INT |
| 21.1 | `deactivate` pone `active` en `false` y guarda el registro | unitario (`case.entity.spec.ts`) |
| 21.2 Motivo opcional | sin cuerpo → 204, motivo `null`; motivo de 500 → 204; motivo en blanco → `null` | INT + unitario (VO) |
| 21.2 | motivo de 501 → 400 con `details` exacto, base sin cambios | INT |
| 21.2 | otro campo (`active`) → 400 "No es un campo admitido." | INT |
| 21.3 Auditoría | una fila `case.deactivated` con usuario, fecha y correlación, sin el motivo | INT + unitario (caso de uso) |
| 21.4 No existe para el cliente | `GET /cases/{id}`, `/timeline`, `/procedural-acts`, `/interruptive-acts` → 404 `CASE_NOT_FOUND`; no está en `GET /cases` ni en `?search=` | INT |
| 21.4 | **no cubierto**: `POST /procedural-acts` y `deadline-preview` aceptan la causa dada de baja (`register-procedural-act.use-case.ts:138-145`). Se avisa a quien tenga ese caso de uso; no se fija como esperado. Carátula, documentos y expedientes no tienen ruta todavía | — |
| 21.5 Baja repetida | segunda baja → 404; id inexistente → 404 | INT + unitario |
| 21.5 | dos bajas a la vez: `saveDeactivation` devuelve `false` → 404 sin auditoría | unitario (caso de uso) |
| 21.6 Deja de contar | `activeCases` de `GET /lawyers/{id}` y `GET /clients/{id}` baja en 1 | INT |
| 21.6 | calificaciones, tableros y proceso diario: usan el mismo filtro `ACTIVE_CASE` (`prisma-case.repository.ts:511`) y tienen sus propios specs; **revisión manual** | — |
| 21.7 SAC liberado | otra causa se registra con el SAC (201) y otra se modifica con él (200) | INT |
| 21.8 La carpeta se mueve a la carpeta `Papelera` (**revisado 08/11/2026**: antes "Drive intacto", ver D-104) | UNIT `DeactivateCase`: publica `cases.case-deactivated.v1` solo con la carpeta `CREATED`, después de guardar; no publica si no hay carpeta o si el pedido se rechaza; si el anuncio falla, la baja se guarda igual · UNIT `RecycleCaseFolder` (crea `Papelera` la primera vez y la reutiliza, no toca la fila, sin carpeta no hace nada, reintento) y `CaseDeactivatedListener` · INT (`case-folder.int.spec.ts`, HU21): 204, la carpeta se mueve a `Papelera` sin borrarse, la fila y el vínculo se conservan; con Drive caído, 204 igual | UNIT + INT |
| 21.9 Cualquier estado | "Archivada" y "Prescripta" → 204 | INT + unitario |
| 21.10 Id inválido | `abc` → 400 `INVALID_PATH_PARAMETER` | INT |

## Integración: agrupación (5 × 3)

1. **baja exitosa** — 21.1 y 21.3 (escritura y auditoría); 21.2 (sin cuerpo, 500, blanco).
2. **motivo inválido** — 21.2 (501 y campo no admitido), base sin cambios.
3. **para el cliente no existe** — 21.4 y 21.6.
4. **baja repetida, id inválido y SAC** — 21.5, 21.10, 21.7.
5. **cualquier estado** — 21.9.
