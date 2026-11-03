# Plan de tests — HU25 Generar y emitir expediente

`POST /api/v1/cases/{caseId}/case-files` · contrato `docs/Api-Contract/API_CONTRACT_V5.md:7657-7902`
· la descarga, `GET …/documents/{documentId}/file`, en `:7578-7653` · decisiones D-92, D-94, D-102 y
D-103 (`DECISIONES.md:25-36`) · punto abierto C-29 (límites), fuera de alcance.

**Este documento se escribió desde los criterios de aceptación y el contrato, antes del
código.** Los tests de integración se escriben leyendo este documento, no la implementación.
Si un test de este plan falla contra el código, el código está mal (o el contrato), no el
test.

Reparto (plan aprobado): `cases` valida la forma del pedido, la causa, la carpeta y la
carátula, y la dibuja por `CoverPdfPort`. `documents` valida los documentos, los convierte,
los une, numera la versión y guarda el resultado (`GenerateCaseFile`, exportado).

## Datos fijos

- **Reloj fijo** (`test/shared/harness/fixed-clock.ts:11`): ahora es **06/10/2026 12:30 en
  Córdoba**. `generatedAt` sale **`"2026-10-06T12:30:00-03:00"`**.
- **Drive**: `InMemoryDocumentStorage`. Su `exportFile` y su `convertToPdf` devuelven un PDF
  real de **1 hoja**. `failNextCallTo(método, error)` hace fallar sólo la lectura o sólo la
  subida.
- **Causa de referencia**: penal, vigente, SAC **`13284571`**, cliente en `DEFENSA`, carpeta
  `CREATED` (`folder-ref`).
- **Usuarios**: `secretaria` (`SECRETARY`, Gestión Estudio), `admin` (sólo `ADMINISTRATOR`,
  Supervisión Estudio) y `abogado` (`LAWYER`, Ríos Malena). `generatedBy` es `{ id, lastName,
  firstName }` de quien genera.
- **Archivos sembrados en `folder-ref`** (`seedFile`):

| # | `id` | `name` | `mimeType` | Hojas al convertir | Convertible |
|---|---|---|---|---|---|
| A | `doc-requerimiento` | `Requerimiento de elevación a juicio.pdf` | `application/pdf` (PDF real de **2** hojas) | 2, tal cual | sí |
| B | `doc-escrito` | `Escrito de defensa` | `application/vnd.google-apps.document` | 1, exportado | sí |
| C | `doc-recurso` | `Recurso de casación.docx` | `…wordprocessingml.document` | 1, convertido por Drive | sí |
| D | `doc-foto` | `Constancia.jpg` | `image/jpeg` (JPG mínimo real) | 1, ajustada a A4 | sí |
| E | `doc-captura` | `Captura.png` | `image/png` (PNG mínimo real) | 1, ajustada a A4 | sí |
| F | `doc-planilla` | `Planilla de gastos` | `application/vnd.google-apps.spreadsheet` | — | **no** |

- **Fuera de la carpeta**: `doc-ajeno` (PDF) en la carpeta de **otra causa**.
- **Expediente anterior**: en los tests que lo piden, un archivo `doc-expediente-previo` en
  `folder-ref` con su fila en `case_files` (versión 1).

### Pedido de referencia y lo que produce

```json
{ "documentIds": ["doc-requerimiento", "doc-escrito", "doc-recurso", "doc-foto"] }
```

- **`pageCount` = 6**: la carátula (1) + A (2) + B (1) + C (1) + D (1).
- **`parts`** exacto:

```json
[
  { "position": 1, "kind": "COVER",    "documentId": null,                "name": "Carátula" },
  { "position": 2, "kind": "DOCUMENT", "documentId": "doc-requerimiento", "name": "Requerimiento de elevación a juicio.pdf" },
  { "position": 3, "kind": "DOCUMENT", "documentId": "doc-escrito",       "name": "Escrito de defensa" },
  { "position": 4, "kind": "DOCUMENT", "documentId": "doc-recurso",       "name": "Recurso de casación.docx" },
  { "position": 5, "kind": "DOCUMENT", "documentId": "doc-foto",          "name": "Constancia.jpg" }
]
```

