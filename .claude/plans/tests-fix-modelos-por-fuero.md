# Plan de tests — Fix: modelos formales en subcarpetas por fuero

`POST /api/v1/document-templates` (HU34) · `POST /api/v1/cases` con `copyTemplates` y `POST /api/v1/cases/{caseId}/folder` (HU40)
· contrato `docs/Api-Contract/API_CONTRACT_V5.md:6463-6692` (§3.10, alta) y `:8245-8262` (carpeta de la causa)
· decisiones D-55 (un modelo de varios fueros es un solo registro con un solo archivo), D-60/D-83/D-104 (Drive no hace fallar el negocio)
· `docs/Backend-Architecture/ADR-003_GOOGLE_DRIVE.md` §2.2, §2.4, §2.5 y §2.6.

**Este documento se escribió desde el contrato y el plan acordado, antes del código.** Los tests se escriben leyendo este documento, no la
implementación. Si un test falla contra el código, el código está mal (o el contrato), no el test.

## Qué cambia y qué no

- **El contrato V5 no cambia**: mismos endpoints, campos y códigos. La forma del recurso modelo formal es exactamente la de `:6480-6492`
  (9 claves: `id, name, jurisdictions, fileName, copyToNewCases, lastVersionAt, lastVersionBy, usageCount, active`). Lo que cambia es **dónde guarda
  los archivos el backend**, que el contrato no expone (`:6512` solo dice `/VZ Causas/Modelos formales`).
- Estructura nueva en la nube: `VZ Causas/Modelos formales/{Penal | Administrativo | Amparo}`. Cada subcarpeta es una fila `JURISDICTION` con `lawyer_id NULL`
  en `cloud_folders` (índice único `cloud_folders_one_template_jurisdiction_key`, ya existente).
- Tabla nueva `document_template_files`: una fila por (modelo, fuero) con el archivo de ese fuero. `document_templates.cloud_file_id` / `cloud_folder_id` siguen siendo
  el archivo **principal** (el del primer fuero en el orden `CRIMINAL, ADMINISTRATIVE, AMPARO`): lo que sirve la descarga (CA-35.6).
- **Sin cambios de comportamiento**: lecturas (`GET /document-templates`, `/{id}`, `/{id}/file`), permisos (CA-34.8, CA-35.8), validaciones (CA-34.3, 34.4), nombre repetido (D-71).
  Ya los cubren `document-templates.int.spec.ts`; solo se ajustan sus fixtures.

## Datos fijos

- Reloj fijo de integración (`test/shared/harness/fixed-clock.ts`) donde el resultado dependa de la hora (`lastVersionAt` del alta).
- Rótulos de subcarpeta (iguales a `cases/.../jurisdiction-folder-label.ts:8`): `CRIMINAL` → `Penal`, `ADMINISTRATIVE` → `Administrativo`, `AMPARO` → `Amparo`.
- Archivo `.docx` válido de `test/shared/factories/` ya usado por la suite; contenido distinguible para verificar que las copias son idénticas.
- Modelo de referencia 1: un fuero (`["CRIMINAL"]`). Modelo de referencia 2: dos fueros (`["CRIMINAL","AMPARO"]`). Modelo de referencia 3: los tres.

## Respuestas que el contrato fija (textuales)

| Situación | HTTP | `code` | `message` | `details` |
|---|---|---|---|---|
| Alta correcta | 201 | — | — | `{ data: <modelo> }`, 9 claves de `:6480-6492` |
| Almacenamiento no disponible (subida, copia a otra subcarpeta o armado de la estructura) | 502 | `DOCUMENT_STORAGE_UNAVAILABLE` | "No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos." | `null` |
| Nombre repetido | 409 | `DOCUMENT_TEMPLATE_ALREADY_EXISTS` | "Ya existe un modelo formal con ese nombre." | `null` |
| Datos inválidos | 400 | `VALIDATION_ERROR` | "Los datos enviados no son válidos." | por campo (`:6611-6615`) |

**Orden de los chequeos** (sin cambios): 401 → 400 de forma → 403 → 400 de contenido → 409 nombre repetido → **recién después se toca la nube**. Un pedido rechazado
**no sube ni copia nada** y **no escribe en la base**.

## Mapa de criterios

