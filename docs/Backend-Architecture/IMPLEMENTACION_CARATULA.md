# Implementación de HU24 — Generar y emitir carátula

Documento vivo. Decisiones, estado de avance y cómo retomar el trabajo desde otra
sesión o computadora. Jira: **VZ-32** (15 SP, épica VZ-4, Sprint 4). Rama: `feat/case-cover`.

Fuentes: `API_CONTRACT_V5.md:4537` (`GET /cases/{caseId}/cover`), `DECISIONES.md`
(D-91, D-93, D-94, D-106), `PENDIENTE_DEFINICION.md` (P-08, resuelto), plan de tests
`.claude/plans/tests-hu24-emitir-caratula.md`.

## Qué hay que construir

`GET /api/v1/cases/{caseId}/cover` devuelve un PDF A4 con el logo del estudio y seis
recuadros (Expte./SAC, Autos, Actor/querellante, Demandado/imputado, Órgano
interviniente, Observaciones). Se genera en cada pedido con los datos vigentes de la
causa; **no se guarda nada y no lleva migración**. Cualquier usuario autenticado.

## Decisiones tomadas

| # | Fecha | Decisión | Motivo |
|---|---|---|---|
| 1 | 29/10/2026 | **P-08, opción B.** `cases` arma los datos de la hoja (`CoverSheet`, regla de partes D-94); `documents` dibuja el PDF. Comunicación síncrona: puerto declarado en `cases` + adaptador en `cases/infrastructure/acl/` que llama a un caso de uso exportado por `documents` (`ARQUITECTURA_BACKEND_V1.md` §6.2) | La HU25 (expediente) necesita la misma generación y ya hay trabajo de PDF asignado a `documents` (`DECISIONES.md:228-233`). Un evento (ADR-005) no devuelve datos |
| 2 | 29/10/2026 | Tratamiento del abogado: `DR.` (antes `DR/DRA.`). Contrato V5, D-106, C-28 y los CA de VZ-32 actualizados | Así figura en las plantillas del estudio |
| 3 | 29/10/2026 | Nombre del abogado en la hoja: **nombre primero** (`DEFENSOR: DR. FERNANDO VAZQUEZ`). El cliente sigue `APELLIDO NOMBRES`. `API_CONTRACT_V5.md:4588` actualizado | Como la plantilla |
| 4 | 29/10/2026 | Observaciones: **siempre vacío** | La hoja la completa el estudio a mano; si quieren un texto predeterminado se agrega después |
| 5 | 29/10/2026 | Órgano interviniente: ~~dos líneas, como el contrato (`court` y `SECRETARIO/A: {instructor}`)~~ (reemplazada por la 10) | Provisional: las plantillas llevan tres (`INSTRUCTOR:` aparte). A confirmar con el estudio |
| 6 | 29/10/2026 | `caseId` que no es un entero: `400 INVALID_PATH_PARAMETER`, como las demás rutas de `/cases/{caseId}` | Coherencia. El contrato del `cover` no lo lista |
| 7 | 29/10/2026 | Librería de PDF: **`@cantoo/pdf-lib` 2.11.1** (instalada en `backend/package.json`) | Sirve a las dos HU: fondo PNG y texto con `maxWidth` (HU24); imágenes a A4 y `copyPages` para unir PDFs (HU25). Mantenida (la `pdf-lib` original no tiene versión desde 05/2022). No convierte Word a PDF: eso lo hace Drive |

| 8 | 30/10/2026 | **Plantilla por fuero se mantiene**, aunque hoy las tres sean la misma imagen. `CoverSheet` guarda el fuero, el adaptador lo traduce al de `documents` y `PdfLibCoverRenderer` elige archivo con `TEMPLATE_BY_JURISDICTION` | Puede cambiar en el futuro: darle hoja propia a un fuero es un archivo nuevo y una línea. Ojo: las coordenadas de los recuadros están medidas sobre la imagen actual |
| 9 | 30/10/2026 | `disposition` inválido: `InvalidCoverDispositionError` (`INVALID_REQUEST`, texto del contrato), validado en el controller, no con `@IsEnum` | El pipe daría `VALIDATION_ERROR`; el contrato pide `INVALID_REQUEST` |
| 10 | 31/10/2026 | Órgano interviniente: **tres líneas** (`court`, `SECRETARIO/A: {instructor}` e `INSTRUCTOR:` en blanco). Contrato V5, D-91 y C-35 actualizados | Se pidió que estén las tres; qué dato va en `INSTRUCTOR:` está abierto (C-35) |

## Hallazgos que condicionan el diseño

- **Las tres plantillas (`Caratula penal.docx`, `Caratula penal QUERELLANTE.docx`,
  `Caratula administrativo.docx`) traen la misma imagen de fondo** (`word/media/image1.png`,
  idéntica byte a byte): logo "VÁZQUEZ · ZÁRATE · STAFF DE ABOGADOS", los seis rótulos y los
  seis recuadros. Se usa como fondo y se escribe el texto encima. Visualmente hay **una sola
  hoja**: lo que cambia por fuero es el texto de Actor y Demandado, no el dibujo. Los rótulos
  del contrato quedan confirmados contra esta imagen.
