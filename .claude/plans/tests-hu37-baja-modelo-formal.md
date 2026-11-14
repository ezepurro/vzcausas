# Plan de tests — HU37 Dar de baja un modelo formal

`DELETE /api/v1/document-templates/{templateId}` · contrato
`docs/Api-Contract/API_CONTRACT_V6.md:8210-8296` (§3.10) · RN12, D-126, D-131, D-139
(`docs/Api-Contract/DECISIONES.md:38`, `:43`, `:51`). HU: `docs/user-stories/HU-37-Registrar_baja_Modelo_Formal.md`.

**Este documento se escribió desde los criterios de aceptación y el contrato, antes del
código.** Cita el contrato **V6** (la V5 de `.claude/CLAUDE.md:14` no tiene HU36/HU37).

## Migración

Una: columna `document_templates.trash_pending BOOLEAN NOT NULL DEFAULT false`
(`migrations/20261113220357_add_trash_pending_doc_template`). Marca los modelos dados de
baja cuyos archivos todavía no se movieron a la Papelera (D-131): el proceso diario los
mueve. **El proceso diario no se escribe en esta HU**; sí `MoveTemplateFilesToTrash`, que
él va a invocar.

## Decisiones acordadas

| Tema | Decisión |
|---|---|
| Orden de chequeos | 401 → 400 (`templateId`) → 403 → 404. Un pedido rechazado no escribe nada. |
| Escritura | `UPDATE … WHERE id AND active = true` devuelve si escribió: dos DELETE a la vez, el segundo da 404. |
| Drive | Complementario. Falla al mover → la baja vale, `trash_pending` queda `true`, se loguea. |
| Qué se mueve | Un archivo por fuero (`document_template_files`) más el principal si es de un modelo anterior a las subcarpetas (sin filas ahí). Sin repetidos. |
| Eventos | Ninguno: CA-37.3 ya lo cumple HU40 filtrando `active`. |
| Auditoría | Ninguna (`documents` no usa `AUDIT_TRAIL`; el contrato no la pide). |

## Respuestas que el contrato fija (textuales)

| Situación | HTTP | `code` | `message` | `details` |
|---|---|---|---|---|
| Éxito | 204 | — | — | sin cuerpo |
| Sin token | 401 | `UNAUTHENTICATED` | "La autenticación es requerida." | `null` (en `smoke/app.int.spec.ts`) |
| `templateId` no entero | 400 | `INVALID_PATH_PARAMETER` | "El identificador del modelo formal no es válido." | `{ templateId: "Debe ser un número entero válido." }` |
| Secretaría | 403 | `FORBIDDEN` | "Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación." | `null` |
| Inexistente o ya dado de baja | 404 | `DOCUMENT_TEMPLATE_NOT_FOUND` | "No se encontró el modelo formal solicitado." | `null` |

## Datos fijos

Modelo "Escrito de apelación" para `CRIMINAL` y `AMPARO` (dos archivos, uno por fuero),
con `createTemplate` de `test/shared/factories/document-template.factory.ts`. Un modelo
anterior a las subcarpetas: solo el archivo principal, sin filas en `document_template_files`.

## Tabla CA → test

