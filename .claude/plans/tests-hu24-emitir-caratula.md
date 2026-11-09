# Plan de tests — HU24 Generar y emitir carátula

`GET /api/v1/cases/{caseId}/cover` · contrato `docs/Api-Contract/API_CONTRACT_V5.md:4537-4663`
· decisiones D-91, D-93, D-94, D-106 (revisada el 29/10/2026: `DR.`) · Jira VZ-32 (CA-24.1 a CA-24.11)
· ubicación de la generación: P-08, opción B (`PENDIENTE_DEFINICION.md`).

**Este documento se escribió desde los criterios de aceptación y el contrato, antes del
código.** Los tests de integración se leen de acá, no de la implementación. Si un test de
este plan falla contra el código, el código está mal (o el contrato), no el test.

## Diseño que este plan supone (opción B)

| Pieza | Subsistema | Capa |
|---|---|---|
| Datos de la hoja y regla de partes (`CoverSheet`, D-94) | `cases` | `core/domain` (objeto de dominio, no función suelta) |
| Caso de uso `GetCaseCover` | `cases` | `core/application` |
| Puerto `CoverPdfPort` (declarado por el consumidor) | `cases` | `core/domain/ports` |
| Adaptador que llama al caso de uso de `documents` | `cases` | `infrastructure/acl` |
| Caso de uso `GenerateCoverPdf` + puerto de render | `documents` | `core/application` y `core/domain/ports` |
| Dibujo del PDF con la librería elegida | `documents` | `infrastructure` |
| Controller `GET :caseId/cover` | `cases` | `infrastructure/http` |

Sin migración: no se guarda nada (CA-24.1).

## Datos fijos

Todos los datos de la causa salen de `CaseListItem` (`case.repository.ts:79`), que ya trae
`sacNumber`, `caption`, `court`, `jurisdiction`, `proceduralRole`, `instructorName`,
`counterparty`, `client` y `responsibleLawyer`. `LawyerRef` y `ClientRef`
(`people-lookup.port.ts:5` y `:13`) traen `lastName` y `firstName`: no hace falta una consulta nueva.

Causas de referencia (todas con datos de ejemplo):

| Id de referencia | Fuero | `proceduralRole` | Cliente | Abogado | Notas |
|---|---|---|---|---|---|
| C1 | `CRIMINAL` | `DEFENSA` | SÁNCHEZ Celia | VAZQUEZ Fernando | con SAC `13284571`, con carpeta en Drive |
| C2 | `CRIMINAL` | `QUERELLANTE_PARTICULAR` | GONZÁLEZ María del Pilar | VAZQUEZ Fernando | **sin SAC** |
| C3 | `ADMINISTRATIVE` | `DEMANDADA` | CAJA DE JUBILACIONES | VAZQUEZ Fernando | contraparte `CANDIA, Claro Daniel` |
| C4 | `AMPARO` | otro rol | CANDIA Claro Daniel | VAZQUEZ Fernando | contraparte `CAJA DE JUBILACIONES Y PENSIONES` |
| C5 | `ADMINISTRATIVE` | otro rol | cualquiera | cualquiera | `counterparty` en `null` |
| C6 | `CRIMINAL` | `DEFENSA` | cualquiera | cualquiera | **sin carpeta en Drive** (`folder: null`) |

## Respuestas que el contrato fija (textuales)

| Situación | HTTP | `code` | `message` | `details` |
|---|---|---|---|---|
| Éxito | 200 | — | — | cuerpo: el PDF; `Content-Type: application/pdf` |
| `disposition` inválido | 400 | `INVALID_REQUEST` | "Parámetros de query inválidos." | `{ "disposition": "Debe ser inline o attachment." }` |
| Sin token | 401 | `UNAUTHENTICATED` | "La autenticación es requerida." | `null` |
| Causa inexistente o dada de baja | 404 | `CASE_NOT_FOUND` | "No se encontró la causa solicitada." | `null` |

Cabeceras del `200`:

- `inline` (por defecto): `Content-Disposition: inline; filename="Caratula_13284571.pdf"`.
- `attachment`: `Content-Disposition: attachment; filename="Caratula_13284571.pdf"`.
- Sin SAC: `filename="Caratula_causa-{id}.pdf"`.

**Orden de los chequeos:** 401 → 400 de forma (`disposition`) → 404. No hay 403: cualquier
usuario autenticado puede emitirla (matriz de permisos, HU18 a HU25). Un pedido rechazado no
escribe nada.

## Lo que la hoja muestra (para los unitarios del dominio)

Seis recuadros, en mayúsculas.

| Recuadro | Contenido |
|---|---|
| Expte. / SAC | `sacNumber`; vacío si no tiene |
| Autos | `caption` |
| Actor / querellante | según el fuero y el rol (tabla siguiente) |
| Demandado / imputado | según el fuero y el rol (tabla siguiente) |
| Órgano interviniente | `court` y, en otra línea, `SECRETARIO/A: ` + `instructorName`. Un dato `null` deja la línea con el rótulo solo. **Supuesto provisional, ver puntos abiertos** |
| Observaciones | vacío siempre |