- Las plantillas originales están en la computadora de mmachuca, en
  `C:\Users\mmachuca\Proyects\Vz causas global\`, **fuera del repo**. La imagen de fondo hay
  que incorporarla al repo (ver "Pendiente").
- `CaseListItem` (`case.repository.ts:79`) ya trae todos los datos de la hoja; `LawyerRef` y
  `ClientRef` (`people-lookup.port.ts:5` y `:13`) traen `lastName` y `firstName`. No hace
  falta una consulta nueva.
- `DocumentsModule` hoy **no exporta nada** (`documents.module.ts:23-28`). Hay que exportar el
  caso de uso de generación y verificar que `CasesModule` importándolo no cree un ciclo.
- `nest-cli.json` **no tiene la clave `assets`**: un PNG guardado en `src/` no se copia a
  `dist/`. Resolver antes de cerrar la actividad 3; pedir permiso antes de tocar esa
  configuración.

## Diseño

| Pieza | Subsistema | Capa |
|---|---|---|
| `CoverSheet`: los seis recuadros y la regla de partes (D-94) | `cases` | `core/domain` (objeto de dominio, no función suelta) |
| Caso de uso `GetCaseCover` | `cases` | `core/application` |
| Puerto `CoverPdfPort` (lo declara el consumidor) | `cases` | `core/domain/ports` |
| Adaptador que llama al caso de uso de `documents` | `cases` | `infrastructure/acl` |
| Caso de uso `GenerateCoverPdf` + puerto de render | `documents` | `core/application` y `core/domain/ports` |
| Dibujo del PDF con `@cantoo/pdf-lib` | `documents` | `infrastructure` |
| Controller `GET :caseId/cover` | `cases` | `infrastructure/http` |

Regla de partes (`API_CONTRACT_V5.md:4581`): penal `QUERELLANTE_PARTICULAR` → Actor =
`QUERELLANTE ({cliente})` + `DEFENSOR: DR. {abogado}`, Demandado vacío; penal `DEFENSA` →
Actor vacío, Demandado = `{cliente}` + `DEFENSOR: DR. {abogado}`; administrativa o amparo con
rol `DEMANDADA` → Actor = contraparte, Demandado = cliente; con otro rol, al revés.

## Plan y estado

| # | Actividad | Estado |
|---|---|---|
| — | Decisiones de diseño y plan de tests (`.claude/plans/tests-hu24-emitir-caratula.md`) | Hecho |
| — | Instalar `@cantoo/pdf-lib` | Hecho (`backend/package.json:27`) |
| 1 | Dominio `CoverSheet` y regla de partes, con sus tests unitarios | Hecho (`cover-sheet.vo.ts`, 14 tests en verde, `tsc` limpio). Sin commitear |
| 2 | Caso de uso `GetCaseCover` y sus tests | Hecho (`get-case-cover.use-case.ts`, puerto `cover-pdf.port.ts`, 4 tests). Sin commitear |
| 3 | Generador en `documents` (librería + PNG de fondo + salida a `dist/`) | Hecho salvo la exportación del módulo (actividad 4): `pdf-lib-cover.renderer.ts`, `generate-cover-pdf.use-case.ts`, PNG en `infrastructure/pdf/assets/`, `assets` en `nest-cli.json`. Sin commitear |
| 4 | Puerto, adaptador ACL, controller y exportación del módulo | Hecho: `documents-cover-pdf.adapter.ts`, `case-cover.controller.ts`, `DocumentsModule` exporta `GenerateCoverPdf`, `CasesModule` lo importa. Compila y los unitarios pasan; **el arranque de la app (ciclo de módulos) no se probó** |
| 5 | Tests de integración (200, 400, 401, 404) | Escritos (`backend/test/subsystems/cases/case-cover.int.spec.ts`), **sin correr**: Docker no estaba levantado |
| 6 | Revisión visual del PDF contra la plantilla y cierre | Pendiente |

## Puntos abiertos

1. Órgano interviniente: ¿dos líneas o tres? Confirmar con el estudio (C-34). Se aísla en una
   sola pieza para poder cambiarlo al final.
2. ~~Texto del `message` de `INVALID_PATH_PARAMETER`~~: ya existe `InvalidCaseIdError` (`case.errors.ts`) y el controller lo reutiliza.
3. Ciclo de módulos `CasesModule` ↔ `DocumentsModule`: `DocumentsModule` solo importa `ClockModule`, así que a simple vista no hay ciclo, pero falta **arrancar la app** para confirmarlo.
4. ~~Imagen de fondo~~: en `documents/infrastructure/pdf/assets/cover-background.png`; `nest-cli.json` la copia a `dist/` (verificado con `nest build`).
5. Actualizar la nota de rótulos "pendientes de confirmar" en el contrato (`:4565`) y el C-34
   de Jira (VZ-32): los rótulos ya están confirmados.
6. Mock del frontend (`handlers.ts:3231` y `:3237`) y prototipo (`Prototipo.dc.html:2861`)
   todavía dicen `DR/DRA.`; `coverName` arma el nombre del abogado de otra forma.
7. ~~Una vez resuelto el orden de la HU25: unir PDFs con `copyPages` es trabajo de esa HU.~~ Hecho en HU25 (03/11/2026): `PdfLibCaseFileComposer` (`documents/infrastructure/pdf/pdf-lib-case-file.composer.ts`) une la carátula y los documentos; la hoja 1 del expediente sale de `CoverSheet.forCaseFile`. Flujo en `docs/support/flujo-hu25-generar-expediente.md`.

## Cómo retomar

1. `git checkout feat/case-cover` y `cd backend && npm install`.
2. Leer este documento y el plan de tests.
3. Empezar por la actividad 1.

## Cómo probar la funcionalidad (cuando esté terminada)

Postman: iniciar sesión para obtener el token; `GET /api/v1/cases/{id}/cover` con el token,
sobre una causa penal. Con `?disposition=attachment` se descarga. Repetir con una causa
administrativa, un id inexistente (404), `?disposition=otra` (400) y `/cases/abc/cover` (400).
Rutas y headers exactos: completar al cerrar la actividad 4.