- **`document.name`**: `Expediente_13284571_v1.pdf`; **`version`**: `1`; **`document.caseFile`**:
  `{ id: <fila>, version: 1 }`; `extension: "pdf"`, `mimeType: "application/pdf"`,
  `convertibleToPdf: true`, `sizeBytes` igual a los bytes guardados.
- El archivo queda en `folder-ref` y la fila en `case_files` con `version 1`, `pageCount 6`,
  `fileName` y el `generatedByUserId` de quien generó.

## Respuestas que el contrato fija (textuales)

| Situación | HTTP | `code` | `message` | `details` |
|---|---|---|---|---|
| Éxito | 201 | — | — | `{ data: { document, version, pageCount, parts, generatedBy, generatedAt } }` (6 claves) |
| Sin token | 401 | `UNAUTHENTICATED` | "La autenticación es requerida." | `null` |
| `caseId` no entero | 400 | `INVALID_PATH_PARAMETER` | "El identificador de la causa no es válido." | `{ caseId: "Debe ser un número entero válido." }` |
| Sin documentos (`[]` o ausente) | 400 | `VALIDATION_ERROR` | "Los datos enviados no son válidos." | `{ documentIds: "Elegí al menos un documento." }` |
| Documentos repetidos | 400 | `VALIDATION_ERROR` | ídem | `{ documentIds: "No puede haber documentos repetidos." }` *(texto propio)* |
| `cover.notes` o `cover.opposingParty` de más de 500 | 400 | `VALIDATION_ERROR` | ídem | `{ "cover.notes": "Debe tener como máximo 500 caracteres." }` *(texto y clave propios)* |
| Causa inexistente o dada de baja | 404 | `CASE_NOT_FOUND` | "No se encontró la causa solicitada." | `null` |
| Carpeta no `CREATED` | 422 | `CASE_FOLDER_NOT_AVAILABLE` | "La causa no tiene su carpeta en Drive creada. Creala antes de generar el expediente." | `null` |
| `opposingParty` fuera del penal | 400 | `VALIDATION_ERROR` | ídem | `{ cover: "La parte de la carátula solo corresponde al fuero penal." }` |
| Documento de otra carpeta, inexistente o expediente anterior | 400 | `VALIDATION_ERROR` | ídem | `{ documentIds: "Un documento no está en la carpeta de la causa o es un expediente anterior." }` |
| Documento no convertible | 422 | `DOCUMENT_NOT_CONVERTIBLE` | "Uno de los documentos no se puede convertir a PDF." | `null` |
| Drive falla al leer o al guardar | 502 | `DOCUMENT_STORAGE_UNAVAILABLE` | "No se pudo generar el expediente porque Drive no respondió. Intentá de nuevo en unos minutos." | `null` |

Los errores de forma se informan **todos juntos** (vacío y un `notes` largo, a la vez).

**Las 6 claves de `data`**: `document, generatedAt, generatedBy, pageCount, parts, version`.
**Las 11 del documento**, las de HU38: `caseFile, convertibleToPdf, createdAt, extension, id,
mimeType, modifiedAt, name, sizeBytes, uploadedBy, url`.

**Orden de los chequeos** (acordado):
1. 401;
2. 400 de forma (`caseId`, `documentIds` vacío o repetido, largos de `cover`);
3. 404 `CASE_NOT_FOUND`;
4. 422 `CASE_FOLDER_NOT_AVAILABLE`;
5. 400 `cover` fuera del penal;
6. 400 `documentIds` fuera de la carpeta o expediente;
7. 422 `DOCUMENT_NOT_CONVERTIBLE`;
8. 502.

El 6 antes que el 7 **se aparta** de `flujo-hu-backend.md` (422 → 400 de contenido): la
convertibilidad de un documento que no está en la carpeta no está definida. Decidido el
03/11/2026.

**Un pedido rechazado no escribe nada**: ni archivo nuevo en la carpeta ni fila en
`case_files`. Se verifica en cada error contando los archivos de `folder-ref` y las filas de
`case_files` antes y después.

## Mapa de criterios