| Fuero y rol | Actor / querellante | Demandado / imputado |
|---|---|---|
| `CRIMINAL`, `QUERELLANTE_PARTICULAR` | `QUERELLANTE ({cliente})` + línea `DEFENSOR: DR. {abogado}` | vacío |
| `CRIMINAL`, `DEFENSA` | vacío | `{cliente}` + línea `DEFENSOR: DR. {abogado}` |
| `ADMINISTRATIVE` o `AMPARO`, rol `DEMANDADA` | `counterparty` | `{cliente}` |
| `ADMINISTRATIVE` o `AMPARO`, otro rol | `{cliente}` | `counterparty` |

`{cliente}` es `APELLIDO NOMBRES`. Un dato `null` deja su parte vacía.

## Mapa de criterios

| CA | Qué fija | Cubierto por |
|---|---|---|
| 24.1 | 200, PDF A4, seis recuadros, mayúsculas, nada se guarda | INT D1.1, D1.4 · UNIT adaptador (PDF, A4) · UNIT `CoverSheet` (mayúsculas) |
| 24.2 | Plantilla por fuero | UNIT `GenerateCoverPdf` (elige plantilla según fuero) · INT D2.1 (los tres fueros dan 200) |
| 24.3 | Recuadros fijos; Observaciones vacío | UNIT `CoverSheet` |
| 24.4 | Penal, `DEFENSA` | UNIT `CoverSheet` (C1) |
| 24.5 | Penal, `QUERELLANTE_PARTICULAR` | UNIT `CoverSheet` (C2) |
| 24.6 | Administrativo y amparo, ambos roles, contraparte vacía | UNIT `CoverSheet` (C3, C4, C5) |
| 24.7 | Prefijo `DR.` | UNIT `CoverSheet` (C1, C2) |
| 24.8 | Sigue a los datos vigentes | UNIT `GetCaseCover` (dos emisiones, dato cambiado en el medio) |
| 24.9 | Sin carpeta en Drive | INT D3.1 (C6) · UNIT `GetCaseCover` |
| 24.10 | `inline` / `attachment` / otro valor; nombre de archivo | INT D1.2, D1.3, D4.2 |
| 24.11 | Inexistente o de baja: 404 | INT D4.3, D4.4 · UNIT `GetCaseCover` |

## Tests unitarios

**`CoverSheet` (dominio de `cases`)** — el grueso de las reglas, para no depender del PDF:

1. U1.1 C1 (penal, `DEFENSA`): Demandado = `SÁNCHEZ CELIA` + `DEFENSOR: DR. FERNANDO VAZQUEZ` (nombre primero); Actor vacío (CA-24.4, 24.7).
2. U1.2 C2 (penal, `QUERELLANTE_PARTICULAR`): Actor = `QUERELLANTE (GONZÁLEZ MARÍA DEL PILAR)` + `DEFENSOR: DR. …`; Demandado vacío (CA-24.5, 24.7).
3. U1.3 C3 (`DEMANDADA`): Actor = contraparte, Demandado = cliente (CA-24.6).
4. U1.4 C4 (otro rol): Actor = cliente, Demandado = contraparte (CA-24.6).
5. U1.5 C5 (contraparte `null`): su parte queda vacía, sin la palabra "null" (CA-24.6).
6. U1.6 SAC `null`: recuadro vacío (CA-24.3). `instructorName` `null`: queda la línea con el rótulo solo (CA-24.3).
7. U1.7 Observaciones siempre vacío (CA-24.3). Todo en mayúsculas (CA-24.1).
8. U1.8 Nombre de archivo: `Caratula_{SAC}.pdf`; sin SAC, `Caratula_causa-{id}.pdf` (CA-24.10).

**`GetCaseCover` (caso de uso, con repositorio y puerto falsos)**:

1. U2.1 Causa inexistente → `CaseNotFoundError` y el puerto no se llama (CA-24.11).
2. U2.2 Causa existente → entrega el `CoverSheet` al puerto y devuelve el PDF y el nombre.
3. U2.3 Dos emisiones con el cliente modificado en el medio → la segunda ya trae el cliente nuevo (CA-24.8).
4. U2.4 `folder: null` no impide emitir (CA-24.9).

**`GenerateCoverPdf` y su adaptador (en `documents`)**:

1. U3.1 La salida empieza con `%PDF-` y tiene una sola página A4 (595 × 842 pt).
2. U3.2 Elige la plantilla penal para `CRIMINAL` y la administrativa para `ADMINISTRATIVE` y `AMPARO` (CA-24.2).

## Tests de integración (hasta 5 `describe` de hasta 3 `it`)