| CA | Qué fija | Tipo | Cubierto por |
|---|---|---|---|
| 34.1 | El modelo queda vigente y en el listado | Integración | `document-templates.int.spec.ts` (ya cubierto; se ajusta el fixture de carpetas) |
| 34.2 | Un modelo de varios fueros es **un solo modelo** (D-55) | Integración + unit repo | INT F2: `GET /document-templates/{id}` devuelve un solo recurso con `jurisdictions` completo, y el listado sin filtro lo muestra **una vez**; con `jurisdiction=AMPARO` también aparece |
| 34.6 | `lastVersionBy` y `lastVersionAt` del alta | Integración | Ya cubierto (`document-templates.int.spec.ts:123`); no se repite |
| 34.7 | Alta **atómica**: si el almacenamiento falla, no hay modelo y responde 502 | Unit + integración | UNIT R4, R5, R6 · INT F4 |
| 34.11 | (cambio 22/10/2026) Si falta la estructura, el alta la arma sola y responde 201 | Unit + integración | UNIT R7 · INT F3 (ahora incluye las subcarpetas) |
| 34.5 | Las causas ya existentes no reciben el modelo | — | Sin cambio ni test nuevo (ya cubierto en el flujo de HU40) |
| 35.6 | La descarga devuelve el contenido del archivo | Integración | INT F2: `GET /{id}/file` devuelve los bytes subidos también en un modelo de varios fueros (sirve el principal) |
| 40.1, 40.5 | A la causa se copian los modelos vigentes de su fuero con `copyToNewCases` | Integración | `case-documents-flow.int.spec.ts` (ya cubierto; se ajusta el fixture para que los modelos vivan en la subcarpeta de su fuero) |
| 40.6 | Cada causa conserva la versión con que se abrió; la copia es independiente | Integración | Ya cubierto; se mantiene con la copia hecha **desde el archivo del fuero** |
| 40.7 | Reintento: solo lo que falta, sin repetidos | Unit | UNIT C1–C3 (la fuente del archivo cambió; la regla no) |
| — (nuevo) | HU40 copia desde el archivo del **fuero de la causa**; sin fila para el fuero (modelo anterior al fix) cae al archivo principal | Unit + integración | UNIT C1, C2 · INT F5 |

## Pruebas unitarias (lo esencial; el detalle de reglas vive en cada spec)

### `setup-cloud-storage.use-case.spec.ts`

| # | Caso | Verifica |
|---|---|---|
| S1 | Base vacía | Crea `VZ Causas`, `Modelos formales`, `Causas` y **tres** subcarpetas `Penal`, `Administrativo`, `Amparo` con padre `Modelos formales`; filas `JURISDICTION` con `lawyerId: null` y el `jurisdictionId` de cada fuero; reporte con `outcome: 'CREATED'` |
| S2 | Segunda corrida | Todo `EXISTING`; no se llama a `createFolder` |
| S3 | Entorno existente (estructura base ya guardada, sin subcarpetas) | Solo crea las tres subcarpetas; las tres base quedan `EXISTING` |
| S4 | Subcarpeta guardada pero borrada de la nube | `StorageStructureBrokenError` con el nombre de la subcarpeta |
| S5 | Subcarpeta que existe en la nube sin fila (huérfana) | La adopta (`ADOPTED`), no crea otra |
| S6 | Falla el guardado de una subcarpeta recién creada | Se borra esa carpeta de la nube (`deleteFolder`) |

### `register-document-template.use-case.spec.ts`

| # | Caso | Verifica |
|---|---|---|
| R1 | Un fuero | `uploadFile` una sola vez, en la subcarpeta de ese fuero; **cero** `copyFile`; `save` con una ubicación |
| R2 | Dos fueros | `uploadFile` en la subcarpeta del primero (orden `CRIMINAL, ADMINISTRATIVE, AMPARO`), `copyFile` desde ese archivo a la del segundo; `save` con dos ubicaciones y la primera es la principal |
| R3 | Tres fueros ("Todos los fueros") | Un `uploadFile` y dos `copyFile`; tres ubicaciones |
| R4 | Falla `copyFile` del segundo fuero | `DocumentStorageUnavailableError`; se borra el archivo ya subido (`deleteFile`); **no se llama a `save`** |
| R5 | Falla `copyFile` del tercero | Se borran el subido y la primera copia; no se guarda |
| R6 | Falla `save` después de subir y copiar | Se borran **todos** los archivos creados; se relanza el error original |
| R7 | Faltan las subcarpetas | Llama a `SetupCloudStorage` una vez, relee y sube; si siguen faltando → `DocumentStorageUnavailableError('CONFIGURATION', …)` |
| R8 | Nombre repetido / datos inválidos | No toca la nube (ya cubierto; se agrega la aserción de que `uploadFile` y `copyFile` no se llamaron) |

