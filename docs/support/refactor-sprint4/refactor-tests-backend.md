# Refactor de los tests del backend

Registro de la poda y reorganización de los tests del backend hecha en la rama
`refactor/refactor-backend-tests` (01/11/2026 y 02/11/2026). Son cambios en los
tests y en su documentación, no de comportamiento: el código de producción, la
API, el esquema de la base y los mensajes de error no cambian, y no hay
migración.

Los criterios que salieron de este trabajo, qué va en integración y qué en
unitarios, quedaron en `backend/test/README.md` §1.1 y §1.2. Este documento
cuenta qué se hizo y con qué resultado.

| Fase | Qué                                                                         | Estado |
| ---- | --------------------------------------------------------------------------- | ------ |
| 0    | Base en verde: helper de baja de causas e investigación del cuelgue          | Hecha  |
| 1    | ABMC por recurso: estados procesales, calificaciones y abogados              | Hecha  |
| 2    | `people/clients` y `documents` en tres suites                                | Hecha  |
| 3    | `cases`: consulta, actos procesales, carpeta; se elimina `case-query`        | Hecha  |
| 4    | `deadlines` (solo recorte), `reporting`, smoke + health y unitarios de `shared` | Hecha  |
| 5    | Documentación: README de tests, config de Jest, reglas y referencias        | Hecha  |

## Por qué

La suite tardaba y repetía: **1369 unitarios** y **629 de integración** (311 s)
en 31 suites. La misma regla se probaba hasta en cuatro lugares. Por ejemplo, el
SAC de 8 dígitos estaba en `case.factory.spec` (15 tests), en
`register-case.use-case.spec` (10) y en la integración.

Medido con `jest --json` en el contenedor, de los 311 s de integración:

- **185 s** eran de los tests;
- **126 s** eran de arranque: cada una de las 31 suites levanta `AppModule` entero
  (`test-app.ts:45`), unos 3,3 s. Recortar tests no baja esa parte: la baja
  fusionar suites;
- **30 s** se iban en un único test que se colgaba hasta el timeout.

Además, la base no estaba en verde: **21 de los 629 tests fallaban** por bajas de
causas hechas a mano que no cumplían `ck_cases_deactivation_coherent`.

Objetivo: **~1000 unitarios y ~300 de integración** sin perder cobertura de
contrato, de base, de reglas importantes ni de integraciones.

## Decisiones

- **Si una regla se prueba en el dominio y en el caso de uso, se queda en el
  dominio.** El caso de uso prueba la coordinación y un test de cableado por regla
  (`.claude/rules/flujo-hu-backend.md`, paso 5).
- **Una suite de integración por recurso o por flujo.** Al fusionar, los
  `beforeEach` de cada origen quedan como `describe` anidados.
- **`deadlines` no se fusiona**: sus tres suites solo se recortan. Sus
  `overrideProvider` (reloj fijo, reloj movible, detección falsa) no conviven en
  una app.
- **`register-procedural-act` se fusiona solo con `deadline-preview`**: la
  previsualización anticipa el vencimiento que el alta va a calcular.
- **El 401 sin token va una sola vez**, en `test/smoke/app.int.spec.ts`, que recorre
  la lista de rutas protegidas.
- **Ningún desvío del contrato se fija como esperado en un test**: se nombra y el
  test no lo fija.
- **Antes de borrar un test, se busca el que cubre la misma regla.** Si no existe,
  el test se queda.

## Fase 0 — Base en verde

**Qué cambió.**

- Se agregó `deactivateCase(caseId, byUserId)` en
  `backend/test/shared/factories/case.factory.ts`. Completa los campos que exige
  `ck_cases_deactivation_coherent`.
- Se reemplazaron con ese helper las bajas de causas hechas a mano en los specs.
  Con eso los 21 tests rojos de la base pasan (commit `9995e4e`).
