# Plan de tests — Estructura base de Drive automática (`feature/autosetup`)

Sin endpoint nuevo ni cambio de contrato. Decisiones de mmachuca (22/10/2026): opción C
(arranque + perezosa + mutex), CA-34.11 se cambia (la subida de modelos también autocura
`Modelos formales`), `drive.file` se mantiene (ADR-003 §2.6): la raíz la crea siempre la app.

**Escrito antes del código.** Los de integración se escriben desde esta tabla.

## Reglas nuevas

| # | Regla | Dónde |
|---|---|---|
| R1 | Si falta `ROOT_CASES`, `AssureSpace` corre `SetupCloudStorage` y sigue; la carpeta de la causa sale `CREATED` | `AssureSpace` |
| R2 | Si tras el setup `ROOT_CASES` sigue sin estar, `StudioRootNotConfiguredError` (`CONFIGURATION`) | `AssureSpace` |
| R3 | Si el setup falla por Drive, el flujo normal: `DocumentSpaceCreationFailed` con la razón de la falla y el error se relanza | `AssureSpace` |
| R4 | Con la estructura completa, `AssureSpace` y la subida **no** llaman al setup ni a Drive de más | ambos |
| R5 | Si falta `TEMPLATES`, `RegisterDocumentTemplate` corre el setup y sube el modelo (cambio de CA-34.11); si el setup falla por Drive, 502 y no sube nada | `RegisterDocumentTemplate` |
| R6 | Dos `execute()` simultáneos de `SetupCloudStorage` crean una sola vez cada carpeta | `SetupCloudStorage` |
| R7 | Si el setup **crea** `MAIN` (no la adopta ni existe), loguea WARN: una carpeta manual homónima no es visible con `drive.file` | `SetupCloudStorage` |
| R8 | `StorageStructureBrokenError` sigue siendo error: no se recrea una carpeta guardada y borrada en Drive | `SetupCloudStorage` / `AssureSpace` |
| R9 | `StorageBootstrap` corre el setup al arrancar; **no** tira si falla (loguea); no hace nada con `InMemoryDocumentStorage` ni con `DOCUMENTS_AUTO_SETUP=false` | `StorageBootstrap` |

## Tabla regla → test

| Regla | Tipo | Archivo | Estado |
|---|---|---|---|
| R1 | unitario | `assure-space.use-case.spec.ts` | hecho (verde) |
| R2 | unitario | `assure-space.use-case.spec.ts` (setup que no deja `ROOT_CASES`, p. ej. repositorio que no guarda) | hecho (verde) |
| R3 | unitario | `assure-space.use-case.spec.ts` | hecho (verde) |
| R4 | unitario | `assure-space.use-case.spec.ts` (los existentes con `aSetUpStudio` ya lo cubren: `storage.calls` sin llamadas extra) + `register-document-template.use-case.spec.ts` | hecho (verde) |
| R5 | unitario | `register-document-template.use-case.spec.ts` (reemplaza el test "responde 502" de CA-34.11) | hecho (verde) |
| R5 | integración | `document-templates.int.spec.ts:220` (antes `register-document-template.int.spec.ts`; reemplaza el 502 de CA-34.11: sin fila `TEMPLATES` → 201 y fila recreada) | hecho (verde) |
| R1 | integración | `case-folder.int.spec.ts:152` (el de `google-drive-case-folder.int.spec.ts` se dejó en la poda del 01/11/2026: duplicaba este): sin estructura → registrar causa → carpeta `CREATED` y 3 filas en `cloud_folders` | hecho (verde) |
| R6 | unitario | `setup-cloud-storage.use-case.spec.ts` | hecho (verde) |
| R7 | unitario | `setup-cloud-storage.use-case.spec.ts` (espía `Logger.prototype.warn`; ADOPTED no avisa) | hecho (verde) |
| R8 | unitario | `setup-cloud-storage.use-case.spec.ts` (ya existe) + `assure-space.use-case.spec.ts` | hecho (verde) |
| R9 | unitario | `storage-bootstrap.spec.ts` (nuevo) | hecho (verde) |

Tests existentes que fijan "sin estructura ⇒ `ERROR`" (`clearCloudFolders` en
`case-folder.int.spec.ts`, `register-case.int.spec.ts`, `google-drive-case-folder.int.spec.ts`; este último hoy es `documents/google-stack.int.spec.ts`)
se revisan **contra el comportamiento nuevo**: no se fija ningún desvío.

## Queda para revisión manual
Drive real: con base vacía y credenciales, ver las 3 carpetas creadas al arrancar; una carpeta
`VZ Causas` manual no se adopta (WARN); `drive.file` y el mismo `GOOGLE_OAUTH_CLIENT_ID`.
