# Plan de tests — HU36 Modificar un modelo formal

`PATCH /api/v1/document-templates/{templateId}` (`multipart/form-data`) · contrato
`docs/Api-Contract/API_CONTRACT_V6.md:8015-8206` (§3.10) · D-125, D-55, D-139, D-131
(`docs/Api-Contract/DECISIONES.md:37`, `:43`, `:51`). HU: pegada en la conversación (CA-36.1 a CA-36.10).

**Este documento se escribió desde los criterios de aceptación y el contrato, antes del
código.** Cita el contrato **V6**.

## Migración

Una: tabla `template_files_pending_trash` (`cloud_file_id` PK, `template_id` FK, `created_at`).
Guarda los archivos que una modificación dejó sin referencia y falta mover a la Papelera
(D-125). El proceso diario **no se escribe en esta HU**.

## Decisiones acordadas

| Tema | Decisión |
|---|---|
| Orden de chequeos | 401 → 400 path → 403 → 404 → 400 de contenido (también "ningún campo") → 409 → Drive. Un pedido rechazado no escribe ni sube nada. El 413 sale antes (multer), como en el alta. |
| Cuándo se toca Drive | Solo con archivo nuevo o si el **conjunto** de fueros cambia. Nombre o `copyToNewCases` solos no tocan Drive ni `lastVersion*`. |
| Qué va a la Papelera | `archivos referenciados antes − archivos referenciados después`. |
| Modelo anterior a las subcarpetas | Se migra al cambiar archivo o fueros: cada fuero del resultado recibe su copia y el archivo suelto va a la Papelera. |
| Principal | Sigue siendo el archivo del primer fuero en el orden CRIMINAL, ADMINISTRATIVE, AMPARO (D-109). |
| `lastVersionAt` / `lastVersionBy` | Cambian solo al reemplazar el archivo. |
| Drive esencial / complementario | Subir el archivo nuevo y copiar a un fuero que se suma: esencial (502, el modelo no cambia y no quedan archivos sueltos). Mover a la Papelera: complementario (200; el archivo queda en la tabla de pendientes). |
| Concurrencia | Un lock por modelo y `UPDATE … WHERE active = true`; un DELETE en el medio da 404 y se deshacen los archivos subidos. |
| Eventos / auditoría | Ninguno. |
| Cuerpo sin campos | `400 VALIDATION_ERROR`, `details: { body: "Debe enviarse al menos un campo para modificar." }`. El contrato no fija el `details`: mismo criterio que `EmptyUpdateRequestError` (identity). |

## Respuestas que el contrato fija (textuales)

| Situación | HTTP | `code` | `message` | `details` |
|---|---|---|---|---|
| Éxito | 200 | — | — | `{ data: modelo }` con las 9 claves del recurso |
| Sin token | 401 | `UNAUTHENTICATED` | "La autenticación es requerida." | `null` (`smoke/app.int.spec.ts`) |
| `templateId` no entero | 400 | `INVALID_PATH_PARAMETER` | "El identificador del modelo formal no es válido." | `{ templateId: "Debe ser un número entero válido." }` |
| Campo inválido, o ningún campo | 400 | `VALIDATION_ERROR` | "Los datos enviados no son válidos." | por campo: `name`, `jurisdictions`, `file` (o `body`) |
| Secretaría | 403 | `FORBIDDEN` | "Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación." | `null` |
| Inexistente o dado de baja | 404 | `DOCUMENT_TEMPLATE_NOT_FOUND` | "No se encontró el modelo formal solicitado." | `null` |
| Nombre de otro modelo vigente | 409 | `DOCUMENT_TEMPLATE_ALREADY_EXISTS` | "Ya existe un modelo formal con ese nombre." | `null` |
| Archivo de más de 10 MB | 413 | `FILE_TOO_LARGE` | "El archivo supera el tamaño máximo de 10 MB." | `null` |
| Drive no responde | 502 | `DOCUMENT_STORAGE_UNAVAILABLE` | "No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos." | `null` |

## Datos fijos

Modelo "Escrito de apelación" para `CRIMINAL`, registrado por la API (un archivo por
subcarpeta). Un modelo anterior a las subcarpetas: `createTemplate` sin `jurisdictionFolders`
(solo el archivo suelto). Reloj fijo (`FakeClock`, `NOW`) en los unitarios.

## Tabla CA → test

