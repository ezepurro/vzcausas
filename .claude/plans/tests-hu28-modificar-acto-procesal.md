# Plan de tests — HU28 Modificar acto procesal

`PATCH /api/v1/cases/{caseId}/procedural-acts/{actId}` · contrato
`docs/Api-Contract/API_CONTRACT_V5.md:5935-6145` · decisiones D-98 y D-99
(`docs/Api-Contract/DECISIONES.md:31-32`) · registro de referencia: `:5326-5580`.

**Este documento se escribió desde los criterios de aceptación y el contrato, antes del
código.** Los tests se escriben leyendo este documento, no la implementación. Si un test
falla contra el código, el código está mal (o el contrato), no el test.

**Sin migración:** las columnas y sus CHECK ya existen (`schema.prisma:550-551`,
`20261031195859_sprint4_manual_constraints/migration.sql:22-25`).

## Decisiones acordadas (05/11/2026)

| Tema | Decisión |
|---|---|
| Reenviar el mismo estado | **No es un cambio.** Conserva el plazo copiado y no se revalida, aunque el estado ya esté dado de baja |
| Estado terminal con ajuste manual que no se toca | `400` sobre `manualDueDate`, salvo que venga `manualDueDate: null` |
| `PATCH` válido sin cambios reales | `200` **sin escribir nada**: ni el acto, ni la trazabilidad, ni la auditoría |
| Auditoría | Una fila `procedural-act.updated`, con `{ caseId, changedFields }` (solo nombres) |
| Nombres de `lastModifiedBy` | De la fila de `users`, la FK. `registeredBy` sigue saliendo de la ficha del abogado |
| Empate de fecha entre actos | Rige el de `id` mayor, como en el registro |
| `POST` sobre causa dada de baja | Fuera de esta HU: `fix/` aparte |
| OpenAPI | Fuera de esta HU: lo actualiza el equipo en otra sesión |
| Rojo | Primero los tests, con esqueletos que lanzan "not implemented" para que fallen por aserción y no por compilación |

## Datos fijos

- Reloj fijo: hoy es el **martes 06/10/2026**, ahora **12:30 en Córdoba**
  (`test/shared/harness/fixed-clock.ts:11`). `lastModifiedAt` sale
  **`"2026-10-06T12:30:00-03:00"`**.
- Escenario: `setUpProceduralActScenario` (causa penal, responsable Ríos, Malena).
- Días hábiles sin feriados (P-02):

| Plazo | Corre desde | Vence |
|---|---|---|
| 5 `BUSINESS` | 30/09/2026 | **07/10/2026** |
| 5 `BUSINESS` | 28/09/2026 | **05/10/2026** |
| 7 `CONSECUTIVE` | 30/09/2026 | **07/10/2026** |

## Respuestas que el contrato fija (textuales)

| Situación | HTTP | `code` | `message` | `details` |
|---|---|---|---|---|
| Éxito | 200 | — | — | `{ data: <acto> }`, el mismo recurso que el `POST` |
| Sin token | 401 | `UNAUTHENTICATED` | "La autenticación es requerida." | `null` |
| No es el responsable actual | 403 | `FORBIDDEN` | "Solo el abogado responsable de la causa puede modificar sus actos procesales." | `null` |
| Causa inexistente o dada de baja | 404 | `CASE_NOT_FOUND` | "No se encontró la causa solicitada." | `null` |
| Acto inexistente o de otra causa | 404 | `PROCEDURAL_ACT_NOT_FOUND` | "No se encontró el acto procesal solicitado." | `null` |
| Causa "Prescripta" | 422 | `CASE_IN_TERMINAL_STATE` | "La causa está prescripta: sus actos procesales no se pueden modificar." | `null` |
| `caseId` no entero | 400 | `INVALID_PATH_PARAMETER` | "El identificador de la causa no es válido." | `{ caseId: "Debe ser un número entero válido." }` |
| `actId` no entero | 400 | `INVALID_PATH_PARAMETER` | "El identificador del acto procesal no es válido." | `{ actId: "Debe ser un número entero válido." }` |
| Datos inválidos | 400 | `VALIDATION_ERROR` | "Los datos enviados no son válidos." | por campo, ver abajo |

`details` de `VALIDATION_ERROR`, **todos juntos** (el ejemplo de `:6087-6088` trae dos campos):

