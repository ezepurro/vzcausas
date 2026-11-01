# Plan de tests — HU14 Modificar abogado

`PATCH /api/v1/lawyers/{lawyerId}` · contrato `docs/Api-Contract/API_CONTRACT_V5.md`,
sección `PATCH /lawyers/{lawyerId}` · decisiones D-89 y D-104
(`docs/Api-Contract/DECISIONES.md:22`, `:37`) · auditoría
`docs/Backend-Architecture/AUDITORIA_Y_TRAZABILIDAD.md` §3 y §4.

**Este documento se escribió desde los criterios de aceptación y el contrato, antes del
código.** Los tests de integración se escriben leyendo este documento, no la
implementación. Si un test de este plan falla contra el código, el código está mal (o
el contrato), no el test.

## Datos fijos

- Reloj fijo de integración: ahora es **06/10/2026 12:30 en Córdoba**
  (`2026-10-06T15:30:00Z`, `test/shared/harness/fixed-clock.ts:11`). Es el
  `occurred_at` esperado del registro de auditoría.
- Abogado de referencia: **Ríos, Malena**, matrícula **`1-28114`**, activo.
- Otro abogado: matrícula **`1-35207`**. Sirve para el conflicto (CA-14.3).
- Cuerpo válido completo:

```json
{ "lastName": "Peralta", "firstName": "Ignacio", "registrationNumber": "1-40000" }
```

## Respuestas que el contrato fija (textuales)

| Situación | HTTP | `code` | `message` | `details` |
|---|---|---|---|---|
| Éxito | 200 | — | — | `{ data: { id, lastName, firstName, registrationNumber, activeCases, active } }`, 6 claves |
| Sin token | 401 | `UNAUTHENTICATED` | "La autenticación es requerida." | `null` |
| Abogado o Secretaría | 403 | `FORBIDDEN` | "Se requiere el rol ADMINISTRATOR para realizar esta operación." | `null` (ver desvío 1) |
| `lawyerId` no entero | 400 | `INVALID_PATH_PARAMETER` | "El identificador del abogado no es válido." | `{ lawyerId: "Debe ser un número entero válido." }` |
| Inexistente o dado de baja | 404 | `LAWYER_NOT_FOUND` | "No se encontró el abogado solicitado." | `null` (ver desvío 2) |
| Matrícula de otro abogado | 409 | `LAWYER_REGISTRATION_ALREADY_EXISTS` | "La matrícula del abogado ya se encuentra registrada." | `null` (ver desvío 3) |
| Datos inválidos | 400 | `VALIDATION_ERROR` | "Los datos enviados no son válidos." | por campo, ver abajo |

`details` de `VALIDATION_ERROR`:

| Campo | Falla | Texto |
|---|---|---|
| `registrationNumber` | no respeta `1-28114` | "El formato de la matrícula no es válido." *(del contrato)* |
| `registrationNumber` | vacía, solo espacios o `null` | "La matrícula es obligatoria." *(texto propio)* |
| `lastName` | vacío, solo espacios o `null` | "El apellido es obligatorio." *(el mismo del alta, `register-lawyer.request.dto.ts:6`)* |
| `firstName` | vacío, solo espacios o `null` | "Los nombres son obligatorios." *(el mismo del alta, `:11`)* |
| `firstName` | incluye "Dr." o "Dra." | "Los nombres no llevan el tratamiento (Dr., Dra.)." *(texto propio)* |
| `lastName`, `firstName` | más de 100 caracteres | "Debe tener como máximo 100 caracteres." *(texto propio; la columna es `VARCHAR(100)`)* |
| `body` | ningún campo enviado | "Debe enviarse al menos un campo para modificar." *(el de `identity`, `identity.errors.ts:195`)* |
| `activeCases` | enviado | "No es un campo admitido." *(el del pipe global, `app.setup.ts:103`)* |

Los errores de datos se informan **todos juntos**.

**Orden de los chequeos:** 401 → 400 de forma (pipe: `null`, `activeCases`, tipo) →
403 → 400 de `lawyerId` → 404 → 400 de contenido → 409. Un pedido rechazado **no
escribe nada**: ni el abogado ni la auditoría.

## Efectos de un `200`

- En la base: la fila de `lawyers` con los valores nuevos, sin espacios sobrantes.
  `active` sigue en `true`.
- En `audit_log`, **una** fila:

