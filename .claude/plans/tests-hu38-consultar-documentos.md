# Plan de tests — HU38 Consultar documentos de causa

`GET /api/v1/cases/{caseId}/documents` y `GET /api/v1/cases/{caseId}/documents/{documentId}/file`
· contrato `docs/Api-Contract/API_CONTRACT_V5.md:7386-7653` · decisiones D-100, D-101, D-102, D-103,
C-24, C-27 (`:8024-8028`).

**Este documento se escribió desde los criterios de aceptación y el contrato, antes del
código.** Los tests de integración se escriben leyendo este documento, no la
implementación. Si un test de este plan falla contra el código, el código está mal (o el
contrato), no el test.

Reparto (plan aprobado): el recurso es de `cases` (controller, causa, carpeta) y el
conocimiento de archivos es de `documents` (Drive, `case_files`, `CaseDocument`), que
`cases` usa por un puerto propio y un adaptador ACL.

## Datos fijos

- **Reloj fijo** (`test/shared/harness/fixed-clock.ts:11`): ahora es **06/10/2026 12:30 en
  Córdoba** (`2026-10-06T15:30:00Z`). `readAt` sale **`"2026-10-06T12:30:00-03:00"`**.
- **Drive**: `InMemoryDocumentStorage`, detrás de `SwitchableStorage`
  (`case-folder-scenario.ts:105-116`) para poder "apagarlo" en los 502.
- **Causa de referencia**: penal, vigente, carpeta `CREATED` con `cloudFolderId`
  `folder-ref` y `folderUrl` el que devuelve el fake para esa carpeta.
- **Archivos sembrados en `folder-ref`** (`seedFile`). Fechas en UTC; en la respuesta, con
  offset `-03:00`:

| # | `id` | `name` | `mimeType` | tamaño | `createdTime` (UTC) | `owners[0]` | Observación |
|---|---|---|---|---|---|---|---|
| A | `doc-cedula` | `Cédula de notificación.pdf` | `application/pdf` | 90112 | `2026-09-09T15:15:00Z` | Gestión Estudio | nombre con tildes |
| B | `doc-escrito` | `Escrito de defensa` | `application/vnd.google-apps.document` | — | `2026-09-05T13:00:00Z` | Malena Ríos | nativo, convertible |
| C | `doc-planilla` | `Planilla de gastos` | `application/vnd.google-apps.spreadsheet` | — | `2026-09-01T12:00:00Z` | *(sin dueño)* | nativo, **no** convertible, `uploadedBy: null` |
| D | `doc-expediente` | `Expediente_13284571_v1.pdf` | `application/pdf` | 768000 | `2026-08-20T12:30:00Z` | VZ Causas | fila en `case_files` (versión 1) |

  `modifiedTime` = `createdTime` salvo en A, que vale `2026-09-10T18:00:00Z`
  (`"2026-09-10T15:00:00-03:00"`), para probar que no se confunden.

- **Fuera de la lista** (CA-38.3): una **subcarpeta** `Notas` dentro de `folder-ref`, el archivo
  `doc-borrado` en la **papelera** de `folder-ref`, y `doc-ajeno` en la carpeta `folder-otra`
  de **otra causa**.
- **Fila de `case_files`** insertada con Prisma: `{ caseId: <ref>, version: 1, cloudFileId:
  'doc-expediente', fileName: 'Expediente_13284571_v1.pdf', pageCount: 3, generatedByUserId:
  <admin> }`. Su `id` se lee después de insertar, no se fija.
- **Usuarios**: `admin` (sólo `ADMINISTRATOR`), `abogado` (`LAWYER`), `secretaria` (`SECRETARY`).

## Respuestas que el contrato fija (textuales)

