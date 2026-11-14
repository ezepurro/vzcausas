# Plan de tests — HU49 Modificar y HU50 Dar de baja una calificación legal

`PATCH /api/v1/legal-qualifications/{qualificationId}` (`docs/Api-Contract/API_CONTRACT_V6.md:2809-2907`)
y `DELETE /api/v1/legal-qualifications/{qualificationId}` (`:2911-2979`) · recurso §3.5 `:2536-2581`
· §4 Bajas `:10377-10422` · D-08, D-32, D-39, D-127 (`docs/Api-Contract/DECISIONES.md`) · RN11, RN12, RNF9.

**Escrito antes del código.** Los tests de integración se escriben leyendo este
documento, no la implementación. Si un test falla contra el código, el código está
mal (o el contrato), no el test.

## Datos fijos

- Calificación de referencia: **"Robo calificado — art. 167 inc. 2 CP"**, **96 meses**.
- Causa penal que la registra (la de `aCaseWith`, `legal-qualifications.int.spec.ts:234`),
  con el hecho del **27/02/2021**: `prescriptionStartsOn` `2021-02-27`,
  `prescriptionExpiresOn` **`2029-02-27`**.
- Plazo nuevo: **120 meses** → `prescriptionExpiresOn` **`2031-02-27`**; `prescriptionStartsOn`
  sigue en `2021-02-27` (sin actos interruptivos).
- Denominación nueva: **"Robo calificado — art. 167 inc. 4 CP"**.
- Sin reloj fijo en la suite de calificaciones: `prescriptionStartsOn` y
  `prescriptionExpiresOn` no dependen de hoy, y solo se miran esas dos fechas.
- Modifica y da de baja cualquiera de los tres perfiles (matriz §5.1, D-39): `qualification:update`
  y `qualification:delete` van al `STAFF` de `prisma/seed.ts`, que el harness corre después de las
  migraciones (`global-setup.ts:120`).

## Respuestas que el contrato fija (textuales)

| Situación | HTTP | `code` | `message` | `details` |
|---|---|---|---|---|
| `PATCH` exitoso | 200 | — | — | `{ data: { id, name, prescriptionMonths, active } }`, **sin `activeCases`** (`:2841`, D-32) |
| `DELETE` exitoso | 204 | — | — | sin cuerpo |
| Sin token | 401 | `UNAUTHENTICATED` | "La autenticación es requerida." | `null` *(smoke)* |
| Token sin el permiso | 403 | `FORBIDDEN` | "No tiene permisos para realizar esta operación." | `null` *(guard, `permissions.guard.ts:64`; el contrato no lista 403 porque los tres perfiles tienen el permiso)* |
| `qualificationId` no entero | 400 | `INVALID_PATH_PARAMETER` | "El identificador de la calificación legal no es válido." | `{ qualificationId: "Debe ser un número entero válido." }` |
| Inexistente o dada de baja | 404 | `LEGAL_QUALIFICATION_NOT_FOUND` | "No se encontró la calificación legal solicitada." | `null` |
| Denominación de otra vigente | 409 | `LEGAL_QUALIFICATION_ALREADY_EXISTS` | "Ya existe una calificación legal con esa denominación." | `null` |
| Datos inválidos | 400 | `VALIDATION_ERROR` | "Los datos enviados no son válidos." | por campo, abajo |

`details` de `VALIDATION_ERROR` en el `PATCH`:

| Campo | Falla | Texto | Fuente |
|---|---|---|---|
| `body` | ningún campo (`{}`) | "Debe enviarse al menos un campo para modificar." | texto propio, el mismo de `procedural-state.errors.ts:138` y HU10 |
| `name` | `""`, en blanco o `null` | "No puede estar vacío." | contrato `:2867` |
| `name` | más de 255 | "Debe tener como máximo 255 caracteres." | el del alta |
| `name` | no es texto | "Debe ser un texto." | el del alta |
| `prescriptionMonths` | `0`, negativo, decimal o `null` | "Debe ser un número entero mayor o igual a 1." | contrato `:2628` |
| `activeCases`, `active`, `id` | enviado | "No es un campo admitido." | pipe global, `app.setup.ts:109` |

Los errores de datos se informan **todos juntos**.

**Orden de los chequeos**: 401 → 403 (guard) → 400 de forma (pipe del DTO e id de la ruta)
→ 400 cuerpo vacío → 404 → 400 de contenido (entidad) → 409. El cuerpo vacío va antes
del 404 porque es forma, como en `UpdateProceduralState`. **Un pedido rechazado no
escribe nada.**

## Qué queda escrito