| CA | Test | Dónde | Estado |
|---|---|---|---|
| 37.1 Baja lógica | 204 sin cuerpo; la fila sigue con `active=false`; no sale en el listado con ningún filtro; `GET /{id}` y `/file` → 404 | INT `document-templates.int.spec.ts`, `describe('baja')` | nuevo |
| 37.1 | la baja no escribe nada si se rechaza | UNIT `deactivate-document-template.use-case.spec.ts` | nuevo |
| 37.2 Sin reactivación | el modelo de baja no aparece en la lista (ni con marca) | INT, mismo `it` de 37.1 | nuevo |
| 37.3 No se copia a causas nuevas | un modelo de baja no se copia; las copias hechas no se tocan | INT `case-documents-flow.int.spec.ts:149,177` (inactivo no se copia) | existe |
| 37.4 Archivos a la Papelera | cada archivo por fuero queda bajo `/VZ Causas/Papelera`; `trash_pending=false` | INT `describe('baja')` | nuevo |
| 37.4 | qué ids se mueven: uno por fuero, principal si no hay filas, sin repetidos | UNIT `template-stored-files.vo.spec.ts` | nuevo |
| 37.4 | mueve cada archivo, crea Papelera una vez, es idempotente, `markTrashed` solo si todo salió | UNIT `move-template-files-to-trash.use-case.spec.ts` | nuevo |
| 37.4 | Drive falla → 204, `trash_pending=true`, archivos siguen en `Modelos formales` | INT `describe('baja')` + UNIT del caso de uso | nuevo |
| 37.4 | `moveFile` en Drive (`addParents`/`removeParents`) y en memoria | UNIT `google-drive-document-storage.adapter.spec.ts`, `in-memory-document-storage.spec.ts` | nuevo |
| 37.4 | la Papelera compartida con la baja de causa no se duplica | UNIT `recycle-bin.spec.ts` + `recycle-case-folder.use-case.spec.ts` sin cambios de comportamiento | nuevo / existe |
| 37.5 Nombre liberado | registrar otro modelo con el mismo nombre después de la baja → 201 | INT `describe('baja')` | nuevo |
| 37.5 | el índice parcial `document_templates_name_active_key` | ya cubierto por la base | existe |
| 37.6 Perfil no habilitado | secretaría → 403 con texto exacto, base sin cambios | INT `describe('baja: errores')` | nuevo |
| 37.6 | 403 antes que 404 y sin leer el modelo | UNIT del caso de uso | nuevo |
| 37.6 | la regla de roles | `document-template.entity.spec.ts` | existe |
| 37.7 Inexistente o ya de baja | `/999999` y un segundo DELETE → 404 con texto exacto | INT `describe('baja: errores')` | nuevo |
| 37.7 | dos DELETE a la vez: solo uno escribe | UNIT (fake con `deactivate` que devuelve `false`) | nuevo |
| 37.7 `templateId` no entero | `/abc` → 400 `INVALID_PATH_PARAMETER` con `details` exacto | INT `describe('baja: errores')` | nuevo |
| 401 | `delete /api/v1/document-templates/1` sin token | INT `smoke/app.int.spec.ts` | nuevo |

## Límites

Integración en la suite del recurso (`document-templates.int.spec.ts`, README §1.2), **2
`describe` de hasta 3 `it`**. El resto, unitario.

## Estado al cierre (13/11/2026)

Verificado: `npx tsc --noEmit -p tsconfig.json` sin errores · `npm test` 154 suites,
1682 tests en verde · integración, una corrida por grupo: `document-templates` +
`smoke/app` 32/32 y `deactivate-case` 15/15 (toqué `RecycleCaseFolder`).

| CA | Unitario | Integración | Pendiente |
|---|---|---|---|
| 37.1 | `deactivate-document-template.use-case.spec.ts` | `document-templates.int.spec.ts` (baja, 1.º `it`) | — |
| 37.2 | — (lo prueba la integración) | idem: ni con filtro ni con marca | — |
| 37.3 | `copy-templates-to-case-folder.use-case.spec.ts:79` | `case-documents-flow.int.spec.ts:149,177` (no se corrió: no se tocó) | — |
| 37.4 | VO, `MoveTemplateFilesToTrash`, adaptadores Drive y en memoria, `RecycleBin` | baja, 1.º y 2.º `it` (Drive caído y reintento) | el proceso diario real |
| 37.5 | — (lo cubre el índice parcial) | baja, 1.º `it` (se registra de nuevo → 201) | — |
| 37.6 | use case (403 antes que 404, sin escribir) | `describe('…: errores')` | — |
| 37.7 | use case (inexistente, ya de baja, dos a la vez) | `describe('…: errores')` (404 y 400 exactos) | — |
| 401 | — | `smoke/app.int.spec.ts` | — |

**Revisión manual / no verificado:** el movimiento contra Drive **real** (los tests usan el
`InMemoryDocumentStorage` y un cliente de Drive falso; `google-stack.int.spec.ts` no se
tocó ni se corrió). El proceso diario que repite `MoveTemplateFilesToTrash` no existe.
Si un archivo fue borrado a mano en Drive, `moveFile` falla con `CONFIGURATION` y el
modelo queda con `trash_pending = true` para siempre: sin decisión tomada.

## Lo que este plan no cubre

- El proceso diario que lee `trash_pending = true` y llama a `MoveTemplateFilesToTrash`
  (contrato `:10333`): no existe para Drive; se acuerda con quien tenga `deadlines`.
- HU36 (PATCH), que deja archivos pendientes de otra forma (reemplazado, fuero quitado).
- OpenAPI (`docs/openapi/openapi.yaml:321`): fuera de esta HU, como en HU28.