| CA | Qué fija | Cubierto por |
|---|---|---|
| 25.1 | 201, un único PDF, carátula primera y documentos en el orden enviado | INT D1.1 · UNIT `CaseFileComposition` (partes), compositor (orden de hojas) |
| 25.2 | Sin documentos o repetidos → 400 `documentIds` | INT D3.1 · UNIT `CaseFileRequest` |
| 25.3 | Documento de otra carpeta o expediente anterior → 400 | INT D3.2 · UNIT `CaseFileComposition` |
| 25.4 | PDF tal cual; Word y Google convertidos; JPG y PNG una por hoja en A4; otro tipo → 422 | INT D1.1 (A, B, C, D), D2.1 (E), D3.3 · UNIT `CaseDocument.pdfConversion`, compositor (hoja A4), adaptador Drive (`convertToPdf`) |
| 25.5 | `notes` y, en penal, `opposingParty` en su recuadro y en mayúsculas; vacío sin ellos; `opposingParty` fuera del penal → 400; nada se guarda en la causa | INT D2.1, D2.2 · UNIT `CoverSheet.forCaseFile`, `CaseFileRequest` |
| 25.6 | `Expediente_{SAC}_v{n}.pdf` o `Expediente_causa-{id}_v{n}.pdf`; `n` correlativo; las anteriores se conservan; borrar una en Drive no reutiliza su número | INT D1.2 · UNIT `CaseFile.fileNameFor`, `GenerateCaseFile` (versión tomada) |
| 25.7 | Carpeta no `CREATED` → 422 | INT D4.1 · UNIT `GenerateCaseFile` de `cases` |
| 25.8 | Drive falla al leer o al guardar → 502; nada guardado; no se consume la versión | INT D5.1, D5.2 · UNIT `GenerateCaseFile` de `documents` (falla al leer, falla después de subir) |
| 25.9 | La respuesta trae `document`, `version`, `pageCount`, `parts`, `generatedBy`, `generatedAt` | INT D1.1 |
| 25.10 | Cualquier usuario, el administrador sin otro rol incluido, lo descarga (`attachment` por defecto) o lo abre (`inline`) | INT D1.3 · ya cubierto en `consult-case-documents.int.spec.ts` (D3.3, el administrador descarga un expediente) |
| 25.11 | La causa no cambia | INT D1.1 (la causa leída antes y después es igual) |
| 25.12 | Causa inexistente o dada de baja → 404 | INT D4.2 · UNIT `GenerateCaseFile` de `cases` |
| 401 | Sin token | `test/smoke/app.int.spec.ts`: se suma `POST /api/v1/cases/1/case-files` |

## Integración — `test/subsystems/cases/generate-case-file.int.spec.ts`

Reloj fijo. 5 `describe`, 13 `it`. La limpieza borra `case_files` antes que las causas
(FK `Restrict`) y deja vacío el almacenamiento en memoria.

### D1 — Generación (CA-25.1, 25.4, 25.6, 25.9, 25.10, 25.11)

1. **La secretaría genera con el pedido de referencia** (CA-25.1, 25.4, 25.9, 25.11).
   - `201`. Las 6 claves de `data` y las 11 de `document`, exactas.
   - `version: 1`, `pageCount: 6`, `parts` exacto (arriba).
   - `generatedBy` de la secretaría y `generatedAt` `"2026-10-06T12:30:00-03:00"`.
   - `document.name` `Expediente_13284571_v1.pdf` y `caseFile: { id: <fila>, version: 1 }`.
   - En la base: una fila en `case_files` con `version 1`, `pageCount 6`, `fileName`,
     `cloudFileId = document.id` y `generatedByUserId` de la secretaría.
   - En la carpeta: el archivo nuevo, con `application/pdf`, y es un PDF de **6 hojas** (se
     abre con pdf-lib).
   - La causa leída con `GET /cases/{caseId}` antes y después es **igual**.
2. **Las versiones son correlativas y no se reutilizan** (CA-25.6).
   - Se genera dos veces: `version` 1 y 2.
   - Se borra en el fake el archivo de la v2 y se genera de nuevo: `version: 3`, nombre
     `Expediente_13284571_v3.pdf`.
   - En la carpeta siguen la v1 y la v3.
3. **Un administrador sin otro rol genera y descarga su expediente** (CA-25.10, D-103).
   - `201`.
   - `GET …/documents/{document.id}/file?disposition=inline` → `200`, `application/pdf`,
     `Content-Disposition` que empieza con `inline; filename="Expediente_13284571_v1.pdf"`.
   - El cuerpo son los mismos bytes que quedaron en la carpeta.