| Situación | HTTP | `code` | `message` | `details` |
|---|---|---|---|---|
| Lista leída | 200 | — | — | `{ data: { folderStatus, folderUrl, readAt, documents } }` |
| Lista con carpeta no creada | 200 | — | — | `documents: []`, `readAt: null` (`:7532-7535`) |
| Descarga | 200 | — | — | cuerpo binario, `Content-Type` del archivo, `Content-Disposition` (`:7617-7621`) |
| Sin token | 401 | `UNAUTHENTICATED` | "La autenticación es requerida." | `null` |
| `caseId` no entero | 400 | `INVALID_PATH_PARAMETER` | "El identificador de la causa no es válido." | `{ caseId: "Debe ser un número entero válido." }` (`case.errors.ts:155-161`) |
| `disposition` inválido | 400 | `INVALID_REQUEST` | "Parámetros de query inválidos." | `{ disposition: "Debe ser inline o attachment." }` *(hueco del contrato: igual que la carátula, `:4627-4638`)* |
| Documento común pedido por quien no es `LAWYER` ni `SECRETARY` | 403 | `FORBIDDEN` | "Se requiere el rol LAWYER o SECRETARY para realizar esta operación." *(texto propio: el contrato no lo da; sigue el patrón y coincide con el mock, `frontend/src/shared/mocks/responses.ts:186`)* | `null` |
| Causa inexistente o dada de baja | 404 | `CASE_NOT_FOUND` | "No se encontró la causa solicitada." | `null` |
| Documento inexistente, en la papelera, de otra carpeta, o carpeta no creada | 404 | `DOCUMENT_NOT_FOUND` | "No se encontró el documento en la carpeta de la causa." | `null` |
| Drive caído al **listar** | 502 | `DOCUMENT_STORAGE_UNAVAILABLE` | "No se pudo leer la carpeta de la causa en Drive. Intentá de nuevo en unos minutos." | `null` |
| Drive caído al **descargar** | 502 | `DOCUMENT_STORAGE_UNAVAILABLE` | "No se pudo descargar el documento de Drive. Intentá de nuevo en unos minutos." | `null` |

Los dos 502 tienen **mensajes distintos**, y ninguno es el genérico de
`DocumentStorageUnavailableError` (`documents.errors.ts:32`). `documents` tiene que
traducir el genérico al de cada operación.

**Las 11 claves del documento** (`:7416-7428`), ordenadas:
`caseFile, convertibleToPdf, createdAt, extension, id, mimeType, modifiedAt, name, sizeBytes,
uploadedBy, url`. **Las 4 claves de `data`**: `documents, folderStatus, folderUrl, readAt`.

**Orden de los chequeos de la descarga**:
1. 401;
2. 400 de forma (`caseId`, `disposition`);
3. 404 `CASE_NOT_FOUND`;
4. carpeta no creada → 404 `DOCUMENT_NOT_FOUND`;
5. 403 si el id es un expediente y el actor no puede, **sin llamar a Drive**;
6. 404 `DOCUMENT_NOT_FOUND`;
7. 502.

`documentId` es opaco (`:7603`): **no tiene 400**; un id con cualquier forma da 404.

Los dos endpoints son de lectura: **un pedido rechazado no escribe nada**, y no hay
escritura que verificar en la base.

## Lista esperada (`200`, causa de referencia)

Ordenada por `createdAt` desc: **A, B, C, D**.

| | `extension` | `sizeBytes` | `createdAt` | `uploadedBy` | `convertibleToPdf` | `caseFile` |
|---|---|---|---|---|---|---|
| A | `"pdf"` | `90112` | `"2026-09-09T12:15:00-03:00"` | `"Gestión Estudio"` | `true` | `null` |
| B | `null` | `null` | `"2026-09-05T10:00:00-03:00"` | `"Malena Ríos"` | `true` | `null` |
| C | `null` | `null` | `"2026-09-01T09:00:00-03:00"` | `null` | `false` | `null` |
| D | `"pdf"` | `768000` | `"2026-08-20T09:30:00-03:00"` | `"VZ Causas"` | `true` | `{ id: <fila>, version: 1 }` |