| Columna | Valor |
|---|---|
| `actor_user_id` | el id del administrador que modificó |
| `action` | `lawyer.updated` |
| `entity_type` | `Lawyer` |
| `entity_id` | el id del abogado, como texto |
| `occurred_at` | `2026-10-06T15:30:00Z` |
| `metadata` | `{ "changedFields": [...] }`: **solo los nombres** de los campos que cambiaron de verdad, nunca sus valores (§4) |
| `correlation_id` | el `X-Correlation-Id` de la petición |

- Si cambió el apellido o los nombres: se publica `people.lawyer-renamed.v1` **después**
  de guardar, con `{ lawyerId, lastName, firstName }`. Si solo cambió la matrícula, no
  se publica.
- Enviar los mismos valores que ya tiene: `200`, sin cambios en la base, auditoría con
  `changedFields: []` y sin evento.

## Mapa de criterios

| CA | Qué fija | Cubierto por |
|---|---|---|
| 14.1 | La modificación persiste y responde 200 con el abogado | INT D1.1 (forma exacta + relectura de la base) |
| 14.2 | Sus causas muestran el nombre nuevo | INT D1.2 (`GET /cases/{id}`, `responsibleLawyer`) |
| 14.3 | Matrícula de otro: 409 | UNIT caso de uso · INT D3.1 (base sin cambios) |
| 14.4 | Vacío, espacios o `null`: 400 sobre el campo | UNIT `PersonName` · INT D2.1 (`it.each`) |
| 14.5 | Auditoría: quién, cuándo, qué campos | UNIT caso de uso (se audita en la misma transacción) · INT D1.3 (lee `audit_log`) |
| 14.6 | Abogado o Secretaría: 403 | INT D4.1 (login real, `it.each`) |
| 14.7 | Matrícula propia: no es conflicto | UNIT entidad · INT D3.2 |
| 14.8 | Formato de matrícula: 400 | UNIT `RegistrationNumber` (ya existe) · INT D2.1 |
| 14.9 | "Dr."/"Dra." en los nombres: 400 sobre `firstName` | UNIT `PersonName` · INT D2.1 |
| 14.10 | Sin campos o con `activeCases`: 400 | UNIT entidad · INT D2.2 |
| 14.11 | Inexistente o dado de baja: 404 | UNIT caso de uso · INT D3.3 |
| 14.12 | Renombrar la carpeta en Drive | **Parcial.** UNIT: se publica `lawyer-renamed` solo si cambió el nombre. El renombre lo hace `documents` (Mateo) |
| 14.13 | Drive no hace fallar | **Por diseño, sin test propio:** el evento se publica después del commit y `EventPublisher.publish` no lanza (`event-publisher.port.ts`). El resto es de `documents` |
| 14.14 | Carátula con el nombre nuevo | **Sin test propio:** la carátula se arma en cada emisión leyendo el abogado por referencia. Lo cubre CA-14.2 |

## Tests de integración (`test/subsystems/people/update-lawyer.int.spec.ts`)

| `describe` | `it` |
|---|---|
| D1 Modificación exitosa | 1.1 forma exacta y relectura · 1.2 la causa lo refleja · 1.3 una fila de auditoría con sus columnas |
| D2 Datos inválidos | 2.1 `it.each` de los campos (vacío, espacios, `null`, formato, "Dr.", "Dra.") con `details` exacto y base sin cambios · 2.2 sin campos y con `activeCases` |
| D3 Matrícula y existencia | 3.1 matrícula de otro: 409 · 3.2 la propia: 200 · 3.3 inexistente y dado de baja: 404, e id no entero: 400 |
| D4 Acceso | 4.1 Abogado y Secretaría: 403 con login real · 4.2 sin token: 401 |

Cada error verifica que **no** se escribió nada: ni `lawyers` ni `audit_log`.

## Desvíos del código actual respecto del contrato

Se nombran acá y los tests **no** los fijan como esperados: verifican el `code` y dejan
el texto sin fijar hasta que se decida.

1. **403:** el guard responde "No tiene permisos para realizar esta operación."
   (`permissions.guard.ts:64-67`), no el texto del contrato. Es igual en todos los
   endpoints con permiso: no se cambia en esta HU.
2. **404:** `LawyerNotFoundError` manda `details: { lawyerId }`
   (`people.errors.ts:40`), y el contrato pide `null`. Afecta también a
   `GET /lawyers/{lawyerId}`.
3. **409:** `LawyerRegistrationAlreadyExistsError` tiene el `message` en inglés
   (`people.errors.ts:20`). La regla del proyecto es no traducir al pasar
   (`.claude/rules/dominio.md`, "El idioma de los mensajes").