### D2 — Datos de la carátula (CA-25.5)

1. **Penal con `opposingParty` de dos líneas y `notes`, y una imagen PNG** (CA-25.4, 25.5).
   - Pedido: `{ cover: { opposingParty: "QUERELLANTE: PERALTA Juan Carlos\nAPODERADO: DR. Martín
     Sosa", notes: "Causa conexa en DI T6" }, documentIds: ["doc-captura"] }`.
   - `201`, `pageCount: 2`.
   - La causa no guarda nada de `cover`: sus columnas no cambian.
   - Lo que dice cada recuadro lo fijan los unitarios de `CoverSheet`: el texto dibujado no se
     lee en integración, como en HU24.
2. **`it.each`: un amparo y una causa administrativa con `opposingParty` → 400 `{ cover }`**
   (CA-25.5). Mensaje y `details` exactos. Nada guardado.

### D3 — Documentos elegidos (CA-25.2, 25.3, 25.4)

1. **`it.each`: `documentIds: []`, sin `documentIds` y `["doc-requerimiento",
   "doc-requerimiento"]` → 400** (CA-25.2). `details` exacto de cada caso. Nada guardado.
2. **`it.each`: `doc-ajeno` (otra carpeta), `doc-expediente-previo` (expediente anterior) y
   `no-existe` → 400** (CA-25.3). Cada uno junto con `doc-requerimiento`, válido. `details`
   exacto. Nada guardado.
3. **`doc-planilla` (hoja de cálculo de Google) → 422 `DOCUMENT_NOT_CONVERTIBLE`** (CA-25.4).
   Mensaje textual. Nada guardado.

### D4 — Causa y carpeta (CA-25.7, 25.12)

1. **`it.each`: carpeta `PENDING`, `CREATING`, `ERROR` y sin carpeta (`null`) → 422
   `CASE_FOLDER_NOT_AVAILABLE`** (CA-25.7). Mensaje textual. Nada guardado.
2. **`it.each`: causa inexistente y causa dada de baja → 404 `CASE_NOT_FOUND`** (CA-25.12,
   D-97). Mensaje textual.
3. **`caseId` `abc` → 400 `INVALID_PATH_PARAMETER`**, `details` exacto.

### D5 — Drive no responde (CA-25.8)

1. **Falla al leer un documento** (`failNextCallTo('downloadFile')`) → `502` con el mensaje
   textual. La carpeta no tiene archivos nuevos y `case_files` no tiene filas. Generar de nuevo,
   con Drive bien, da **`version: 1`**: no se consumió el número.
2. **Falla al guardar el resultado** (`failNextCallTo('uploadFile')`) → `502`, lo mismo: nada
   en la carpeta, sin fila, y la siguiente es la v1.

**Total de integración: 13 `it`** (cinco con `it.each`).

## Unitarios (~75 %)

### `documents/core/domain/entities/case-document.entity.spec.ts` (se suma)

1. `it.each` de `pdfConversion`: PDF → `AS_IS`; documento de Google → `EXPORT`; `.doc` y
   `.docx` → `CONVERT`; JPG y PNG → `IMAGE`; uno no convertible → `null`.

### `documents/core/domain/entities/case-file.entity.spec.ts`

1. `fileNameFor`: con SAC → `Expediente_13284571_v2.pdf`; sin SAC →
   `Expediente_causa-7_v1.pdf`.
2. `create` rechaza `version < 1` y `pageCount < 1` (error de programación, no de API).

### `documents/core/domain/value-objects/case-file-composition.vo.spec.ts`

1. Con todos válidos: los documentos en el orden pedido y `parts` con la carátula primero y
   las posiciones desde 1.
2. `it.each`: inexistente, de otra carpeta y expediente anterior → 400 `documentIds` con el
   texto del contrato.
3. Uno no convertible → 422 `DOCUMENT_NOT_CONVERTIBLE`.
4. Uno fuera de la carpeta **y** otro no convertible → gana el 400 (orden acordado).

### `documents/core/application/use-cases/generate-case-file.use-case.spec.ts`