`mimeType`, `name` y `url` son los que devolvió el fake, sin tocar.

## Mapa de criterios

| CA | Qué fija | Cubierto por |
|---|---|---|
| 38.1 | La lista la ven los tres perfiles, el administrador incluido (C-27, `:8024`) | INT D1.1 |
| 38.2 | Se lee de Drive en cada pedido, no se guarda (D-100) | INT D1.3 |
| 38.3 | Sólo los archivos directos de la carpeta: sin subcarpetas ni papelera; del más reciente al más antiguo | INT D1.2 (alcance) · UNIT `CaseDocumentListing` (orden y desempate) · UNIT adaptador Drive (consulta) |
| 38.4 | Los campos del documento: extensión, tamaño, nativo, `uploadedBy`, `convertibleToPdf`, `caseFile` | INT D1.1 (forma exacta y valores de la tabla) · UNIT `CaseDocument` |
| 38.5 | Carpeta no creada: lista vacía y `readAt: null`, sin leer Drive | INT D2.1 · UNIT `ListCaseDocuments` |
| 38.6 | Drive caído: 502, distinto al listar y al descargar | INT D5.1, D5.2 · UNIT casos de uso de `documents` |
| 38.7 | Descarga por la API; un documento común sólo `LAWYER`/`SECRETARY`; el expediente, cualquiera; nativo → PDF | INT D3.1, D3.2, D3.3 · UNIT `CaseDocument.assertCanBeDownloadedBy`, `DownloadFolderDocument` |
| 38.8 | Documento inexistente, borrado o de otra carpeta: 404 `DOCUMENT_NOT_FOUND` | INT D4.1, D4.3 · UNIT `DownloadFolderDocument` |
| 38.9 | Causa inexistente o dada de baja: 404 `CASE_NOT_FOUND` en los dos endpoints (D-97) | INT D2.2 · UNIT casos de uso de `cases` |
| 401 | Sin token | `test/smoke/app.int.spec.ts`: se suman las dos rutas a la lista (`:57-69`) |

## Integración — `test/subsystems/cases/consult-case-documents.int.spec.ts`

Reloj fijo. 5 `describe`, 14 `it`. `afterEach`/`afterAll` borra las filas de `case_files`
**antes** que las causas (FK `Restrict`); el fake de Drive se vacía y se vuelve a
"encender" entre tests.

### D1 — Lista leída

1. **`it.each`: `admin`, `abogado` y `secretaria` → 200** (CA-38.1, 38.4). Las 4 claves de
   `data` exactas; `folderStatus: "CREATED"`, `folderUrl` el de la carpeta, `readAt`
   `"2026-10-06T12:30:00-03:00"`. `documents` con los ids **en orden A, B, C, D**; cada uno con
   las 11 claves exactas y los valores de la tabla "Lista esperada" (`toEqual` completo de
   A y de D, los demás campo por campo).
2. **Alcance** (CA-38.3). En la misma lista no aparecen la subcarpeta `Notas`, `doc-borrado`
   (papelera) ni `doc-ajeno` (otra carpeta): `documents.map(d => d.id)` es exactamente
   `['doc-cedula', 'doc-escrito', 'doc-planilla', 'doc-expediente']`.
3. **Lectura directa** (CA-38.2). Se pide la lista; en el fake se renombra A a
   `Cédula (firmada).pdf` y se borra C; se vuelve a pedir: A trae el nombre nuevo y C no está.
   Ninguna tabla de la base cambió (no hay tabla de documentos).

### D2 — Causa y carpeta

1. **`it.each`: carpeta `PENDING`, `CREATING`, `ERROR` y sin carpeta (`null`) → 200 sin leer
   Drive** (CA-38.5). **Drive apagado** durante el pedido: si se lo consultara, sería 502.
   `data` es `{ folderStatus: <el estado o null>, folderUrl: null, readAt: null, documents: [] }`
   (`toEqual`).