| CA | Test | Dónde | Estado |
|---|---|---|---|
| 36.1 Modificación exitosa | nombre y `copyToNewCases` → 200 con la forma exacta; `lastVersion*` y Drive intactos | INT `document-templates.int.spec.ts`, `describe('PATCH')` | nuevo |
| 36.1 | cada campo por separado, y todos juntos | UNIT `update-document-template.use-case.spec.ts` | nuevo |
| 36.1 Sin ningún campo | 400 `VALIDATION_ERROR`, nada escrito | UNIT use case + entidad; INT `describe('PATCH: errores')` | nuevo |
| 36.2 Fueros como lista | la lista reemplaza a la anterior; vacía, repetida o con un fuero inválido → 400 con el texto del alta | UNIT `document-template.entity.spec.ts`; INT errores | nuevo |
| 36.3 Nombre único | el propio no es conflicto; el de otro vigente (sin mayúsculas) → 409; el de uno dado de baja se acepta; vacío o de más de 150 → 400 | UNIT use case + entidad; INT errores | nuevo |
| 36.4 Reemplazo del archivo | el archivo nuevo en cada subcarpeta de fuero, `fileName` y `lastVersion*` del reemplazo; la descarga entrega el nuevo | INT `describe('PATCH: archivo y fueros')` | nuevo |
| 36.4 | los anteriores, con todas sus copias por fuero, van a la Papelera | UNIT use case; INT archivo y fueros | nuevo |
| 36.5 Formato y tamaño | no `.docx` → 400 `file`; más de 10 MB → 413 `FILE_TOO_LARGE` | UNIT entidad; INT errores (413 ya probado en el alta, se repite para este verbo) | nuevo |
| 36.6 Cambio de fueros | el fuero que se suma recibe copia del archivo vigente; el quitado va a la Papelera; sigue siendo un modelo; el principal pasa al primer fuero del resultado | UNIT use case; INT archivo y fueros | nuevo |
| 36.6 | un modelo anterior a las subcarpetas se migra y su archivo suelto va a la Papelera | UNIT use case | nuevo |
| 36.7 Las causas no cambian | `usageCount` igual y las copias en causas intactas | INT archivo y fueros | nuevo |
| 36.7 | la causa nueva se copia con el archivo y los fueros vigentes | INT `case-documents-flow.int.spec.ts` | nuevo |
| 36.8 Drive no disponible | falla al subir o copiar → 502, el modelo no cambia y no quedan archivos | UNIT use case; INT `describe('PATCH: Drive')` | nuevo |
| 36.8 | falla al mover a la Papelera → 200 y el archivo queda en `template_files_pending_trash` | UNIT use case; INT Drive | nuevo |
| 36.9 Perfil no habilitado | secretaría → 403 con texto exacto, exista o no el modelo, base intacta | UNIT use case; INT errores | nuevo |
| 36.10 Inexistente o de baja | `/999999` y uno dado de baja → 404; `/abc` → 400 `INVALID_PATH_PARAMETER` | UNIT use case; INT errores | nuevo |
| 36.10 | DELETE en el medio (el `UPDATE` no escribe) → 404 y se deshacen los archivos subidos | UNIT use case | nuevo |
| 401 | `patch /api/v1/document-templates/1` sin token | INT `smoke/app.int.spec.ts` | nuevo |

Soporte (sin CA propio): `RecycleBin.moveFiles` (mueve todos, avisa el primer fallo),
`TemplateCloudFiles` (carpetas por fuero, subir y copiar, deshacer) y el alta, que sigue
con todos sus specs sin cambios de comportamiento.

## Límites

Integración en la suite del recurso (`document-templates.int.spec.ts`, README §1.2): **hasta 3
`describe` nuevos de hasta 3 `it`**, más un `it` en `case-documents-flow.int.spec.ts`. Una
corrida por suite con `make test-int SUITE=…`, nunca repetida. El detalle va en unitarios.

## Estado al cierre (14/11/2026)

Verificado: `npx tsc --noEmit -p tsconfig.json` sin errores · `npm test` 155 suites, 1724 tests
en verde · integración, una corrida por grupo: `document-templates` + `smoke/app` 40/40 y
`case-documents-flow` 12/12. Migración aplicada:
`20261114124152_add_template_files_pending_trash`.

| CA | Unitario | Integración | Pendiente |
|---|---|---|---|
| 36.1 | `document-template.entity.spec.ts` (`modify`), `update-document-template.use-case.spec.ts` | `describe('PATCH')` 1.º `it`; `describe('PATCH: errores')` 1.º `it` (sin campos, 400) | — |
| 36.2 | entidad; use case (fueros) | `describe('PATCH')` 3.º `it`; errores 1.º `it` (lista inválida o repetida) | — |
| 36.3 | entidad (150); use case (propio, ajeno, de baja, índice único) | errores 2.º `it` (409 sin mayúsculas, propio y de baja aceptados) | — |
| 36.4 | use case; `template-stored-files.vo.spec.ts` (`unreferencedBy`) | `describe('PATCH')` 2.º `it` (subcarpetas, descarga, `lastVersion*`, Papelera) | — |
| 36.5 | entidad; use case (no sube nada) | errores 1.º `it` (400 `file`, 413) | — |
| 36.6 | use case (suma, quita, primero, modelo anterior) | `describe('PATCH')` 3.º `it` | modelo anterior a las subcarpetas solo en unitario |
| 36.7 | — | `case-documents-flow.int.spec.ts` (causa nueva con el archivo vigente; la anterior conserva su copia; `usageCount`) | — |
| 36.8 | use case (502 sin archivos sueltos, mover falla → vale) | `describe('PATCH: Drive')` (2 `it`) | proceso diario real |
| 36.9 | use case (403 antes que 404) | errores 3.º `it` | — |
| 36.10 | use case (404, baja en el medio); `RecycleBin.moveFiles` | errores 1.º y 3.º `it` (404, 400 de `templateId`) | — |
| 401 | — | `smoke/app.int.spec.ts` | — |

**Revisión manual / no verificado:** el PATCH contra **Drive real** (los tests usan
`InMemoryDocumentStorage` y un Drive falso; `google-stack.int.spec.ts` no se tocó ni se
corrió). El modelo anterior a las subcarpetas no tiene prueba de integración, solo
unitaria. La concurrencia (lock por modelo) se probó dentro de un proceso.

## Lo que este plan no cubre

- El proceso diario que lee `template_files_pending_trash` (y `trash_pending` de HU37) y mueve
  lo pendiente (contrato `:10333`): no existe para Drive.
- Un archivo borrado a mano en Drive: `moveFile` falla con `CONFIGURATION` y su fila queda pendiente.
- Probarlo contra Drive real (los tests usan `InMemoryDocumentStorage` y un Drive falso).
- OpenAPI (`docs/openapi/openapi.yaml:321`).