1. Camino feliz: lee cada documento por su vía (`downloadFile`, `exportFile`,
   `convertToPdf`), une en orden (carátula primero), sube **una** vez con el nombre de la
   versión, guarda **una** fila y devuelve `document`, `version`, `pageCount`, `parts`,
   `generatedBy` y `generatedAt` (`now` del reloj).
2. Un 400 o un 422 de la composición → sin ninguna lectura de contenido ni subida.
3. Drive falla al leer → 502 con el mensaje del expediente; nada subido ni guardado.
4. La versión ya estaba tomada (otra generación ganó) → borra el subido y guarda la siguiente.
5. Falla `findFile` del subido → borra el subido, no guarda fila, 502.

### `cases/core/domain/value-objects/case/case-file-request.vo.spec.ts`

1. Válido: los ids en orden, y `notes`/`opposingParty` recortados (en blanco → `null`).
2. `it.each` vacío y ausente → `documentIds` "Elegí al menos un documento."
3. Repetidos → `documentIds` "No puede haber documentos repetidos."
4. `notes` de 501 → `cover.notes`; 500 pasa. Lo mismo `opposingParty`.
5. Varios errores juntos en `details`.

### `cases/core/domain/value-objects/case/cover-sheet.vo.spec.ts` (se suma)

1. `forCaseFile` sin `cover` → la misma hoja que `create`.
2. `notes` → `observations` en mayúsculas, una línea por salto.
3. Penal con cliente `DEFENSA`: `opposingParty` va a `plaintiff`, en mayúsculas y por líneas;
   el `defendant` sigue siendo el cliente.
4. Penal con cliente `QUERELLANTE_PARTICULAR`: `opposingParty` va a `defendant`.
5. `it.each` amparo y administrativo con `opposingParty` → `VALIDATION_ERROR` `{ cover }`.

### `cases/core/application/use-cases/case/generate-case-file.use-case.spec.ts`

1. Pedido inválido → 400 sin leer la causa.
2. Causa inexistente o dada de baja → 404, sin dibujar ni llamar a `documents`.
3. Carpeta no `CREATED` → 422, sin dibujar ni llamar a `documents`.
4. `opposingParty` en un amparo → 400, sin dibujar.
5. Camino feliz: dibuja la carátula con lo de `cover` y le pasa a `documents` la carpeta, el
   SAC, el id de la causa, el PDF de la carátula, los ids en orden y el actor; devuelve su
   resultado.

### Adaptadores

- **`pdf-lib-case-file.composer.spec.ts`**:
  - carátula (1 hoja) + PDF de 2 hojas + JPG → 4 hojas, en ese orden;
  - la hoja de la imagen mide A4 (595,28 × 841,89 pt);
  - un PDF que no se puede abrir → `DOCUMENT_NOT_CONVERTIBLE`.
- **`google-drive-document-storage.adapter.spec.ts`** (se suma): `convertToPdf` copia con
  `mimeType: application/vnd.google-apps.document`, exporta la copia a PDF y la borra; la
  borra también si la exportación falla.
- **`documents-case-documents.adapter.spec.ts`** (se suma): `generateCaseFile` pasa la entrada
  y traduce el resultado campo por campo.

**Total de unitarios: ~35 casos.**

## Lo que este plan no cubre (revisión manual)

- **Drive real**: la conversión de un `.docx` (`files.copy` con conversión, `files.export` y el
  borrado de la copia temporal) y la exportación de un documento de Google. El adaptador se
  prueba contra un cliente simulado.
- **Que la hoja 1 se vea** como la de `GET /cases/{caseId}/cover`, con la parte y las
  observaciones en su recuadro (como en HU24, a ojo).
- **Dos generaciones simultáneas** de la misma causa: el unitario cubre el reintento con la
  versión siguiente; la carrera real contra PostgreSQL no se prueba.
- **C-29**: un expediente muy grande o lento. No hay límite contractual.

## Huecos del contrato que este plan nombra (no se resuelven acá)

1. **Repetidos** en `documentIds`: el contrato los prohíbe pero no da el texto.
2. **Largo de `cover.notes` y `cover.opposingParty`**: no da el texto ni la clave de `details`.
   Se usa la ruta con punto, como `legalQualifications.0.…`.
3. **Orden 400 de documentos / 422 no convertible**: se aparta de la regla general (decidido el
   03/11/2026).

Los tres van a `DECISIONES.md` (lo anota el equipo).
