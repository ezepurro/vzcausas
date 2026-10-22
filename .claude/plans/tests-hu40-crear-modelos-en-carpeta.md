# Plan de tests — HU40 Crear Modelos en Carpeta de Causa

`POST /api/v1/cases` (`copyTemplates`) y `POST /api/v1/cases/{caseId}/folder` · contrato
`docs/Api-Contract/API_CONTRACT_V4.md:3306-3340` (recurso `folder`), `:3344-3705` (alta),
`:4618-4719` (reintento), `:6975-6989` (qué modelos se copian).

**Este documento se escribió desde los criterios de aceptación y el contrato, antes del
código.** Los tests de integración se escriben leyendo este documento, no la
implementación. Si un test falla contra el código, el código está mal (o el contrato).

## Datos fijos

- Fuero `CRIMINAL` (Penal) con **6 modelos** vigentes y `copyToNewCases = true`.
- Distractores: un modelo de `AMPARO`, un modelo `CRIMINAL` con `copyToNewCases = false`
  y un modelo `CRIMINAL` dado de baja (`active = false`). Ninguno se copia (CA-40.5).
- Fuero `ADMINISTRATIVE` sin modelos (CA-40.9).
- Forma de `folder` (contrato `:3575-3581`): claves exactas
  `status, url, path, templatesCopied, templatesPending`.

## Respuestas que el contrato fija

| Situación | `folder` |
|---|---|
| Alta con 6 modelos | `CREATED`, `url`, `path`, `templatesCopied: 6`, `templatesPending: 0` |
| Almacenamiento caído | `ERROR`, `url: null`, `path: null`, `templatesCopied: 0`, `templatesPending: 6` (`:3595-3600`) |
| `createFolder: false` | `PENDING`, `templatesCopied: 0`, `templatesPending: 0` (`:3603`) |
| `copyTemplates: true` con `createFolder: false` | 400 `VALIDATION_ERROR`, `details.copyTemplates` = "Para copiar los modelos primero hay que crear la carpeta de la causa." (ya cubierto, `case-folder.int.spec.ts:133`) |
| Reintento sobre carpeta `CREATED` con pendientes | 200, copia solo los que faltan (`:4638`, `:4647`) |

## CA → test

| CA | Tipo | Test |
|---|---|---|
| 40.1 | Integración | `POST /cases` sin `copyTemplates`: `folder.templatesCopied` = 6, 6 archivos en la carpeta `CASE` del storage, 6 filas `COPIED` |
| 40.2 | Integración | `Object.keys(folder).sort()` igual a la lista del contrato y valores `CREATED`/6/0. El texto "carpeta creada con 6 modelos" lo arma el cliente: sin test de backend |
| 40.3 | Ya cubierto | `case-folder.int.spec.ts:133`. La deshabilitación del check es del frontend |
| 40.4 | Integración + unit | `copyTemplates: false` → `CREATED`, 0 archivos, 0 filas. Unit: `CaseRegistered` sale con `copyTemplates: false` y el caso de uso no se invoca |
| 40.5 | Unit repo + integración | Repo: `registerPending` ignora otro fuero, `copyToNewCases = false` e inactivos y no duplica. Integración: el total es 6 y no 9 |
| 40.6 | Unit storage + integración | `copyFile` clona el contenido: cambiar el original después no altera la copia. Integración: se cambia el contenido del modelo tras la copia y la copia sigue igual |
| 40.7 | Integración + unit | Falla la copia de un modelo → `CREATED`, `templatesCopied: 5`, `templatesPending: 1`. `POST …/folder` → 6/0 y `copyFile` se invoca **una sola vez** más. Unit: tras un fallo sigue con los demás |
| 40.7 (carrera) | Integración | Dos reintentos a la vez → 6 archivos en la carpeta, no 7 |
| 40.8 | Integración | `GET /document-templates/{id}`: `usageCount` 0 → 1; sigue 1 tras reintentar |
| 40.9 | Integración | Fuero sin modelos → `CREATED`, 0/0, carpeta vacía |
| 40.10 | Ya cubierto | `consult-document-templates.int.spec.ts:160` y `:248` |
| — | Integración | Storage caído en el alta → 201, `folder` = `ERROR`, `templatesPending: 6` |
| — | Integración | Reintento sobre carpeta completa → `copyFile` no se invoca |
| — | Unit mapper | `templatesPending` no cuenta copias de modelos dados de baja |

## Límites

Integración: un solo archivo, hasta 5 `describe` de hasta 3 `it` (con `it.each` si hace
falta). Los detalles de reglas van en unitarios.