| Operación | `legal_qualifications` | Otras tablas |
|---|---|---|
| `PATCH` | `name` (recortado) y/o `prescription_months`; `active` sigue `true` | ninguna: `offenses` no se toca (D-08, la causa referencia) |
| `DELETE` | `active` en `false`; `name` y `prescription_months` iguales | ninguna: los hechos de las causas siguen apuntando a la fila |

## Tabla CA → test

| CA | Test | Tipo |
|---|---|---|
| 49.1 Modificación exitosa | `rename` recorta; `changePrescriptionMonths` cambia el plazo | UNIT entidad |
| 49.1 | solo `name`, solo meses o los dos: el omitido no cambia; se guarda una vez | UNIT caso de uso |
| 49.1 | cuerpo vacío → error, no lee ni escribe | UNIT caso de uso + INT P1.2 |
| 49.1 | 200 con las cuatro claves exactas, persistido, el omitido igual | INT P1.1 |
| 49.1 RN11/RNF9 | los tres perfiles modifican (login real); token sin permiso → 403 sin cambios | INT P5 |
| 49.2 Denominación única | otra vigente con ese nombre → 409, no escribe; la propia no choca (`excludingId`) | UNIT caso de uso |
| 49.2 | contra el índice real: otra vigente sin distinguir mayúsculas ni espacios → 409 sin cambios; cambiar solo mayúsculas de la propia → 200; el nombre de una dada de baja → 200 | INT P2.1 |
| 49.2 | dos renombres simultáneos al mismo nombre → uno 200, el otro 409 (el repositorio traduce la violación del índice) | INT P2.2 |
| 49.2 | 255 caracteres pasa, 256 no; en blanco no | UNIT entidad |
| 49.3 Plazo ≥ 1 | `0`, `1.5` → error; `1` pasa | UNIT entidad |
| 49.3 | `prescriptionMonths: 0` junto con `name` inválido → 400 con los dos campos | INT P1.2 |
| 49.3 | "años y meses de 0 a 11" | **Interfaz**: el contrato viaja en meses totales (`:2570-2574`) |
| 49.4 Recalcula la prescripción | `GET /cases/{id}` antes: 96 / `2029-02-27`; después del `PATCH` a 120: 120 / `2031-02-27`, `prescriptionStartsOn` igual | INT P4.1 |
| 49.4 | la detección diaria vuelve a avisar con la fecha nueva (CA-52.8, V-09) | INT en `detect-upcoming-prescriptions.int.spec.ts`, gemelo de `:314` (decidido 3) |
| 49.5 Causas que la usan | la respuesta del `PATCH` no trae `activeCases`; enviarlo → 400 "No es un campo admitido." | INT P1.1, P1.2 |
| 49.5 | `activeCases` del `GET` igual antes y después del `PATCH` | INT P4.1 |
| 49.6 Inexistente o dada de baja | → 404, sin cambios; `abc` y `0` → 400 `INVALID_PATH_PARAMETER` | INT P1.3 + UNIT caso de uso |
| 49.6 | la fila se dio de baja entre la lectura y la escritura (`update` devuelve `false`) → 404 | UNIT caso de uso |
| 50.1 Baja lógica | `deactivate` pone `active` en `false` y nada más | UNIT entidad |
| 50.1 | 204 sin cuerpo; la fila sigue con `active: false`; no aparece en el listado; `GET` por id → 404 | INT D3.1 |
| 50.1 | no se reactiva: `PATCH` sobre la dada de baja → 404; `active: true` en el cuerpo → 400 | INT D3.2, P1.2 |
| 50.1 | libera la denominación: `POST` con el mismo nombre → 201 (cierra QL-02) | INT D3.1 |
| 50.2 No se ofrece para causas nuevas | fuera del listado | INT D3.1 |
| 50.2 | alta de causa con una dada de baja → 400 sobre `legalQualifications` | **Ya cubierto**: `register-case.int.spec.ts:407`. No se duplica |
| 50.2 | modificación de causa con una dada de baja → 400 | **Ya cubierto**: `update-case.use-case.spec.ts:159` (unitario, mismo `findActiveQualificationsByIds` que el alta) |
| 50.3 Las causas la conservan | con causas que la registran: 204, no 409; `GET /cases/{id}` la sigue mostrando con nombre, meses y `prescriptionExpiresOn` | INT P4.2 |
| 50.3 | **no cubierto, punto abierto**: una causa que la conserva no puede reemplazar su lista de calificaciones manteniéndola (`update-case.use-case.ts:121` → 400). V6 no lo resuelve. No se fija como esperado | — |
| 50.4 Inexistente o ya dada de baja | segunda baja → 404; inexistente → 404; `abc` → 400 | INT D3.2 + UNIT caso de uso |
| 401 de las dos rutas | `PATCH` y `DELETE` sin token | smoke (`test/smoke/app.int.spec.ts`, lista de rutas) |

