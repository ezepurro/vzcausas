# Plan de tests — HU-15 Baja de abogado con causas huérfanas

`DELETE /api/v1/lawyers/{lawyerId}` (`API_CONTRACT_V6.md:1723-1970`), más lo que toca en
`cases`: filtro `GET /cases?unassigned=true`, `PATCH /cases/{caseId}` y actos de una
huérfana (§4 "Causa huérfana"). Decisiones D-133, D-143, D-144 (`DECISIONES.md`).
Tareas T1.2 a T1.9 de `docs/Backend-Architecture/IMPLEMENTACION_CAUSAS_HUERFANAS.md`.

**Escrito desde el contrato, antes del código.** Si un test de este plan falla contra el
código, el código está mal (o el contrato), no el test.

## Datos fijos

- Reloj fijo de integración: `withFixedClock` (`test/shared/harness/fixed-clock.ts`).
- Abogado a dar de baja: **Ríos**, con tres causas activas (A, B, C) y una archivada (T).
- Abogado de destino: **Gaga**, vigente. Cuerpo feliz mixto:
  `[{caseId: A, responsibleLawyerId: Gaga}, {caseId: B, unassigned: true}, {caseId: C, unassigned: true}]`.

## Respuestas que el contrato fija (textuales)

| Situación | HTTP | `code` | `message` | `details` |
|---|---|---|---|---|
| Éxito | 204 | — | sin cuerpo | — |
| `lawyerId` no entero | 400 | `INVALID_PATH_PARAMETER` | "El identificador del abogado no es válido." | `{ lawyerId: "Debe ser un número entero válido." }` |
| Reparto inválido | 400 | `VALIDATION_ERROR` | "Los datos enviados no son válidos." | `{ reassignments: "<texto por caso>" }` (ej.: "La causa 12 no es una causa activa de este abogado.") |
| Sin token | 401 | `UNAUTHENTICATED` | "La autenticación es requerida." | `null` |
| No administrador | 403 | `FORBIDDEN` | "Se requiere el rol ADMINISTRATOR para realizar esta operación." | `null` |
| Abogado inexistente o dado de baja | 404 | `LAWYER_NOT_FOUND` | "No se encontró el abogado solicitado." | `null` |
| Causa activa sin figurar en el reparto | 409 | `LAWYER_HAS_DEPENDENCIES` | "El abogado tiene causas activas sin reasignar ni dejar sin asignar." | `null` |

Los textos de `details.reassignments` que el contrato no da (causa repetida, destino
inexistente, destino dado de baja, destino igual al abogado, entrada sin ninguno de los
dos campos, entrada con los dos, `unassigned` distinto de `true`) son **texto propio**:
se fijan por `code` y por la clave `reassignments`, no por el mensaje.

**Orden de los chequeos** (regla de la baja y `flujo-hu-backend.md`): 401 → 400 de ruta →
403 → 404 (regla 1) → 400 de cuerpo (regla 2) → 409 (regla 3). **Un pedido rechazado no
escribe nada.**

## CA → test

| # | Criterio (contrato) | Nivel | Dónde | Qué fija |
|---|---|---|---|---|
| 1 | Baja sin causas activas: cuerpo omitido, vacío o sin cuerpo (`:1810`) | Integración | `people` baja | 204; abogado `active:false`; `GET /lawyers/{id}` → 404 |
| 2 | Reasigna a otro abogado (`responsibleLawyerId`) | Integración | `people` baja | 204; la causa A queda con Gaga, `orphanedAt` null, auditoría del cambio de responsable |
| 3 | `unassigned: true` deja la causa huérfana (D-143) | Integración | `people` baja | B y C: `responsibleLawyerId` null, `orphanedAt` = reloj fijo, **estado procesal, plazos y SAC intactos**, siguen activas y vigentes |
| 4 | Causas terminales no se reasignan (`:1769`) | Integración | `people` baja | T sigue con Ríos como responsable; no se pide en el reparto |
| 5 | Atomicidad (`:1824`): si algo falla no cambia nada | Integración | `people` baja | Fallo forzado en una reasignación → ninguna causa cambió y Ríos sigue vigente |
| 6 | Regla 3: causa activa fuera del reparto (`:1760`) | Integración | `people` baja | 409 `LAWYER_HAS_DEPENDENCIES` textual; base sin cambios; **no queda huérfana por omisión** |
| 7 | Regla 2: reparto inválido, cada variante (`:1815`) | Integración, `it.each` | `people` baja | 400 `VALIDATION_ERROR`, `details.reassignments`; base sin cambios |
| 8 | Regla 1: abogado inexistente o ya dado de baja | Integración | `people` baja | 404 `LAWYER_NOT_FOUND` textual |
| 9 | 403 a `LAWYER` y `SECRETARY` | Integración | `people` baja | 403 `FORBIDDEN` textual; 401 en `test/smoke/app.int.spec.ts` |
| 10 | Usuario vinculado pierde `LAWYER`; se da de baja si era único rol (D-133, `:1863`) | Integración | `people` baja | Dos casos: con otro rol sigue vigente; sin otro rol queda de baja |
| 11 | Reglas del reparto y de la baja (cada regla por separado) | Unitario | caso de uso de baja | Orden de los chequeos; llama una sola vez al repositorio atómico |
| 12 | `Case.leaveWithoutResponsible` | Unitario | `case-orphan.spec.ts` | Ya hecho en T1.1 |
| 13 | `CHECK ck_cases_orphaned_coherent` | Integración | `orphaned-case-check.int.spec.ts` | Ya hecho en T1.1 |
| 14 | `GET /cases?unassigned=true` (T1.2) | Integración | `consult-cases` | Solo huérfanas; `responsibleLawyer: null` y `orphanedAt` presentes; forma exacta (30 claves + `orphanedAt`, ya en `CASE_KEYS`) |
| 15 | `PATCH` reasigna una huérfana (T1.2) | Integración | `cases` modificación | `orphanedAt` vuelve a null; `PATCH` con `responsibleLawyerId: null` → 400 `VALIDATION_ERROR` |
| 16 | Admin opera actos de una huérfana a su nombre (T1.3, D-144) | Integración | `cases` actos | 201; `registeredBy` = admin; `registered_by_lawyer_id` null; un `LAWYER` sobre la huérfana → 403 `FORBIDDEN` |
| 17 | Avisos de una huérfana solo a la casilla (T1.4, S5) | Unitario | `send-daily-notification-digest` | Sin copia al abogado; el abogado con causa normal sí la recibe |
| 18 | Carpeta Drive `Sin asignar` (T1.5, S6) | Unitario + integración con Drive falso | `documents` | Ruta `/VZ Causas/Causas/Sin asignar/{fuero}/`; Drive caído no falla la baja |

## Para revisión manual

- Drive real: el movimiento de carpetas y la carpeta del abogado a `Papelera` (D-132) se
  pueden probar solo con las cuentas reales.
- C-49 (tablero del administrador) sigue abierto: no hay test hasta definirlo.
- Carátula `DEFENSOR: Sin asignar`: texto sin confirmar con el contrato.

## Pendiente de acordar fuera de este plan

- Ajustar con el compañero de HU51/52 el tipo `responsibleLawyerId: number | null` de los
  avisos (`.claude/rules/notificaciones.md`).