### `copy-templates-to-case-folder.use-case.spec.ts` (+ `fake-template-copy.repository.ts`)

| # | Caso | Verifica |
|---|---|---|
| C1 | Causa penal; el modelo tiene archivo propio del fuero | `copyFile` copia **ese** `cloudFileId` (no el principal) a la carpeta de la causa |
| C2 | Modelo anterior al fix (sin fila por fuero) | Copia el archivo principal |
| C3 | Reintento sin `jurisdictionId` en el comando | El fuero se resuelve por la carpeta `CASE` (`folders.findById(cloudFolderId).jurisdictionId`); copia lo pendiente, una vez |
| C4 | Un modelo falla | Sigue con los demás y queda `PENDING` (comportamiento actual, sin regresión) |

### Repositorios (Prisma, dentro de integración; ver abajo)

El detalle de `findJurisdictionIds`, de `save` con ubicaciones y de `findPending` con fuero se prueba contra la base real en INT; los fakes
se cubren indirectamente con los unitarios de arriba.

## Pruebas de integración (hasta 5 `describe` de hasta 3 `it`; se escriben desde este documento)

Se amplían las suites existentes de recurso (`document-templates.int.spec.ts`, `case-documents-flow.int.spec.ts`); no se crea una suite nueva.
Fixtures: `cloud-structure.factory.ts` siembra también las tres subcarpetas; `document-template.factory.ts` recibe la carpeta del fuero.

| # | Suite | Caso | Verifica |
|---|---|---|---|
| F1 | `document-templates` | Alta de un fuero | 201 con las 9 claves exactas; el archivo está en la **subcarpeta** del fuero (no en `Modelos formales` a secas); `document_templates.cloud_folder_id` = esa subcarpeta; una fila en `document_template_files` |
| F2 | `document-templates` | Alta de dos fueros (`CRIMINAL`, `AMPARO`) | Un solo registro; un archivo en `Penal` y otro en `Amparo`, **bytes idénticos**; dos filas en `document_template_files` con `cloud_file_id` distintos; `cloud_file_id` del modelo = el de `Penal`; listado sin filtro lo devuelve una vez; `GET /{id}/file` baja los bytes originales (CA-34.2, CA-35.6) |
| F3 | `document-templates` | Sin estructura en la base (CA-34.11) | 201; `cloud_folders` queda con `MAIN, ROOT_CASES, TEMPLATES` y las **tres** `JURISDICTION` de modelos; el archivo en la subcarpeta correcta |
| F4 | `document-templates` | Storage falla al copiar al segundo fuero (CA-34.7) | 502 con `code` y `message` textuales; `document_templates`, `document_template_jurisdictions` y `document_template_files` **sin cambios**; no queda ningún archivo en las subcarpetas (estado leído antes y después) |
| F5 | `case-documents-flow` | Alta de causa penal con modelos que viven en `Penal` | `templatesCopied` igual a la cantidad de modelos vigentes del fuero; los archivos copiados están en la carpeta `CASE`; un modelo con fila de otro fuero y un modelo viejo sin filas también se copian bien (CA-40.1, CA-40.5) |

Variantes de F1/F2 con `it.each` sobre los fueros (`CRIMINAL`, `ADMINISTRATIVE`, `AMPARO`) para cubrir los tres rótulos de carpeta.

Ajustes sin caso nuevo: `google-stack.int.spec.ts:283` (la subida reanudable ahora cae en la subcarpeta del fuero) y `case-folder.int.spec.ts:159`
(la lista de `kind` no cambia, pero se revisa porque `JURISDICTION` ya aparece).

## Lo que queda para revisión manual (no se puede probar en CI)

- Corrida real contra Google Drive: `make setup-storage` crea las tres subcarpetas bajo `Modelos formales` y la segunda corrida las encuentra (`EXISTING`).
- Alta real de un modelo de dos fueros y verificación visual en Drive de que está en las dos subcarpetas.
- Los rótulos de subcarpeta están duplicados entre `cases` y `documents` (no pueden importarse entre subsistemas): nada en CI avisa si se desalinean.
- Modelos cargados antes del fix siguen en `Modelos formales`, sin subcarpeta (decidido: se dejan).