## Unitarios

| Archivo | Qué |
|---|---|
| `legal-qualification.spec.ts` (existe) | `rename`, `changePrescriptionMonths`, `deactivate`, con los bordes de arriba |
| `update-legal-qualification.use-case.spec.ts` (nuevo) | caso feliz por campo; cuerpo vacío; 404; 409 y `excludingId`; error de la entidad sin escritura; `update` en `false` → 404 |
| `deactivate-legal-qualification.use-case.spec.ts` (nuevo) | caso feliz; 404 sin escritura; `update` en `false` → 404 |
| `test-support/legal-qualification-fakes.ts` (nuevo) | repositorio en memoria que implementa el puerto, como `procedural-state-fakes.ts` |

## Integración: agrupación (5 × 3), en `test/subsystems/legal-parameters/legal-qualifications.int.spec.ts`

**P1 — `PATCH`: modificación**
1. Modifica `name` y `prescriptionMonths`: 200, `toEqual` con las cuatro claves, persistido. Otro `PATCH` solo con meses deja el nombre (CA-49.1, 49.5).
2. `it.each`: `{}` → `body`; `name: ""` + `prescriptionMonths: 0` → los dos; `activeCases` / `active` → "No es un campo admitido." `details` exacto, base sin cambios (CA-49.1, 49.3, 49.5, 50.1).
3. Inexistente y dada de baja → 404; `abc` y `0` → 400 con `details` exacto; la dada de baja sigue igual (CA-49.6).

**P2 — `PATCH`: denominación única**
1. 409 contra otra vigente (mayúsculas y espacios), sin cambios; la propia con otras mayúsculas → 200; el nombre de una dada de baja → 200 (CA-49.2).
2. Dos renombres simultáneos al mismo nombre → uno 200, otro 409; queda uno solo con ese nombre (CA-49.2, índice).

**D3 — `DELETE`**
1. 204 sin cuerpo; `active: false` con nombre y meses intactos; fuera del listado; `GET` → 404; `POST` con el mismo nombre → 201 (CA-50.1, 50.2, QL-02).
2. Segunda baja → 404; inexistente → 404; `abc` → 400; `PATCH` sobre la dada de baja → 404 (CA-50.1, 50.4).

**P4 — causas que la registran**
1. Cambiar el plazo: `GET /cases/{id}` antes y después (fechas de "Datos fijos"); `activeCases` del `GET` igual (CA-49.4, 49.5).
2. Dar de baja con una causa: 204; `GET /cases/{id}` la sigue mostrando con su prescripción (CA-50.3).

**P5 — permisos** (amplía el describe existente)
1. `it.each(ROLES)` con login real: además del alta y las lecturas, `PATCH` → 200 y `DELETE` → 204 (seed).
2. Token sin `qualification:update` / `qualification:delete` → 403 en las dos rutas, sin cambios.

## Decidido (13/11/2026)

1. **Auditoría: no se audita.** `AUDITORIA_Y_TRAZABILIDAD.md` §4 no lista la parametría jurídica y V6 §3.5 no menciona auditoría. HU10 audita porque §4 lista clientes.
2. **Código de los errores de la entidad.** `rename` y `changePrescriptionMonths` reusan las validaciones del alta (`INVALID_LEGAL_QUALIFICATION`, `legal-qualification.ts:48`). Por HTTP no se alcanzan: el DTO responde antes con `VALIDATION_ERROR` y el texto del contrato.
3. **CA-52.8 en la suite de detección.** Un `it` gemelo de `detect-upcoming-prescriptions.int.spec.ts:314`: tras el `PATCH` de meses, la corrida diaria vuelve a avisar con el vencimiento nuevo. Cerraría lo que `IMPLEMENTACION_DETECCION.md:384` deja en revisión manual. Esa suite no es de este subsistema.
4. **Texto de `name` vacío.** El `PATCH` usa "No puede estar vacío." (contrato `:2867`); el alta sigue con "Es un campo obligatorio." (`register-qualification.request.dto.ts:15`). No se toca el alta.

## Fuera de alcance, registrado

- `offenses.prescription_date` queda desactualizada después del `PATCH`; ninguna lectura la usa (`schema.prisma`, comentario de `Offense`). Decisión abierta en `docs/support/cambios-bdd-sprint4.md:388`.
- El hueco de 50.3 con `PATCH /cases` (arriba).