| Campo | Falla | Texto | Origen |
|---|---|---|---|
| `proceduralStateId` | enviado junto con `customState` | "Elegí un estado de la tabla o escribí uno, no las dos cosas." | V5 `:6087` |
| `proceduralStateId` | de otro fuero o "Prescripta" | "El estado procesal no pertenece al fuero de la causa o es el estado Prescripta." | V5 `:5516` |
| `proceduralStateId` | inexistente o dado de baja | "No existe un estado procesal vigente con ese identificador." | el del registro |
| `customState` | coincide con un estado vigente | "Coincide con un estado de la tabla del fuero: elegilo de la lista." | el del registro |
| `customState` | más de 255 | "Debe tener hasta 255 caracteres." | el del registro |
| `actDate` | posterior a hoy | "No puede ser posterior a la fecha de hoy." | el del registro |
| `notificationDate` | fuera de `actDate`–hoy | "Debe estar entre la fecha del acto y hoy." | el del registro |
| `notificationDate` | falta y el estado abre plazo | "Es obligatoria en el fuero administrativo cuando el estado abre plazo (RN6)." | V5 `:5504` |
| `notificationDate` | fuera del administrativo | "Solo se informa en el fuero administrativo." | el del registro |
| `manualDueDate` | anterior a `countsFrom` | "No puede ser anterior a la fecha desde la que corre el plazo." | V5 `:6088` |
| `manualDueDate` | con estado terminal | "Un estado terminal cierra la causa y no admite vencimiento." | el del registro |
| `notes` | más de 2000 | "Debe tener hasta 2000 caracteres." | el del registro |
| `proceduralStateId`, `customState`, `actDate` | `null` | "No puede quedar vacío." | `CaseDataRules` (HU19) |
| `body` | ningún campo | "Debe enviarse al menos un campo para modificar." | HU19 y HU14 |
| otros | campo no admitido | "No es un campo admitido." | pipe global |

**Orden de los chequeos:** 401 → 400 de forma (pipe e ids) → 404 causa o baja → 403 → 404
acto → 422 "Prescripta" → 400 de contenido. El 403 va después del 404 de la causa porque
depende de ella. Un pedido rechazado **no escribe nada**.

## Efectos de un `200`

- El acto queda con los valores nuevos. Un campo omitido no cambia; `notes`,
  `notificationDate` y `manualDueDate` en `null` quedan vacíos.
- `registeredBy` y `registeredAt` no cambian. `lastModifiedBy` y `lastModifiedAt` son los de
  esta modificación.
- **Plazo:** con cambio de estado, `timeLimitDays` y `dayType` de la tabla hoy; sin cambio,
  los copiados. El vencimiento se recalcula con `countsFrom` nuevo. Un ajuste manual no
  tocado se conserva.
- **Causa:** rige el acto de `actDate` mayor y, si empatan, el de `id` mayor. Toma su estado,
  su vencimiento y si es terminal: se cierra o se reabre según corresponda.
- En `audit_log`, una fila en la misma transacción: `action` `procedural-act.updated`,
  `entity_type` `ProceduralAct`, `entity_id` el id del acto, el `actor_user_id` y
  `metadata` `{ caseId, changedFields }`.

## Mapa de criterios

| CA | Qué fija | Unitario | Integración |
|---|---|---|---|
| 28.1 | Éxito | entidad | D1.1 |
| 28.2 | Solo el responsable actual | `Case` | D2.2 |
| 28.3 | Validación del acto resultante; cuerpo vacío | entidad, `Case` | D2.1 |
| 28.4 | Cambia el estado: plazo vigente | `Case`, caso de uso | D3.1 |
| 28.5 | No cambia el estado: plazo copiado | `Case`, caso de uso | D3.2 |
| 28.6 | Ajuste manual | `Case` | D3.3, D2.1 |
| 28.7 | Rige el acto más reciente | `Case` | D4.1 |
| 28.8 | Cierre y reapertura | `Case` | D4.2 |
| 28.9 | "Prescripta" no; otro terminal sí | `CriminalCase` | D2.3, D4.2 |
| 28.10 | Trazabilidad | entidad, mapper HTTP | D1.1, D1.2 |
| 28.11 | Inexistentes e ids | caso de uso | D2.2 |

## Integración — `test/subsystems/cases/update-procedural-act.int.spec.ts`

Archivo nuevo, como `update-case.int.spec.ts` (HU19). Reloj fijo. **10 `it`.** Cada error
verifica que la base no cambió. El 401 va en la lista de `test/smoke/app.int.spec.ts:64`.

**D1 — Modificación y trazabilidad**