- Se investigó el test que se colgaba (`list-procedural-acts.int.spec.ts`, "muestra
  el acto que llevó la causa a un estado terminal"). Es intermitente y no se
  reprodujo como un bug de producción. Se volvió a ver una vez, en otro test
  (`register-procedural-act.int.spec.ts:104`), y pasó al repetirlo.

## Fase 1 — ABMC por recurso

**Qué cambió.** Cada recurso ABMC quedó en una sola suite, con todos sus endpoints,
sus permisos y su `activeCases`:

| Suite                                          | Antes | Después |
| ---------------------------------------------- | ----- | ------- |
| `legal-parameters/procedural-states.int.spec.ts` | 106   | 35      |
| `legal-parameters/legal-qualifications.int.spec.ts` | 47 | 17      |
| `people/lawyers.int.spec.ts` (**nueva**)        | —     | 10      |

- Lo de abogados que vivía en `clients.int.spec.ts` se mudó a la suite nueva.
- Los `countActiveBy*` de `case-query.int.spec.ts` se mudaron al `activeCases` de
  cada recurso, con un escenario que combina las variantes:
  - el estado inicial cuenta para el abogado y no para ningún estado procesal;
  - una causa en un estado escrito a mano no suma a ningún estado de la tabla;
  - un estado renombrado sigue contando sus causas
    (`procedural-states.int.spec.ts:575`);
  - una calificación dada de baja sigue contando las suyas (RN12).
- Unitarios: `register-procedural-state.use-case.spec` y
  `update-procedural-state.use-case.spec` bajaron de 22 a 8 cada uno. Las reglas
  ya estaban en `procedural-states.spec.ts`, del dominio.

## Fase 2 — Clientes y documentos

| Suite resultante                       | Junta                                                                     | Antes | Después |
| -------------------------------------- | ------------------------------------------------------------------------- | ----- | ------- |
| `people/clients.int.spec.ts`           | solo clientes                                                             | 28    | 14      |
| `documents/document-templates.int.spec.ts` | `consult-document-templates` + `register-document-template`           | 32    | 19      |
| `documents/google-stack.int.spec.ts`   | `google-drive-case-folder` + `google-drive-templates` + `google-oauth-refresh` | 36 | 20      |
| `documents/case-documents-flow.int.spec.ts` | `copy-templates-to-case-folder` + `document-space-event-flow`        | 13    | 9       |

- `google-stack` deja afuera los códigos de error de Google: ya los mapea
  `drive-error.mapper.spec.ts`.
- Unitarios:
  - `google-drive-document-storage.adapter.spec` bajó de 32 a 20;
  - `register-client.use-case.spec`, de 12 a 7;
  - `list-clients.use-case.spec`, de 10 a 3;
  - `assure-space.use-case.spec`, de 25 a 24.

## Fase 3 — `cases`

| Suite resultante                            | Junta                                                       | Antes | Después |
| ------------------------------------------- | ----------------------------------------------------------- | ----- | ------- |
| `cases/consult-cases.int.spec.ts`           | `get-case` + `list-cases` + `case-timeline` + `custom-states` | 60  | 29      |
| `cases/register-procedural-act.int.spec.ts` | `register-procedural-act` + `deadline-preview`              | 67    | 22      |
| `cases/case-folder.int.spec.ts`             | `case-folder` + `case-folder-contract`                      | 36    | 16      |
| `cases/register-case.int.spec.ts`           | —                                                           | 29    | 10      |
| `cases/list-procedural-acts.int.spec.ts`    | —                                                           | 27    | 13      |
| `cases/interruptive-acts.int.spec.ts`       | —                                                           | 35    | 15      |
| `cases/declare-prescription.int.spec.ts`    | —                                                           | 15    | 11      |
| `cases/case-query.int.spec.ts`              | **eliminada**                                               | 31    | 0       |

- **`case-query.int.spec.ts` probaba el repositorio sin pasar por HTTP.** Antes de
  borrarlo se mudó lo que los endpoints no cubrían:
  - a `consult-cases`: el orden por urgencia con el vencimiento manual ganándole
    al calculado (el bug del `COALESCE`), la búsqueda con mayúsculas sí y acentos
    no (CA-20.2), los filtros de estado excluyentes, y el estado inicial con
    `proceduralStateId: null`;
  - a las suites de fase 1: los conteos de `activeCases`.
- **Unitarios:**
  - `register-procedural-act.use-case.spec`: de 80 a 28;
  - `register-case.use-case.spec`: de 71 a 26;
  - `case.factory.spec` (dominio): de 89 a 59. Se consolidaron filas de `it.each`
    de la misma rama, sin perder ninguna regla;
  - `case-http.mapper.spec`: de 30 a 12;
  - `procedural-act-http.mapper.spec`: de 27 a 15;
  - `business-days-deadline-calculator.adapter.spec`: de 17 a 6, porque duplicaba
    `business-days.spec.ts`;
  - `request-case-folder.use-case.spec`: de 24 a 22.
- **El 401** de las rutas de `cases` pasó al bucle del smoke.

## Fase 4 — Deadlines, reporting, smoke y `shared`

| Suite resultante                                   | Junta                                         | Antes | Después |
| -------------------------------------------------- | --------------------------------------------- | ----- | ------- |
| `reporting/dashboards.int.spec.ts`                 | `lawyer-dashboard` + `administrator-dashboard` | 25    | 15      |
| `smoke/app.int.spec.ts`                            | `smoke/app` + `health/health`                 | 5     | 5       |
| `deadlines/detect-upcoming-deadlines.int.spec.ts`  | — (solo recorte)                              | 16    | 12      |
| `deadlines/detect-upcoming-prescriptions.int.spec.ts` | — (solo recorte)                           | 11    | 8       |
| `deadlines/daily-run.int.spec.ts`                  | — (sin cambios)                               | 7     | 7       |

- El smoke suma las rutas de los tableros al bucle del 401. El comentario del 404
  ahora cita `API_CONTRACT_V5.md:8455`; antes citaba V2.
- Unitarios:
  - `get-lawyer-dashboard.use-case.spec`: de 14 a 11. Los fines de semana y la
    calificación que prescribe primero los cubren `business-days.spec.ts:25` y
    `prescription.spec.ts:99` y `:143`;
  - `get-administrator-dashboard.use-case.spec`: de 9 a 8;
  - `detect-upcoming-deadlines.use-case.spec`: de 9 a 6;
  - `detect-upcoming-prescriptions.use-case.spec`: de 8 a 6;
  - `permissions.guard.spec`: de 7 a 5.

## Fase 5 — Documentación

- `backend/test/README.md`:
  - los dos niveles y los criterios de qué va en cada uno (§1.1);
  - una suite por recurso o por flujo (§1.2);
  - el mapa de suites actual;
  - las citas a V5.

  También se quitó la nota que decía que el 404 del smoke estaba en rojo a
  propósito: hoy pasa.
- El comentario de `backend/test/jest-integration.config.ts` cita V5.
- `.claude/rules/flujo-hu-backend.md`, "Límites": criterios y cifras nuevas.
- Referencias a specs que ya no existen, corregidas en:
  - los planes de HU33, HU40 y autosetup de Drive;
  - `IMPLEMENTACION_CALIFICACIONES.md`;
  - `IMPLEMENTACION_DETECCION.md`;
  - `GOOGLE_OAUTH_CLIENTE_COMPARTIDO.md`.

## Resultado

| | Antes | Después |
| --- | --- | --- |
| Unitarios | 1369 | **1135** |
| Unitarios por capa (dominio / casos de uso / infraestructura / otros) | 429 / 613 / 307 / 20 | 399 / 464 / 252 / 20 |
| Integración | 629 (608 en verde) | **290** (288 en verde) |
| Suites de integración | 31 | **20** |
| Tiempo de integración | 311 s | 317 s |

Evolución de la integración por fase: 629 → 519 (fase 1) → 477 (fase 2) → 308
(fase 3) → 290 (fase 4).

- **La cobertura de líneas** de `src/` no cambió de forma relevante (`jest
  --coverage`): dominio 95,5 % → 95,4 %; casos de uso 92,5 %, infraestructura
  34,5 % y otros 42,5 %, iguales. Ningún archivo perdió líneas cubiertas entre la
  fase 3 y la 4.
- **El tiempo de integración no se puede comparar con el de la base.** La máquina
  estuvo más lenta durante el refactor: la mediana por test fue de unos 760 ms,
  contra 287 ms en la corrida base. Con los mismos tests, la fase 3 tardó 370 s y
  la 4, 317 s. La estimación del plan (~155 s) no se pudo confirmar.
- **Quedaron 1135 unitarios, no ~1000.** No se recortó más porque lo que queda
  son reglas de dominio y el cableado de los casos de uso: seguir cortando ya
  perdía cobertura.

## Pendientes y desvíos

**Tests en rojo.** Ninguno viene de este refactor: el código de producción y esas
suites son idénticos al commit `2839c0e`, donde pasaban.

1. **Carrera de producción, sin corregir:** `case-documents-flow.int.spec.ts:221`.
   Con la carpeta en `ERROR`, el alta responde `templatesPending: 0` en lugar de 6
   (CA-39.5). El mecanismo está documentado en
   `docs/Backend-Architecture/ADR-005_EVENTOS_DE_INTEGRACION.md` §7. El arreglo
   lleva su propio plan.
2. **Inestable dentro de la suite completa:** `case-folder.int.spec.ts:152`, "sin
   la estructura del estudio configurada…". Corrido solo pasa; con la suite
   responde `CREATING`, porque armar la estructura no entra en la espera de 300 ms
   del test. Parece TV-03 (`IMPLEMENTACION_DETECCION.md:76`).

**Desvíos del contrato nombrados, sin fijar en ningún test:**

- `totalPages` vale 1 y no 0 para una colección vacía (`pagination.ts:84` contra
  `API_CONTRACT_V5.md:8350`);
- los `details` de `LAWYER_NOT_FOUND`;
- los `details` de `CLIENT_DNI_ALREADY_EXISTS`.

**Sin test:**

- CA-8.8;
- `POST /lawyers` en integración.

**Escenarios que ahora comparten un test**, para revisión manual:

- CA-27.6 con CA-27.8 (estado escrito a mano → terminal);
- CA-31.4 con CA-31.5 (`lastInterruptiveActDate` en `null` porque rige el hecho
  posterior);
- CA-41.7 con CA-41.8 (el acto interruptivo);
- CA-41.7 con CA-41.12 (el acto que se ve apenas se registra).

**Sin investigar:**

- `reporting/dashboards.int.spec.ts` tardó 42 s, de los cuales unos 22 s son de los
  tests.
- El cuelgue intermitente de red de la fase 0.