2. **`it.each`: causa inexistente y causa dada de baja → 404 `CASE_NOT_FOUND`**, en la lista
   **y** en la descarga de `doc-cedula` (CA-38.9, D-97). Mensaje textual.
3. **`caseId` `abc` → 400 `INVALID_PATH_PARAMETER`**, con `details` exacto, en la lista.

### D3 — Descarga

1. **El abogado descarga A sin `disposition`** (CA-38.7). 200; `Content-Type:
   application/pdf`; `Content-Disposition` empieza con
   `attachment; filename="Cedula de notificacion.pdf"` (valor por defecto, `:7609`) y trae
   `filename*=UTF-8''C%C3%A9dula%20de%20notificaci%C3%B3n.pdf`; el cuerpo son los bytes sembrados.
2. **La secretaría descarga B con `disposition=inline`: un nativo sale en PDF** (CA-38.7,
   `:7595`). 200; `Content-Type: application/pdf`; `Content-Disposition` empieza con
   `inline; filename="Escrito de defensa.pdf"`; el cuerpo es lo que el fake devuelve al exportar.
3. **El `admin` descarga D (expediente) → 200, y A (común) → 403 `FORBIDDEN` con Drive
   apagado** (CA-38.7, D-103). Mensaje textual. Que dé 403 y no 502 con Drive apagado prueba
   que el permiso se decide sin llamar a Drive.

### D4 — Descarga rechazada

1. **`it.each`: `doc-ajeno` (otra carpeta), `doc-borrado` (papelera) y `no-existe` → 404
   `DOCUMENT_NOT_FOUND`**, pedidos por el abogado (CA-38.8). Mensaje textual.
2. **`disposition=download` → 400 `INVALID_REQUEST`**, `details` exacto.
3. **Carpeta `PENDING` → 404 `DOCUMENT_NOT_FOUND` para `doc-cedula`** (CA-38.5, 38.8).

### D5 — Drive no responde

1. **Lista con Drive apagado → 502** con el mensaje de lectura (CA-38.6).
2. **Descarga de A por el abogado con Drive apagado → 502** con el mensaje de descarga,
   distinto del anterior (CA-38.6).

**Total de integración: 14 `it`** (cuatro con `it.each`).

## Unitarios (~75 %)

### `documents/core/domain/entities/case-document.entity.spec.ts`

1. `extension`: `Cédula.PDF` → `"pdf"`; `foto.jpeg` → `"jpeg"`; `Notas` (sin punto) → `null`;
   `archivo.` → `null`; un nativo, aunque su nombre tenga punto (`Informe v2.1`) → `null`.
2. `sizeBytes`: el de Drive en un archivo común; `null` en un nativo.
3. `it.each` `convertibleToPdf` (D-102): `application/pdf`, `application/msword`,
   `…wordprocessingml.document`, `application/vnd.google-apps.document`, `image/jpeg` e
   `image/png` → `true`; `application/vnd.google-apps.spreadsheet`, `text/plain`,
   `application/zip` → `false`.
4. `isGoogleNative`: `application/vnd.google-apps.*` sí; `application/pdf` no.
5. `isIn(folderId)`: verdadero si el id está entre sus padres; falso si no.
6. `downloadName` y tipo de descarga: un común conserva nombre y `mimeType`; un nativo pasa a
   `<name>.pdf` y `application/pdf`.
7. `caseFile`: `{ id, version }` si se construyó con su fila; `null` si no.
8. `assertCanBeDownloadedBy`: un expediente → los tres roles pasan; un común → `LAWYER` y
   `SECRETARY` pasan, `ADMINISTRATOR` solo → `FORBIDDEN` con el mensaje de arriba;
   `ADMINISTRATOR` + `LAWYER` pasa.

### `cases/core/domain/value-objects/…/case-document-listing.vo.spec.ts`

1. `notRead(folder)`: `readAt: null`, `documents: []`, conserva `folderStatus` y `folderUrl`
   (`null` si la carpeta no existe).