1. El responsable corrige `actDate` (30/09 → 28/09) y `notes` (CA-28.1, 28.10). `200` con
   `toEqual` completo: vence 05/10, `registeredBy` y `registeredAt` intactos,
   `lastModifiedBy` del usuario y `lastModifiedAt` fijo. Verifica la base y la fila de auditoría.
2. Las lecturas exponen lo mismo (CA-28.10). El `POST` trae los dos en `null`; después del
   `PATCH`, `GET` del acto, listado y línea de vida traen los valores.

**D2 — Rechazos**

1. `it.each` de `400` con `details` exacto (CA-28.3, 28.6): el ejemplo del contrato con dos
   campos · "Prescripta" como destino · `actDate` futura · `notificationDate` anterior al
   `actDate` nuevo · falta `notificationDate` en administrativo · terminal con ajuste no
   tocado · ajuste anterior a `countsFrom` · cuerpo vacío · `actDate: null`.
2. `it.each` de `403` y `404`, y de ids no enteros (CA-28.2, 28.11): otro abogado ·
   administrador · quien registró y ya no es responsable · acto inexistente · acto de otra
   causa · causa inexistente · causa dada de baja · `caseId` y `actId` no enteros.
3. Causa "Prescripta" → `422` con su texto (CA-28.9).

**D3 — Recálculo del plazo**

1. Cambio de estado (CA-28.4): acto de 5 `BUSINESS` del 30/09; a la tabla del estado nuevo se
   le pone 7 `CONSECUTIVE` antes del `PATCH`. Resultado: `timeLimitDays` 7, vence 07/10.
2. Sin cambio de estado (CA-28.5): la tabla del estado pasa a 20 días; `actDate` al 28/09.
   Resultado: `timeLimitDays` 5, vence 05/10. Reenviar el mismo `proceduralStateId` da igual.
3. Ajuste manual (CA-28.6): sin tocarlo se conserva al mover la fecha; con `null`,
   `dueDate` vuelve al calculado y `manuallyAdjusted` a `false`.

**D4 — Estado de la causa**

1. Rige otro acto (CA-28.7): dos actos; mover el vigente a una fecha anterior al otro pasa la
   causa a ese otro, y corregirlo de vuelta la devuelve. Se mira `GET /cases/{id}`
   (`currentState`) y `current` en la línea de vida.
2. Cierre y reapertura (CA-28.8, 28.9): pasar el acto que rige a "Archivada" cierra la causa
   (`POST` de acto → `422`); corregirlo a otro estado la reabre (`POST` de acto → `201`).

## Unitarios

Solo las reglas y la coordinación; lo que ya cubren `deadline.vo.spec.ts` y
`business-days.spec.ts` no se repite.

**`procedural-act.entity.spec.ts` (se suma)**
1. Aplica los cambios, conserva `registered*` y fija `lastModified*`.
2. `notes` en blanco o `null` queda en `null`; 2001 caracteres → error.
3. Las fechas se validan sobre el acto resultante (`notificationDate` guardada contra `actDate` nueva).
4. Un valor igual no cuenta como cambio: sin cambios no toca la trazabilidad.

**`case-modify-procedural-act.spec.ts` (nuevo)**
1. `it.each` de permisos: responsable sí; otro abogado y administrador no, con el texto del contrato.
2. Criminal prescripta → `422` con su texto; "Archivada" procede.
3. Errores juntos: los dos estados y el ajuste inválido, en un solo `details`.
4. Plazo: estado nuevo usa la tabla; mismo estado o sin estado usa la copia.
5. Terminal: con ajuste no tocado → error; con `manualDueDate: null` → pasa.
6. Administrativo: sin `notificationDate` y con plazo → error; fuera del fuero, informarla → error.
7. Rige el más reciente: gana la fecha mayor y, si empatan, el `id` mayor.
8. Cierra al pasar a terminal y reabre al dejar de serlo.

**`update-procedural-act.use-case.spec.ts` (nuevo)**
1. Orden: 404 causa o baja → 403 → 404 acto → 422 → 400, sin escribir nada en cada rechazo.
2. Éxito: acto, causa y auditoría dentro de la transacción; responde lo que da `GetProceduralAct`.
3. Sin cambios reales: `200` sin guardar ni auditar.
4. Consulta el calculador con el plazo que corresponde y al acto más reciente de los demás.

**`procedural-act-http.mapper.spec.ts` (se suma)**
1. `lastModifiedBy` y `lastModifiedAt` en `null` y con valor, con su desplazamiento horario.

