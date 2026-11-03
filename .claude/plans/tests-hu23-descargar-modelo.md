# Plan de tests — HU23 Descargar modelo formal

`GET /api/v1/document-templates/{templateId}/file` · contrato
`docs/Api-Contract/API_CONTRACT_V5.md:6865-6950` (§3.10) · D-58, D-90
(`docs/Api-Contract/DECISIONES.md:23`, `:62`).

**Este documento se escribió desde los criterios de aceptación y el contrato, antes del
código.** El endpoint ya existe desde HU35 (`55e65dc`) y la mayoría de los CA ya tienen
test en `backend/test/subsystems/documents/consult-document-templates.int.spec.ts`: se
citan, no se duplican. Solo se agregan los que faltan.

## Respuestas que el contrato fija (textuales)

| Situación | HTTP | `code` | `message` | `details` |
|---|---|---|---|---|
| Éxito | 200 | — | — | cuerpo = el archivo; `Content-Type` `.docx`; `Content-Disposition: attachment; filename="…"` |
| Sin token | 401 | `UNAUTHENTICATED` | "La autenticación es requerida." | `null` |
| `templateId` no entero | 400 | `INVALID_PATH_PARAMETER` | el mismo que `GET /document-templates/{templateId}` | `{ templateId: … }` |
| Secretaría | 403 | `FORBIDDEN` | "Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación." | `null` |
| Inexistente o dado de baja | 404 | `DOCUMENT_TEMPLATE_NOT_FOUND` | "No se encontró el modelo formal solicitado." | `null` |
| Drive no responde | 502 | `DOCUMENT_STORAGE_UNAVAILABLE` | "No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos." | — |

Los errores son JSON (`Content-Type: application/json`) aunque el éxito no lo sea.

## Tabla CA → test

| CA | Test | Dónde | Estado |
|---|---|---|---|
| 23.1 Descarga, `.docx`, `attachment` con nombre | mismo contenido, tipo, largo y nombre con acentos | INT `consult-document-templates.int.spec.ts:201` | existe |
| 23.1 | `Content-Disposition` con respaldo ASCII y `filename*` UTF-8 | unitario `content-disposition.spec.ts` | nuevo |
| 23.1 | el tipo de un modelo es siempre `.docx` | unitario `template-file.vo.spec.ts` | nuevo |
| 23.2 Secretaría 403 (login real) | `/file` con secretaria → 403 y texto exacto | INT `:242` | existe |
| 23.2 | Administrador y Abogado pasan (login real) | INT `:253` | existe |
| 23.2 | la regla de roles, incluido un usuario con varios roles | unitario `document-template.entity.spec.ts` | nuevo |
| 23.3 Inexistente 404 | `/999999/file` → 404 | INT `:229` | existe |
| 23.3 | dado de baja → 404 con el `message` del contrato | INT, en `describe('descarga')` | nuevo |
| 23.4 Drive no responde | 502 y texto exacto | INT `:219` | existe |
| 23.5 Sin `Authorization` | 401 con cuerpo exacto y JSON | INT, en `describe('descarga')` | nuevo (hoy `:262` solo mira el status) |
| 23.6 Id no entero | `/abc/file` → 400 `INVALID_PATH_PARAMETER` sobre `templateId` | INT, en `describe('descarga')` | nuevo |

## Refactor POO (sin cambio de comportamiento)

`assertCanManageTemplates` → `DocumentTemplate.assertCanBeManagedBy`; `contentDisposition`
→ `ContentDisposition`; interfaz `TemplateFile` → value object con `mimeType`. Lo prueban
los specs nuevos de arriba y **todos los specs existentes de `documents` sin cambios**.