2. `read(...)`: ordena por `createdAt` desc y pone `readAt`.
3. Dos documentos con el mismo `createdAt` → desempate por `id` ascendente *(regla propia:
   el contrato no fija desempate)*.
4. `read` no reordena la lista recibida en el lugar (no muta la entrada).

### `documents/…/use-cases/list-folder-documents.use-case.spec.ts`

1. Marca como expediente sólo los archivos con fila en `case_files` (`caseFile` con su `id` y
   `version`).
2. Drive falla (`DocumentStorageUnavailableError`) → error con el mensaje **de lectura**.

### `documents/…/use-cases/download-folder-document.use-case.spec.ts`

1. Admin + documento común → 403 **sin ninguna llamada al storage**.
2. Admin + expediente → descarga.
3. `findFile` devuelve `null` → `DOCUMENT_NOT_FOUND`.
4. Archivo de otra carpeta → `DOCUMENT_NOT_FOUND`, sin descargarlo.
5. Nativo → `exportFile(id, 'application/pdf')`, nombre `<name>.pdf`; común → `downloadFile`.
6. Drive falla al descargar → error con el mensaje **de descarga**.

### `cases/…/use-cases/list-case-documents.use-case.spec.ts`

1. Causa inexistente o dada de baja → `CASE_NOT_FOUND`, sin llamar al puerto.
2. `it.each` carpeta no `CREATED` y sin carpeta → `notRead`, sin llamar al puerto.
3. Carpeta creada → llama al puerto con su `cloudFolderId` y `readAt` es `clock.now()`.

### `cases/…/use-cases/download-case-document.use-case.spec.ts`

1. Causa inexistente → `CASE_NOT_FOUND`, sin llamar al puerto.
2. Carpeta no `CREATED` → `DOCUMENT_NOT_FOUND`, sin llamar al puerto.
3. Carpeta creada → pasa al puerto `cloudFolderId`, `documentId` y el actor, y devuelve su
   resultado sin cambios.

### Adaptadores

- `cases/infrastructure/acl/documents-case-documents.adapter.spec.ts`: traduce el resultado de
  `documents` al tipo de `cases`, campo por campo (como `documents-cover-pdf.adapter.spec.ts`).
- `google-drive-document-storage.adapter.spec.ts`:
  - `listFiles` pide `'<id>' in parents and trashed=false and
    mimeType!='application/vnd.google-apps.folder'` con los campos acordados y recorre dos páginas
    de `nextPageToken`;
  - `findFile` con 404 de Drive → `null`; con `trashed: true` → `null`;
  - `exportFile` pide el `mimeType` recibido.
- `shared/infrastructure/http/content-disposition.spec.ts`: `inline` y `attachment`; nombre con
  tildes → `filename` ASCII + `filename*` UTF-8; comillas y barras fuera del `filename`.

**Total de unitarios: ~40 casos.**

## Lo que este plan no cubre (revisión manual)

- **Drive real**: la consulta con `drive.readonly` (C-24) después de la reautorización
  (`npm run google:authorize`), `owners[0].displayName` real y la exportación real de un
  nativo a PDF. El adaptador se prueba contra un cliente simulado.
- **Archivos grandes**: la descarga carga el archivo entero en memoria (`Buffer`), como las
  plantillas. Un PDF de cientos de MB no se prueba.

## Huecos del contrato que este plan nombra (no se resuelven acá)

1. **403 de la descarga sin texto**: `:7623-7625` remite "como en el listado", y el listado no
   tiene 403. Se usa "Se requiere el rol LAWYER o SECRETARY para realizar esta operación.".
2. **`disposition` inválido** sin respuesta en §3.12: se copia la de la carátula.
3. **Desempate del orden** por `createdAt` no está fijado: `id` ascendente.
4. Glosario sin `Document`, `uploadedBy`, `convertibleToPdf` (`DECISIONES.md:258-260`).

Los cuatro van a `DECISIONES.md` (lo anota el equipo).