## Prueba manual contra la app real: colección de Postman

Los tests usan reloj fijo y base efímera. Esto comprueba lo mismo de punta a punta, contra el
backend levantado con `make dev-up`, con la fecha real y los usuarios del seed.

**Archivos:** `docs/postman/hu28-modificar-acto-procesal.postman_collection.json` y su
`environment`. No hay ninguna colección previa en el repo.

**Cómo se usa:** se importa en Postman y se corre con el Runner, o sin instalar nada:

```bash
docker run --rm -v "$PWD/docs/postman:/etc/newman" postman/newman run \
  hu28-modificar-acto-procesal.postman_collection.json \
  --env-var baseUrl=http://host.docker.internal:3000/api/v1
```

**No depende de datos previos ni ensucia:** crea su propia causa por API, con fechas relativas
a hoy, y al final la da de baja (RN12). No resetea la base y no cambia la tabla de estados.

| # | Paso | Espera | CA |
|---|---|---|---|
| 1 | Login de `abogado`, otro abogado y un administrador | tokens guardados | — |
| 2 | Crear una causa penal del `abogado` y registrar un acto con plazo | `201`, con `lastModified*` en `null` | 28.10 |
| 3 | `PATCH` de `actDate` y `notes` | `200`; `computedDueDate` igual al de `deadline-preview` | 28.1, 28.5, 28.10 |
| 4 | `PATCH` a otro estado | `200`; plazo de la tabla | 28.4 |
| 5 | `manualDueDate`, mover la fecha y después `null` | se conserva y vuelve al calculado | 28.6 |
| 6 | `400`: dos estados, fecha futura, "Prescripta", cuerpo vacío | `details` exacto | 28.3 |
| 7 | `403`: otro abogado y administrador | texto del contrato | 28.2 |
| 8 | `404` e id no entero | `code` exacto | 28.11 |
| 9 | Segundo acto más reciente y mover fechas | `GET /cases/{id}` cambia de acto | 28.7 |
| 10 | Pasar a "Archivada" y corregirlo | cierra y reabre; `POST` da `422` y `201` | 28.8 |
| 11 | Marcar prescripta y `PATCH` | `422` con su texto | 28.9 |
| 12 | Línea de vida del acto modificado | trae los dos campos y `current` | 28.10 |
| 13 | Dar de baja la causa y `PATCH` | `404 CASE_NOT_FOUND` | 28.11 |

**Lo que Postman no prueba:** que se use el plazo copiado cuando cambió la tabla (CA-28.5),
porque obligaría a tocar la parametría de desarrollo. Eso queda en D3.2.

## Comandos (todo en Docker)

| Qué | Comando |
|---|---|
| Levantar | `make dev-up` (`make dev-build` si cambiaron las dependencias) |
| Chequear tipos | `docker compose -f docker/docker-compose.yaml --env-file docker/.env exec backend npx tsc --noEmit -p tsconfig.json` |
| Unitarios | `make test-unit` |
| Integración de esta HU | `make test-int SUITE=update-procedural-act` |
| Integración completa | `make test-int` |

## Lo que este plan no cubre (revisión manual)

- **Simultaneidad:** dos `PATCH` a la vez sobre actos de la misma causa, o un `PATCH` a la vez
  que se marca la prescripción, se reutiliza `saveCurrentAct` sin escritura condicional (KISS).
  En el peor caso, el puntero al acto vigente queda desactualizado hasta la próxima
  modificación. `flujo-hu-backend.md:57` pide escritura condicional si dos pedidos pueden
  ganar los dos: es un desvío nombrado, no un olvido.
- El formulario "Modificar acto procesal": es del frontend.

## Desvíos conocidos

- Los ejemplos del `POST` (`API_CONTRACT_V5.md:5452-5457`) y `ProceduralAct.yaml` no traen
  `lastModifiedBy` ni `lastModifiedAt`. Manda el texto de `:5276-5280`, y `expectProceduralAct`
  exige los dos campos.
- Al sumarlos, los specs actuales de `POST`, `GET` y línea de vida quedan en rojo hasta el paso
  de adaptadores. Es esperado: hoy no cumplen V5.
- `procedural-act.factory.ts:35-47` deja `registeredAt` con la fecha real, posterior al reloj
  fijo: violaría `ck_procedural_acts_last_modified_after_registered`. Por eso los actos de
  esta suite se preparan con `POST /procedural-acts` (registrado con el mismo reloj fijo) y
  no con la factory, que no se toca.