Se usa el arnés existente de `backend/test/` (`EJEMPLO_TEST_INTEGRACION.md`, `backend/test/README.md`).

- **D1 · Emisión (CA-24.1, 24.10)**
  - D1.1 C1 → 200, `Content-Type: application/pdf`, el cuerpo empieza con `%PDF-`.
  - D1.2 Por defecto, `Content-Disposition: inline; filename="Caratula_13284571.pdf"`.
  - D1.3 `?disposition=attachment` → `attachment`. C2 (sin SAC) → `Caratula_causa-{id}.pdf`.
  - D1.4 *(dentro de D1.1)* La base no cambia: mismas filas antes y después.
- **D2 · Fueros (CA-24.2)**
  - D2.1 `it.each` sobre C1, C3 y C4 → los tres devuelven 200 y `%PDF-`.
  - D2.2 Un usuario con rol `SECRETARY` también recibe 200 (cualquier perfil, CA-24.1).
- **D3 · Sin carpeta (CA-24.9)**
  - D3.1 C6 → 200.
- **D4 · Errores (CA-24.10, 24.11)**
  - D4.1 Sin token → 401 `UNAUTHENTICATED`, texto textual.
  - D4.2 `it.each` de 400: `?disposition=otra` → `INVALID_REQUEST`, `message` y `details` textuales; `/cases/abc/cover` → `INVALID_PATH_PARAMETER` con `details: { caseId }`. La base sin cambios.
  - D4.3 Causa inexistente → 404 `CASE_NOT_FOUND`, texto textual.
  - D4.4 Causa dada de baja → 404 `CASE_NOT_FOUND`.

## Qué no se puede automatizar: revisión manual

- **Fidelidad visual contra las plantillas del estudio** (logo, posición y tamaño de los recuadros, tipografía). Un test confirma que hay un PDF A4, no que se vea como la plantilla.
- **El contenido de los recuadros dentro del PDF real** (que el texto quede legible y dentro de su caja) se revisa abriendo el archivo.

## Puntos abiertos (frenan o condicionan; no los resuelvo por mi cuenta)

1. **Órgano interviniente (C-34).** El contrato y el CA-24.3 llevan dos líneas (`court` y `SECRETARIO/A: {instructor}`). Las plantillas del estudio llevan tres (`court`, `SECRETARIO/A:` e `INSTRUCTOR:`) y el nombre del instructor va en la tercera. **Decidido el 29/10/2026: por ahora se sigue el contrato (dos líneas)**; queda para confirmar con el estudio. Se aísla en una sola pieza para cambiarla al final.
2. **Orden del nombre del abogado.** El contrato dice "el apellido y los nombres" y el cliente va como `APELLIDO NOMBRES`. La plantilla muestra al abogado como `DR. FERNANDO VAZQUEZ`, o sea nombre y apellido. **Decidido el 29/10/2026: nombre primero** (`DEFENSOR: DR. FERNANDO VAZQUEZ`), como la plantilla; contrato V5 `:4588` actualizado. El cliente sigue `APELLIDO NOMBRES`.
3. **`caseId` que no es un entero.** Las demás rutas `/cases/{caseId}` responden `400 INVALID_PATH_PARAMETER` (regla de `GET /cases/{caseId}`), pero el contrato del `cover` no lista ese error. **Decidido el 29/10/2026: responde igual que las demás rutas**, `400 INVALID_PATH_PARAMETER` con `details: { caseId }`. Falta el texto exacto del `message` (catálogo §5.3, `API_CONTRACT_V5.md:8433`).
4. **Librería de PDF.** **Decidido el 29/10/2026: `@cantoo/pdf-lib` 2.11.1** (MIT, mantenida; fork de `pdf-lib`). Sirve para las dos HU: fondo PNG y texto con `maxWidth` (HU24), imágenes a A4 y `copyPages` para unir PDFs (HU25). Verificado en los `.d.ts` de ambas versiones: `maxWidth` y `copyPages`. No convierte Word a PDF: eso lo hace Drive (`DECISIONES.md:230`). Si algún día hace falta volver a `pdf-lib` 1.17.1, el cambio es el `import`. La instala el usuario (`npm install`).
5. **Logo del estudio.** La referencia visual es `docs/prototypes/assets/caratula-plantilla.png`; **resuelto el 29/10/2026**: el logo, los seis rótulos y los recuadros son una sola imagen de fondo, `word/media/image1.png`, dentro de cada `.docx` de `Vz causas global`. El PDF puede usarla de fondo y escribir el texto encima. Falta decidir dónde se guarda en el repo y cómo se copia al compilar.
6. **Ciclo de módulos.** `CasesModule` pasaría a importar `DocumentsModule`, que hoy no exporta nada (`documents.module.ts:23-28`). Se verifica que no cree una dependencia circular con los eventos que ya los conectan.

## Al cerrar

La tabla CA → test con su estado, y lo que quedó para revisión manual, según `flujo-hu-backend.md`.
