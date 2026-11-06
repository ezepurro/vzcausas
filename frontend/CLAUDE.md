# CLAUDE.md — Frontend de VZ Causas

Sistema de gestión para un estudio jurídico. Este archivo dice **cómo se trabaja
adentro de un módulo** (`src/features/<módulo>/`), **qué está hecho y qué falta
en el sprint en curso**. El resto ya está documentado: no lo repito, leelo.

Estado al **05/11/2026** (Sprint 4). Las pantallas del sprint están hechas,
todas (HU14, HU19, HU21, HU23, HU24, HU25, HU28 y HU38), y sus tests en verde:
ver [Sprint 4](#sprint-4--qué-está-hecho-y-dónde). Después del sprint se sumó
la revisión de V5 del 05/11/2026 (matrícula opcional y documento del cliente)
y la del 06/11/2026 (dirección y teléfono del cliente obligatorios, D-109):
ver [Revisión de V5 del 05/11/2026](#revisión-de-v5-del-05112026).

## Antes de escribir código, leé

1. `docs/Frontend-Architecture/ESTRUCTURA.md` — el mapa general, las tres reglas entre
   carpetas, los nombres y qué épica corresponde a qué módulo.
2. `docs/Frontend-Architecture/SHARED.md` — todos los componentes compartidos, el
   cliente HTTP y `ApiError`. Tiene la tabla "Si necesitás X, usá Y" y su propia
   guía para Claude al final.
3. `frontend/src/shared/mocks/README.md` — **antes de escribir cualquier
   llamada a la API**. El mock implementa V5 entero (revisión del 05/11/2026).
   Ahí están los usuarios de prueba y qué puede cada perfil, qué causa semilla
   sirve para probar cada regla, cómo disparar cada error y cómo agregar un
   endpoint. El resumen está en [Los mocks](#los-mocks), más abajo.
4. `docs/Api-Contract/API_CONTRACT_V5.md` — la fuente de verdad del backend.
   Es autocontenido: trae lo de los Sprints 1 a 3 que sigue vigente y lo nuevo
   del Sprint 4. **Última revisión: 06/11/2026** (D-107, D-108 y D-109). Las decisiones (D-xx), los
   puntos abiertos (C-xx) y lo que queda fuera del contrato están en
   `docs/Api-Contract/DECISIONES.md`. V2, V3 y V4 quedan como registro: ninguno
   es referencia vigente. Si un documento y el contrato no coinciden, manda el
   contrato. La otra fuente de verdad es el prototipo (`docs/prototypes/`): de
   ahí salen las pantallas y sus textos. Lo que el prototipo muestra y el
   contrato deja fuera (`DECISIONES.md` §3) no se programa.
5. `docs/Frontend-Architecture/TESTING.md` — dónde va cada test y qué mínimo
   tiene que tener una feature. La §11 lista los tests de los Sprints 3 y 4 y
   los nombres que fijan.
6. `docs/Frontend-Architecture/MATRIZ_CA.md` — qué test cubre cada criterio de
   aceptación. Se genera con `npm run ca-matrix`: no se edita a mano.

## Reglas que no se negocian

- **No inventes endpoints.** Si lo que te piden necesita un endpoint que no está
  en el contrato, frená y preguntá. V5 cubre `auth`, `users`, `lawyers`,
  `procedural-states`, `legal-qualifications`, `clients`, `cases` (con su
  modificación y su baja, `cover`, `timeline`, `prescription`, `folder`,
  `documents` y `case-files`), `cases/{caseId}/procedural-acts` (con su
  modificación), `cases/{caseId}/interruptive-acts`, `document-templates` y
  `dashboards`, y nada más. Los avisos por correo (HU30, HU32, HU51, HU52) son
  un proceso del servidor: **no tienen endpoint ni pantalla**. "Herramientas"
  (HU53) no usa ninguno: su catálogo es fijo y vive en el front.
- **No programes lo que el contrato deja afuera.** `DECISIONES.md` §3 lista lo
  que el prototipo muestra pero es de otra historia: anular un acto (HU29),
  modificar y dar de baja modelos (HU36, HU37), modificar y dar de baja
  clientes (HU10, HU11), eliminar abogado con reasignación (HU15), reportes
  (HU43, HU44), registrar el pago de tasa, adjuntar cédulas, la campana de
  notificaciones, la pantalla "Vencimientos", "Olvidé mi contraseña", etc. No
  se dibuja ni deshabilitado: no existe hasta su sprint. (Hoy hay dos
  excepciones en el rail que violan esta regla: ver
  [Problemas conocidos](#problemas-conocidos).)
- **No traigas código de otros proyectos** (componentes, estilos, hooks). Este
  proyecto tiene su propio sistema de diseño en `shared/` y `styles/`.
- **No mezcles patrones.** Si ya existe una forma de hacer algo, seguila.
- **No uses `react-hook-form` ni instales `zod`.** `react-hook-form` está
  instalado pero nadie lo usa, y `zod` no está instalado. Es una decisión
  pendiente del equipo. Hasta entonces, formularios controlados como
  `FormModal` (`values` + `onChange`).
- **Si el build o el lint fallan por algo que no tocaste, avisá.** No lo
  arregles al paso.
- **Código en inglés** (archivos, tipos, funciones, props, clases CSS).
  **Textos de pantalla y comentarios en castellano**, con el vocabulario del
  estudio: causa, fuero, SAC, carátula, acto procesal. Ver `ESTRUCTURA.md` §8 y
  `docs/TRADUCCION_DOMINIO.md`.
- **Imports siempre con el alias `@`**, nunca con `../../..` para salir del
  módulo.
- **Toda pantalla es responsive** (RNF). Armada con los componentes y las
  clases de `shared` ya lo es: no fijes anchos en píxeles ni agregues cortes
  propios. Los cortes y qué hace cada uno están en `SHARED.md`, "Breakpoints
  reales"; una tabla nueva marca su columna `primary`.

## Stack instalado

React 19 + TypeScript + Vite · React Router · TanStack Query · axios (sólo a
través de `http`) · MSW (sólo para los mocks) · CSS global con clases `vz-*` y
tokens `var(--vz-*)` · lint con **oxlint** · Vitest + Testing Library ·
Playwright para los E2E.

---

## Sprint 4 — qué está hecho y dónde

Alcance según V5 (D-87): HU 14, 19, 21, 23, 24, 25, 28 y 38. Sprint "VZ
Sprint 4" de Jira (25/10/2026 – 06/11/2026); los criterios de aceptación de
cada historia están en su issue.

**Las pantallas del sprint están hechas, todas, y sus tests en verde**
(`TESTING.md` §11, "Sprint 4"; los tests se escribieron antes que las
pantallas). Los mocks implementan todo V5. Del backend todavía falta
`PATCH /cases/{caseId}/procedural-acts/{actId}` (HU28): esa pantalla sólo
anda contra el mock. `POST /cases/{caseId}/case-files` (HU25) ya está en el
backend (al 05/11/2026).

**"Documentación" (HU-38)**, decisiones del 28/10/2026: con la carpeta sin
crear dice "La carpeta de la causa todavía no está creada en Drive." y no se
pide la lista; "Abrir carpeta en Drive" queda sólo en `CaseFolderCard` (si se
repite, rompe `CaseDetailPage.folder.test.tsx`); un documento sin
`uploadedBy` no muestra autor. La lista no reintenta: con Drive caído el aviso
sale en el momento. Desde el 03/11/2026 cada documento suma "Descargar", por la
API, que no está en el prototipo (`cases/CAMBIOS.md`).

| HU | Qué | Endpoint | Módulo | Estado y tests |
|---|---|---|---|---|
| 14 | Modificar abogado: acción "Modificar" en cada fila, sólo el Administrador | `PATCH /lawyers/{lawyerId}` | `lawyers/` | **Hecha** (Ezequiel Purro). `LawyerFormModal` con `mode`, `useUpdateLawyer`, `buildLawyerPatch` y `lawyers.update` en `ACTION_ACCESS`. Cambiar el nombre invalida toda la caché: las causas, los usuarios y los tableros lo nombran (CA-14.2). Tests: `components/lawyers/LawyersPage.edit.test.tsx`, `unit/lawyers/buildLawyerPatch.test.ts` |
| 19 | Modificar causa: botón "Modificar causa" del detalle, cualquier perfil. El fuero no se modifica (D-95); al cambiar el cliente se propone la carátula y viaja en `caption` (D-105) | `PATCH /cases/{caseId}` | `cases/` | **Hecha** (Facundo Fiorani). `CaseEditForm` en un diálogo, orquestado por `useCaseEdit` (lo comparte con "Generar expediente"); manda sólo lo cambiado (`buildCasePatch`) con `useUpdateCase`. Tests: `components/cases/CaseDetailPage.edit.test.tsx`, `unit/cases/caseForm.test.ts` |
| 21 | Dar de baja la causa: botón "Dar de baja" del detalle, con motivo opcional; vuelve al listado | `DELETE /cases/{caseId}` | `cases/` | **Hecha** (Facundo Fiorani). `DeleteCaseModal`, `useDeleteCase` y `toDeleteCaseBody`. Tests: `components/cases/CaseDetailPage.delete.test.tsx` |
| 23 | Descargar modelo formal (D-90) | `GET /document-templates/{templateId}/file` | `documents/` | **Hecha** con HU35: `components/documents/DocumentTemplatesPage.test.tsx` |
| 24 | Emitir la carátula en PDF: vista previa en "Generar expediente" e imprimirla suelta | `GET /cases/{caseId}/cover` | `cases/` | **Hecha** con HU25 (Luciano Cipolla). "Vista previa" en "Generar expediente" (`CoverPreviewModal`, `useCaseCover`): muestra el PDF del servidor como la hoja del prototipo, sin dibujarla en el front (D-94, `cases/CAMBIOS.md`). Funciona sin carpeta (CA-24.9). Tests: `components/cases/GenerateCaseFilePage.test.tsx` |
| 25 | Generar expediente: página propia, carátula + documentos elegidos en orden, en un PDF | `POST /cases/{caseId}/case-files`, `GET …/documents/{documentId}/file` | `cases/` | **Hecha** (Luciano Cipolla). `GenerateCaseFilePage` en `/causas/:caseId/expediente`, desde "Generar expediente" de la fila "Sobre la causa" del detalle, en todos los fueros. Orden arrastrando o con ↑↓; un documento no convertible no se incluye; sin carpeta, "Generar PDF" deshabilitado; "Descargar" e "Imprimir" del expediente (`useDownloadCaseDocument`, `printFile`). "Modificá los datos de la causa" abre "Modificar causa" ahí mismo (`useCaseEdit`, compartido con el detalle). Decisiones en `cases/CAMBIOS.md`. Tests: `components/cases/GenerateCaseFilePage.test.tsx`, `components/cases/CaseDetailPage.caseFile.test.tsx`, `unit/cases/caseFile.test.ts`, `unit/cases/caseFile.schema.test.ts` |
| 28 | Modificar acto procesal: "Modificar" en un acto de la línea de vida, sólo el responsable actual. Es `RegisterProceduralActPage` en `/causas/:caseId/acto/:actId`, con el título "Modificar acto procesal" | `PATCH /cases/{caseId}/procedural-acts/{actId}` | `proceedings/` | **Hecha** (Ezequiel Purro). Precarga con `GET …/procedural-acts/{actId}` (`useProceduralAct`, `toActFormValues`); manda sólo lo cambiado (`buildProceduralActPatch`). Mientras no cambien el estado ni las fechas, "Cómputo del plazo" muestra el plazo guardado del acto (D-98), no `deadline-preview`. La línea de vida suma "Modificar" y "Modificado por…"; en una causa prescripta no lo ofrece (`cases/CAMBIOS.md`). Tests: `components/proceedings/RegisterProceduralActPage.edit.test.tsx`, `unit/proceedings/buildProceduralActPatch.test.ts` |
| 38 | Tarjeta "Documentación" del detalle: lee la carpeta en Drive; "Abrir" lleva a Drive y "Descargar" lo baja por la API (`cases.downloadDocument`) | `GET /cases/{caseId}/documents`, `GET …/documents/{documentId}/file` | `cases/` | **Hecha** (Facundo Fiorani). `CaseDocumentsCard`, con `useCaseDocuments` y, para "Descargar" (03/11/2026), `useDownloadCaseDocument` y `documentDownloadName`. Tests: `components/cases/CaseDetailPage.documents.test.tsx`, `unit/cases/caseDocument.test.ts`, `unit/app/actionAccess.test.ts` |

**"Modificar causa" (HU-19) se arma igual que el alta** (decisión del
28/10/2026; los cambios al prototipo se pidieron a Claude Design). Donde el
diálogo `modificarCausa` del prototipo difiere del alta, manda el alta:

- el rol procesal es un `SegmentedControl`, no un select;
- el objeto lleva un rótulo por fuero, "Objeto del reclamo" o "Objeto del
  amparo", con el placeholder del alta;
- en un amparo, con la fecha del acto lesivo se piden los mismos datos que en
  el alta: "Plazo para presentar el amparo" (días y tipo de día), "El acto
  lesivo se renueva" y "Se renueva cada". El prototipo sólo trae la fecha.

Una excepción, que manda el contrato: el campo `court` se llama "Órgano
interviniente" (V5 §3.7, D-91), como en el prototipo. Ahí el atrasado es el
alta (ver [Problemas conocidos](#problemas-conocidos), punto 5).

El formulario es un componente propio (`CaseEditForm`) que reusa las piezas
del alta (`LegalQualificationPicker`, los datos del amparo), `validateCase`,
`changeSacNumber` y `toFormErrors`. Las decisiones de qué viaja en el `PATCH`
están en `TESTING.md` §11, "Decisiones de HU-19 y HU-38".

**Lo que sumó el sprint fuera de las pantallas:**

- **Tipos.** `lastModifiedBy` y `lastModifiedAt` en el acto procesal (HU28);
  el documento (`CaseDocument`), la respuesta de la lista y la del expediente
  (`cases/types/caseDocument.ts`, `caseFile.ts`). Salen de V5 §3.12, no de
  `shared/mocks/contract.ts`.
- **`ACTION_ACCESS`.** `lawyers.update` para "Modificar" abogado, sólo
  `ADMINISTRATOR` (CA-14.6), y `cases.downloadDocument` para "Descargar" un
  documento, `LAWYER` y `SECRETARY` (D-103), cada una con su caso en
  `unit/app/actionAccess.test.ts`. Modificar y dar de baja una causa no se
  declaran: son de los tres perfiles. Modificar un acto no es un permiso por
  rol: se resuelve con `isResponsibleLawyer`.
- **Rutas.** "Generar expediente" (`/causas/:caseId/expediente`, HU25) y
  "Modificar acto procesal" (`/causas/:caseId/acto/:actId`, HU28).
- **Descargas.** La carátula y los documentos son descargas binarias con
  `disposition` (`inline` para ver e imprimir, `attachment` para guardar):
  la carátula con `useCaseCover`, los documentos con `useDownloadCaseDocument`
  (que guarda con `saveFile` o imprime con `printFile`, de `shared/lib`). Un documento que no es un expediente sólo lo descargan
  `LAWYER` y `SECRETARY` (D-103); el expediente, cualquiera.

---

## Sprint 3 — qué está hecho y dónde

Alcance según V4 (D-45): HU 27, 30, 31, 32, 33, 34, 35, 39, 40, 41, 42, 51 y
52. El resumen por historia está en V4 §9. HU53 (Herramientas) está en el
sprint de Jira pero no en el contrato: no pide nada al servidor.

| HU | Qué | Módulo | Frontend | Estado en el front |
|---|---|---|---|---|
| 27 | Línea de vida de la causa: actos procesales, actos interruptivos y pase a "Prescripta", intercalados por fecha | `cases/` | Ezequiel Purro | **Hecha.** Panel "Ciclo de vida de la causa" (`CaseTimeline`) del detalle, con `GET /cases/{caseId}/timeline` (D-85): sin paginar y ya intercalada; el front no ordena. `casesKeys.timeline(id)` cuelga de `detail(id)`, así que registrar un acto la refresca |
| 31 | Registrar actos interruptivos (solo penal, solo el abogado responsable). La consulta es la línea de vida | `cases/` | Ezequiel Purro | **Hecha.** Modal en el detalle (`InterruptiveActModal`, `useRegisterInterruptiveAct`), fila "Sobre la causa". A quien no es el responsable el botón le avisa con un toast, como el prototipo |
| 32 | Barra de prescripción con la alerta del 70 % y alertas en los tableros | `cases/`, `dashboard/` | — | **Hecha**: la barra lee `prescription` y los dos tableros muestran "Alertas de prescripción" (`PrescriptionAlertsPanel`). Los correos son del backend |
| 33 | "Marcar prescripta" (`POST /cases/{caseId}/prescription`) | `cases/` | Ezequiel Purro | **Hecha.** Modal en el detalle (`PrescriptionDeclarationModal`, `useDeclarePrescription`), con `cases.declarePrescription` en `ACTION_ACCESS`: la Secretaría no ve el botón. En una causa ya prescripta no se ofrecen ni éste ni el acto interruptivo |
| 34, 35 | Modelos formales: alta con archivo, listado por fuero y descarga | `documents/` | Luciano Cipolla | **Hecha.** `DocumentTemplatesPage` en `/modelos`: una tarjeta por fuero (`JurisdictionCard`), los modelos del fuero elegido (`DocumentTemplateCard`), el alta (`DocumentTemplateFormModal` con `FileDropzone` y `JurisdictionPicker`) y la descarga (`useDownloadDocumentTemplate`). Sólo Administrador y Abogado |
| 39, 40 | Carpeta de la causa en Drive y copia de modelos | `cases/` | Luciano Cipolla | **Hecha.** En el alta: las casillas "Crear carpeta" y "Copiar modelos" (`CaseForm`), la ruta prevista y la cantidad de modelos del fuero en el resumen (`CaseSummaryAside`, `folderPathPreview`, con la ruta de V5), y `createFolder`/`copyTemplates` viajan siempre en `toCreateCaseBody`. El aviso del alta suma la carpeta (`folderNoticeSuffix`, `folderFailed`). En el detalle, `CaseFolderCard`: abrir la carpeta, crearla y reintentar (`POST /cases/{caseId}/folder`) |
| 41, 42 | Tableros "Mi día" y "Estudio" | `dashboard/` | Facundo Fiorani | **Hecha.** `HomePage` de `dashboard/` en `/inicio`. "Mi día": "Lo primero de hoy", la agenda del mes con las dos listas cortas al lado y, debajo y a todo el ancho, "Mis plazos abiertos"; "Estudio": cartera por fuero, "Vencimientos del estudio", alertas y "Carga del equipo". Los plazos se muestran como la línea de vencimientos del prototipo (`DeadlinesPanel`). Los tableros llevan `staleTime: 0` (CA-41.9): se vuelven a pedir cada vez que se entra a Inicio, así que las mutaciones no los invalidan. Los ajustes que no salen del prototipo están en `dashboard/CAMBIOS.md` |
| 53 | Herramientas: accesos directos a sitios externos | `tools/` | — | **Hecha.** `ToolsPage` en `/herramientas`, para los tres perfiles. El catálogo está en `tools/utils/catalog.ts`; cómo sumar una herramienta y los cambios, en `tools/CAMBIOS.md` |
| 30, 51, 52 | Avisos por correo y verificación diaria | — | Sólo backend | Sin trabajo de front: es un proceso del servidor |

---

## Lo que ya está hecho de los Sprints 1 y 2

Queda como referencia de cómo está armado cada módulo. Lo que V4 cambió sobre
esto ya está aplicado en la app, en los mocks y en los tests (ver
[Cambios de V4 sobre lo que ya estaba hecho](#cambios-de-v4-sobre-lo-que-ya-estaba-hecho)).

| HU | Pantalla | Módulo | Ruta |
|---|---|---|---|
| — | Iniciar sesión | `auth/` | `/login` |
| — | Usuarios: ABM | `users/` | `/usuarios` |
| 8, 9 | Clientes: listado y alta | `clients/` | `/clientes` |
| 47 a 50 | Calificaciones legales: listado y alta. La modificación y la baja están programadas pero ocultas (`SHOW_ROW_ACTIONS = false`, `legal-params/CAMBIOS.md`) | `legal-params/` | `/calificaciones-legales` |
| 17, 45, 46 | Estados procesales | `legal-params/` | `/estados-y-plazos` |
| 13 | Consultar abogado, con la barra de carga (`Meter`) | `lawyers/` | `/abogados` |
| 20 | Causas: listado con búsqueda y filtros | `cases/` | `/causas` |
| 18 | Registrar causa | `cases/` | `/causas/nueva` |
| 22 | Detalle de causa: encabezado, prescripción, datos por fuero y tarjeta del cliente | `cases/` | `/causas/:caseId` |
| 26 | Registrar acto procesal | `proceedings/` | `/causas/:caseId/acto` |

Las rutas de causas cuelgan de `/causas`, así que heredan su permiso en
`ROUTE_ACCESS` (`/causas/12` → `/causas`). El rail tiene dos grupos:
**"Trabajo diario"** (Inicio, Causas, Clientes, Modelos, Herramientas) y
**"Administración"** (Usuarios, Abogados, Estados y plazos, Calificaciones
legales, Reportes). Quién ve cada uno está en [Acceso por perfil](#acceso-por-perfil).

**La barra superior no tiene buscador.** El buscador general —uno solo para
todas las pantallas— quedó postergado (decisión del 07/10/2026). Hasta que se
haga, cada listado lleva el suyo en su panel y busca sólo en ese listado; el de
causas está en `CasesPage`. No se repone el de la barra porque el prototipo lo
muestre.

**Navegación después de guardar** (prototipo actualizado): registrar una causa
lleva a **su detalle** (`/causas/:caseId`), no al listado; registrar un acto
vuelve al detalle de la causa, que ya muestra el estado y el plazo nuevos. El
logo del rail lleva a la pantalla de entrada del usuario (`homeRoute`).

### Qué publica el `index.ts` de cada módulo

Varios módulos necesitan datos de otros. Cada dueño publica **sólo eso** en su
`index.ts` (regla 1 de `ESTRUCTURA.md` §5), y nadie entra a sus carpetas:

| Módulo | Publica | Lo usa |
|---|---|---|
| `lawyers` | `useLawyers`, `Lawyer`, `lawyerLabel` | Registrar causa ("Abogado responsable"), el listado de causas, Usuarios (la ficha del abogado) |
| `clients` | `useClients`, `useCreateClient`, `ClientFormModal`, `validateClient`, `isValidClient`, `toClientFormErrors`, `formatClientName`, `formatDocument`, `formatDocumentNumber`, `DOCUMENT_TYPES`, `DOCUMENT_TYPE_LABELS`, `toCreateClientBody` | Registrar y modificar causa: select de cliente y "Registrar cliente nuevo" |
| `legal-params` | `useLegalQualifications`, `useCreateLegalQualification`, `LegalQualificationFormModal`, `validateLegalQualification`, `toCreateLegalQualificationBody`, `toLegalQualificationFormErrors`, `useProceduralStates`, `isPrescribedState`, el formateo de la prescripción, los rótulos de fueros y tipos de día | Registrar y modificar causa, Registrar acto, Modelos (los fueros) y los tableros |
| `documents` | `useDocumentTemplates`, `DocumentTemplate` | Registrar causa: cuántos modelos del fuero se van a copiar (CA-40.10) |
| `cases` | `useCase`, `useCreateCase`, `casesKeys`, `refreshCaseAfterAct` (las mutaciones de actos esperan la causa nueva), `CaseHeader`, `CaseHeaderSkeleton`, `PrescriptionBar`, `nearestQualification`, `prescriptionNote`, `openDeadline`, `isResponsibleLawyer`, `sacLabel`, los rótulos y los tipos de la causa y del acto procesal (`ProceduralAct`, `ActDeadline`) | Registrar y modificar acto (muestra la causa y, al guardar, invalida sus claves) y los tableros |
| `deadlines` | `DAILY_RUN_ENABLED`, `useRunDailyNotifications` | La campana de la barra superior (`AppLayout`), sólo en desarrollo (`deadlines/CAMBIOS.md`) |

`proceedings`, `dashboard`, `tools`, `users` y `auth` no publican nada: ningún
módulo los consume (las páginas y la sesión las importa `src/app/`). Las
dependencias van en una sola dirección:

```
proceedings → cases, legal-params
cases       → clients, legal-params, lawyers, documents
dashboard   → cases, legal-params
documents   → legal-params
users       → lawyers
```

Si aparece una flecha para el otro lado, algo está en el módulo equivocado.

### Qué hay en cada módulo

| Módulo | Páginas | Componentes | Utilidades |
|---|---|---|---|
| `auth` | `LoginPage` | `LoginForm`, `LoginAside`, `ChangePasswordModal`, `LogoutConfirmModal` | `profileLabel`, `sessionStorage` |
| `clients` | `ClientsPage` | `ClientsTable`, `ClientFormModal` | `clientFormat` (`formatClientName`, `formatDocument`, `formatDocumentNumber`, `normalizeDocumentNumber`, `formatDni`, `normalizeDni`), `toCreateClientBody`, `toFormErrors` |
| `legal-params` | `ProceduralStatesPage`, `LegalQualificationsPage` | `ProceduralStatesTable`, `ProceduralStateFormModal`, `DeleteProceduralStateModal`, `LegalQualificationsTable`, `LegalQualificationFormModal`, `DeleteLegalQualificationModal` | `prescription` (`formatPrescription`, `toPrescriptionMonths`, `splitPrescription`, `shortQualificationName`), `systemStates`, `dayTypeTone`, los `build…Patch` y `toCreate…Body`, `toFormErrors`, `toLegalQualificationFormErrors` |
| `cases` | `CasesPage`, `RegisterCasePage`, `CaseDetailPage`, `GenerateCaseFilePage` | `CasesTable`, `CaseFilters`, `CaseForm`, `CaseEditForm`, `LegalQualificationPicker`, `CaseSummaryAside`, `CaseHeader`, `CaseFacts`, `PrescriptionBar`, `ClientCard`, `CaseFolderCard`, `CaseDocumentsCard`, `CaseTimeline`, `InterruptiveActModal`, `PrescriptionDeclarationModal`, `DeleteCaseModal`, `CaseFileCoverPanel`, `CaseFileDocumentsPanel`, `CaseFileResultAside`, `CoverPreviewModal`, `CaseFileReadyModal`, `CaseSkeletons` | `deadlineStatus`, `openDeadline`, `prescription`, `caseState`, `stateFilter`, `sac`, `subjectMatter`, `suggestedCaption`, `responsibleLawyer`, `caseForm`, `caseDraft`, `caseFolder`, `caseDocument`, `caseFile`, `timeline`, `buildCasePatch`, `toCreateCaseBody`, `toDeleteCaseBody`, `toCreateInterruptiveActBody`, `toDeclarePrescriptionBody` y los `to…FormErrors` |
| `proceedings` | `RegisterProceduralActPage` | `ProceduralActForm`, `DeadlinePreviewAside`, `ProceduralActFormSkeleton` | `stateOptions`, `resolveState`, `terminalState`, `deadlinePreview`, `dueDateText`, `toCreateProceduralActBody`, `toActFormValues`, `buildProceduralActPatch`, `toFormErrors` |
| `lawyers` | `LawyersPage` | `LawyersTable`, `LawyerFormModal` | `toCreateLawyerBody`, `buildLawyerPatch`, `lawyerLabel`, `toFormErrors` |
| `users` | `UsersPage` | `UsersTable`, `UserFormModal`, `DeleteUserModal` | `buildUserPatch`, `toCreateUserBody`, `roles`, `lawyerLink`, `toFormErrors` |
| `documents` | `DocumentTemplatesPage` | `JurisdictionCard`, `DocumentTemplateCard`, `DocumentTemplateFormModal`, `FileDropzone`, `JurisdictionPicker`, `DocumentTemplatesSkeleton` | `templateFormat`, `toCreateDocumentTemplateBody`, `toFormErrors` |
| `dashboard` | `HomePage` | `LawyerDashboardView`, `AdministratorDashboardView`, `SummaryBand`, `FirstDeadline`, `DeadlinesPanel`, `DeadlineCalendar`, `CasesToAdvancePanel`, `PrescriptionAlertsPanel`, `PortfolioByJurisdiction`, `TeamLoadPanel`, `DashboardSkeleton` | `dashboardDate`, `urgency` |
| `tools` | `ToolsPage` | `ToolSection`, `ToolCard`, `ToolSeal`, `QuickAccessBand` | `catalog`, `filterTools`, `brandStyle` |
| `deadlines` | — | — | — (sólo `api/`: el atajo de la campana, `deadlines/CAMBIOS.md`) |

Qué piezas no llevan test propio, y por qué, está en `TESTING.md` §5, "Lo que
no se testea".

### Componentes de `shared` que ya se usan

Están documentados en `SHARED.md`. Usalos antes de escribir nada parecido:

| Para | Usar |
|---|---|
| Migas "Causas / 13284571 / Registrar acto procesal" | `Breadcrumbs` |
| Tarjeta Cliente, Resumen del alta, Cómputo del plazo | `Panel` + `.vz-panel__body` + `DetailList` |
| Renglón chico bajo una etiqueta de la ficha ("8 años desde el 27/02/2021") | `DetailList` con `note` |
| Barra de prescripción, carga de un abogado | `Meter` |
| Iniciales en la tabla de clientes | `Avatar` + `.vz-table__ident` |
| "Estado procesal al que pasa la causa" (elegir o escribir) | `Combobox` |
| "Rol procesal del cliente" | `SegmentedControl` |
| Filtro de estado con grupos por fuero, "Causas nuevas" y "Escritos a mano" | `Select` con `{ group, options }` |
| "Objeto del reclamo" / "Objeto del amparo" con contador `0 / 800` | `Textarea` dentro de `Field` con `hint` (ya está en `CaseForm`) |
| "Solo con plazo por vencer" | `Button pressed={…}` |
| Buscador de un listado | `SearchInput` + `useDebouncedValue` de `@/shared/hooks/useDebouncedValue` |
| Formulario de página con panel al costado | `.vz-split` + `.vz-split__aside` |
| Chip de vencimiento y de estado | `Pill` (`danger` vencido/hoy, `warn` ≤ 5 días, `dot="hollow"` sin plazo) |
| Mostrar una fecha del contrato | `formatDate` de `@/shared/lib/dates` |
| Valor por defecto de un campo de fecha | `todayIsoDate()` de `@/shared/lib/dates` |
| Nombre de una persona | `formatPersonName` / `formatPersonFullName` de `@/shared/lib/personName` |

Los componentes propios de cada pantalla (la tabla de causas, el selector de
calificaciones del alta, el panel "Cómputo del plazo") van en su módulo.

### Lo que tiene que armar cada página

Los componentes son presentacionales y lo reciben hecho:

- **Clientes** (así quedó `ClientsPage`). El botón "Registrar cliente" está
  habilitado para los tres perfiles (D-39). El documento es DNI o pasaporte
  (`documentType`); el DNI se escribe sin puntos (tope de 8) y el pasaporte
  viaja sin espacios y en mayúsculas (`normalizeDocumentNumber`, que igual le
  saca los puntos a un DNI pegado con ellos). La dirección y el teléfono son
  obligatorios (D-109); un correo vacío no viaja. Un documento repetido
  (`409 CLIENT_DNI_ALREADY_EXISTS`) se muestra en el campo del número. Al
  registrar, el aviso es "Cliente GÓMEZ, Ariel Fernando registrado.". Sin
  acciones de fila: modificar y eliminar son del Sprint 4.
- **Registrar causa.**
  - *Calificaciones:* `values.legalQualifications` es una lista de
    `{ legalQualificationId, offenseDate }`. Agregar una la suma con
    `offenseDate: ''`; quitarla la saca con su fecha; `onOffenseDateChange`
    cambia la de esa fila. `selectedQualifications` se arma cruzando esa lista
    con las calificaciones de `useLegalQualifications`. Son **opcionales**: una
    causa penal se puede registrar sin ninguna (D-33).
  - *Resumen:* cada renglón de `prescriptions` lleva el nombre corto
    (`shortQualificationName`), el plazo (`formatPrescription`), la fecha del
    hecho y `estimatedExpiry(offenseDate, meses)`. El estado inicial que
    muestra es "Iniciada". Abajo, la carpeta en Drive: dónde va a quedar
    (`folderPathPreview`) o que no se va a crear.
  - *Carpeta y modelos* (HU39, HU40): "Crear carpeta" viene marcada; "Copiar
    modelos" también, y se deshabilita si se desmarca la carpeta
    (`changeCreateFolder`). La cantidad de modelos del fuero sale de
    `useDocumentTemplates`.
  - *"Para poder registrar":* cliente, carátula y responsable; el SAC es
    opcional, pero si se carga tiene que tener 8 dígitos y no estar repetido;
    en el penal, la fecha del hecho de cada calificación elegida; fuera del
    penal, el objeto del reclamo o del amparo. Los rótulos del prototipo
    cambian según el caso: "N° de SAC: opcional" o "N° de SAC válido y no
    repetido"; "Calificaciones legales: opcionales" o "Fecha del hecho en cada
    calificación legal".
  - *Cuerpo del alta:* `sacNumber` sólo si se cargó; `legalQualifications`
    sólo en el penal y sólo si se eligió alguna; `counterparty` y
    `subjectMatter` sólo en los otros dos fueros; el teléfono del instructor en
    `tribunalPhone` y el interno, aparte, en `instructorExtension`; los datos
    del fuero (D-67) sólo los del fuero elegido; `createFolder` y
    `copyTemplates` siempre, aunque sean `false`.
- **Causas (listado)** (así quedó `CasesPage`).
  - *Qué pide:* las causas con `useCases`; los abogados con `useLawyers`; los
    estados con `useProceduralStates`, una vez por fuero, porque ese hook trae
    los de un fuero por vez; y los estados escritos a mano con
    `useCaseCustomStates(fuero)`. Los abogados y los estados se piden con
    `limit: 100`: un desplegable necesita todas las opciones juntas.
  - *Buscador:* propio, en el panel (`aria-label="Buscar causa"`) y con
    demora. Busca por SAC, carátula o cliente.
  - *Grupos del filtro de estado,* en este orden: uno por fuero con sus estados
    (`stateFilterValue(id)`) —sólo el del fuero elegido, si hay uno—; "Causas
    nuevas" con la opción fija "Iniciada" (`WITHOUT_ACTS`); y "Escritos a mano
    en causas" con lo que devuelve `GET /cases/custom-states`
    (`customStateFilterValue`), sólo si devuelve alguno.
  - *Al cambiar el fuero,* el estado elegido se conserva si es "Iniciada", si
    se vuelve a "Todos los fueros" o si es de la tabla del fuero nuevo. Uno
    escrito a mano se suelta: sin preguntarle al servidor no se sabe si alguna
    causa de ese fuero lo tiene.
  - *Cada cambio* de búsqueda o de filtro vuelve a la página 1. "Limpiar
    filtros" saca los cuatro filtros y deja el buscador como está.
  - "Ver detalle" lleva a `/causas/:caseId` y "Registrar causa", a
    `/causas/nueva`. Una causa sin SAC se muestra como "Sin SAC". Sin
    resultados dice "Ninguna causa coincide con los filtros.".
  - *La clave de los estados escritos a mano* (`casesKeys.customStates`) cuelga
    de `casesKeys.lists()` a propósito: registrar un acto invalida los
    listados, y con eso el filtro vuelve a pedir sus opciones.
- **Detalle de causa.** La barra de prescripción lee `prescription` de la causa
  y arma la nota con `prescriptionNote`. El instructor lleva dos datos,
  "Teléfono" e "Interno"; los datos del fuero van en `CaseFacts`. Debajo, la
  línea de vida (`CaseTimeline`). "Registrar acto procesal" va deshabilitado
  para quien no es el abogado responsable, con la nota "Solo el abogado
  responsable (…) registra actos.". La fila "Sobre la causa" ("Registrar acto
  interruptivo" y "Marcar prescripta") aparece sólo en una causa penal que
  todavía no fue marcada prescripta (`showCaseActions`); "Marcar prescripta",
  además, sólo para el Administrador y los abogados. Lo demás (sin
  calificaciones, causa archivada) lo rechaza el backend con su `422`.

### Reglas del dominio

Son las de V5. Lo que V4 y V5 cambiaron está marcado con su decisión.

- **Personas: apellido primero y orden alfabético por apellido** (observación
  de la Sprint Review 1). **Toda** persona trae `lastName` y `firstName`
  separados (V4 D-68): usuarios, abogados, la sesión, y las referencias
  `lawyer`, `responsibleLawyer` y `registeredBy`. No existe más `fullName`. Se
  muestra con `formatPersonName` (`Ríos, Malena`) en tablas y selects, y con
  `formatPersonFullName` (`Malena Ríos`) dentro de una frase, los dos de
  `@/shared/lib/personName`. El cliente sigue con su propio formato,
  `formatClientName` (`GÓMEZ, Ariel Fernando`). El tratamiento "Dr."/"Dra." no
  es parte del nombre (D-81) y hoy no se muestra. El orden lo resuelve el
  backend: la tabla no ordena, y ordenar la página en el front mezclaría las
  páginas.
- **Fechas sin hora** (`startDate`, `offenseDate`, `dueDate`, `clientSince`) viajan como
  `YYYY-MM-DD`. Nunca `new Date('2026-09-15')`: lo toma en UTC y en Córdoba
  muestra el día anterior. Para eso están `formatDate` y `todayIsoDate`.
- **El DNI viaja sin puntos** (`34812905`) y se muestra con puntos
  (`34.812.905`), precedido por el tipo: `DNI 34.812.905` o
  `Pasaporte AAE482915` (`formatDocument`).
- **La matrícula del abogado es opcional**: viene `null` si no se cargó, y
  donde se nombra a un abogado con su matrícula se usa `lawyerLabel`, que sin
  ella deja sólo el nombre.
- **`prescriptionMonths` viaja en meses**; el formulario lo pide en años más un
  select de meses (0 a 11) y la tabla lo muestra como "6 años y 6 meses".
- **Los estados procesales no tienen posición ni orden** (D-31). El backend los
  lista por fuero y, dentro de cada uno, en el orden en que se registraron. No
  hay columna `#` ni selector de ubicación, y ninguna pantalla los reordena.
- **Los estados procesales traen `caseCount`, no `activeCases`** (V4 D-70):
  cuenta todas las causas que están en el estado, activas o no, así que los
  terminales también muestran las suyas. Abogados, clientes y calificaciones
  conservan su `activeCases`.
- **`caseCount` de estados y `activeCases` de calificaciones vienen sólo en los
  `GET`** (D-32). El `POST` y el `PATCH` devuelven el recurso sin ese campo, así
  que lo que devuelve una mutación no sirve para pintar la columna "Causas": se
  invalida el listado y se vuelve a pedir.
- **"Prescripta" es un estado de sistema del fuero penal** (V4 D-53): aparece
  en el listado de estados y en el filtro de causas, pero no se modifica ni se
  da de baja (`422 PROCEDURAL_STATE_PROTECTED`) y no es destino de un acto. Se
  reconoce con `isPrescribedState` (publicado por `legal-params`); la tabla le
  muestra "Estado del sistema" en lugar de las acciones. Una causa llega a él
  sólo con "Marcar prescripta".
- **La causa nace en el estado inicial, "Iniciada"** (D-34). `currentState`
  **nunca es `null`**: en una causa recién registrada trae `name: "Iniciada"`,
  `initial: true` y `proceduralStateId: null`. El nombre lo manda el backend;
  el front no pone ningún rótulo propio. "Iniciada" es un estado de sistema:
  no está en la tabla de estados, no se administra, no se ofrece como destino
  de un acto y no aparece en la línea de vida. El resumen del alta muestra
  "Iniciada · El estado lo fija el primer acto procesal".
- **El vencimiento es parte del estado actual** (D-35). No existe
  `nextDeadline`: `currentState` trae `proceduralActId`, `dueDate`,
  `businessDaysRemaining` y `manuallyAdjusted`. Con `dueDate` en `null` la
  causa no tiene vencimiento: es el chip "Sin plazo abierto" del prototipo.
- **El vencimiento abierto puede ser del acto lesivo** (V4 D-78, D-82). En un
  amparo en "Iniciada" con fecha de acto lesivo, `harmfulActDeadline` trae el
  plazo para presentarlo. Nunca coincide con el de `currentState`. El listado,
  el encabezado y los tableros leen el que haya con `openDeadline(c)` y lo
  aclaran con "Plazo para el amparo".
- **`businessDaysRemaining`** arma el texto del chip: negativo = "Vencido hace
  N días", `0` = "Vence hoy", positivo = "En N días hábiles".
- **El vencimiento de un acto no se calcula en el front.** Se pide a
  `GET /cases/{caseId}/procedural-acts/deadline-preview` mientras se completa el
  formulario, así lo que se ve es lo que se guarda (D-20).
- **El enumerado `ProceduralRole`** viaja como código en castellano (`DEFENSA`,
  `QUERELLANTE_PARTICULAR`, `RECURRENTE`, `ACTORA`, `DEMANDADA`, D-37); el
  rótulo lo pone el front. Depende del fuero: al cambiar el fuero, el rol
  vuelve al primero válido. `ProceduralActStatus` **no existe** (D-13).
- **Filtro de estado del listado:** tres clases de opciones, cada una con su
  parámetro, excluyentes entre sí. Estado de la tabla → `proceduralStateId`;
  grupo "Causas nuevas", opción "Iniciada" → `withoutProceduralActs=true`
  (D-29, D-34); grupo "Escritos a mano en causas" → `customState`. "Iniciada"
  es una opción fija: no viene de `GET /cases/custom-states`.
- **El SAC es opcional** (D-33). Si se carga, son 8 dígitos y es único entre
  las causas vigentes (`409 CASE_SAC_ALREADY_EXISTS`, que se muestra en el
  campo): el de una causa dada de baja se puede volver a usar (V5 D-97). `sacNumber`
  puede venir en `null`: el prototipo lo muestra como "Sin SAC", y el listado
  se desempata por `id`.
- **Calificaciones legales opcionales** (D-33): una causa penal puede no tener
  ninguna; en ese caso no computa prescripción. Fuera del penal no se mandan.
- **Fecha del hecho** (D-19, D-28): cada calificación **elegida** lleva su
  `offenseDate`, obligatoria y no futura. El cuerpo del alta manda
  `legalQualifications: [{ legalQualificationId, offenseDate }]`.
- **Prescripción:** sólo en el fuero penal y **por calificación**: cada
  elemento de `legalQualifications[]` trae `offenseDate`,
  `prescriptionStartsOn` y `prescriptionExpiresOn`. `prescriptionStartsOn` es
  la fecha del acto interruptivo más reciente o, si no hay, `offenseDate`
  (V4 D-49), y `startDate` no interviene. **La barra no calcula nada** (D-51):
  lee `prescription` de la causa, que trae la calificación que prescribe
  primero, `elapsedPercentage`, `alert` (70 %, fijo) y `expired`. Del lado del
  front quedan el "Restan 5 años 9 meses" (`remainingLabel`, con `expiresOn`) y
  la nota (`prescriptionNote`). Un plazo cumplido no cambia el estado (D-52):
  la barra dice "Plazo cumplido". `prescription` vale `null` fuera del penal y
  en una causa penal sin calificaciones (D-74): ahí la barra no se dibuja.
- **Actos interruptivos** (HU31): sólo en el penal, sólo el abogado
  responsable y nunca en una causa cerrada. Reinician la prescripción de todas
  las calificaciones; rige el de fecha más reciente. No mueven el estado ni el
  vencimiento de la causa.
- **Marcar prescripta** (HU33, D-52, D-74): manual, con fecha (no futura) y
  resolución; el fundamento es opcional. Sólo causas penales con
  calificaciones. No se deshace.
- **Datos propios de cada fuero y tasa** (V4 D-67): "Preso" en el penal
  (`clientDetained`); medida cautelar y acto lesivo en el amparo
  (`injunctionGranted`, `harmfulActDate`, `harmfulActRenews`,
  `harmfulActRenewalDays`, `harmfulActTermDays`, `harmfulActTermDayType`);
  agotamiento de la vía en el administrativo
  (`administrativeRemedyExhaustedOn`); y `courtFeePaid` en los tres. No están
  en el prototipo: los suma el alta (`CaseForm`) y los muestra el detalle
  (`CaseFacts`). Un dato de otro fuero no se manda y en la respuesta vale
  `null`. Se modifican con `PATCH /cases/{caseId}` (HU19).
- **`startDate` es anulable** (D-38): `null` mientras la causa no tiene SAC.
- **Objeto del reclamo / del amparo** (`subjectMatter`, D-27): sólo en
  `ADMINISTRATIVE` y `AMPARO`, **obligatorio** y de hasta 800 caracteres, con
  contador. El rótulo y el placeholder cambian con el fuero. En el penal no se
  manda.
- **Instructor de la causa** (D-33): `instructorName`, `tribunalPhone` (sólo
  el teléfono, hasta 50 caracteres) e `instructorExtension` (el interno, hasta
  20), los tres opcionales.
- **Estado del acto:** se manda `proceduralStateId` **o** `customState`, nunca
  los dos. Si lo escrito coincide con un estado de la tabla, se manda el id.
  **Los estados terminales sí se ofrecen** (V4 D-69), con la aclaración
  "Cierra la causa": es la forma de archivarla. "Prescripta" no se ofrece, y
  "Iniciada" tampoco. Hacia un terminal no hay ajuste manual del vencimiento.
  Una causa en estado terminal no admite actos nuevos
  (`422 CASE_IN_TERMINAL_STATE`).
- **Fuero administrativo:** el plazo corre desde `notificationDate`, que es
  obligatoria si el estado abre plazo (RN6).
- **Sólo el abogado responsable de la causa registra sus actos** (D-30),
  procesales e interruptivos. No es un rol: ni otro abogado ni el
  administrador pueden. Se decide con `isResponsibleLawyer` (publicado por
  `cases`), que compara la ficha del usuario con el responsable de la causa; el
  backend responde `403` a quien no lo es, también en `deadline-preview`. El
  acto se aplica a la causa al registrarse: no hay actos pendientes ni
  confirmación (D-13).
- **Carpeta de la causa** (V4 D-59, D-60, D-83; V5 D-104): la crea el backend
  en `/VZ Causas/Causas/{Apellido, Nombres}/{Fuero}/{carátula}`, sin los
  caracteres que Drive no admite. Si Drive falla, la causa se registra igual y
  `folder.status` queda en `ERROR` (D-60). `folder` vale `null` en las causas
  registradas antes de V4. **Sigue a la causa**: se renombra si cambia la
  carátula y se mueve si cambia el responsable; si Drive no responde, la
  modificación no falla y `folder.path` dice dónde quedó.
- **Modificar una causa** (HU19, V5 §3.7): cualquier perfil. El fuero no se
  modifica (D-95): una causa en el fuero equivocado se da de baja y se
  registra de nuevo. Una causa terminal se puede corregir, salvo las
  calificaciones de una "Prescripta" (`422 CASE_IN_TERMINAL_STATE`, D-96).
- **Baja de una causa** (HU21, D-97): lógica, de cualquier perfil, con motivo
  opcional. Para el cliente deja de existir: ella y todo lo que cuelga de ella
  responden `404 CASE_NOT_FOUND`, y sale de listados, tableros y conteos. La
  mutación remueve `detail(id)` e invalida los listados.
- **Modificar un acto procesal** (HU28, D-98, D-99): sólo el responsable
  **actual** de la causa. Si cambia el estado, el plazo se recalcula con la
  tabla de hoy; si no, con el que el acto copió. El estado de la causa se
  recalcula con el acto más reciente: corregir el acto que la cerró la reabre.
  Los actos de una causa "Prescripta" no se modifican. El acto trae
  `lastModifiedBy` y `lastModifiedAt`. La mutación invalida las claves de la
  causa, como el registro.
- **Documentos de la causa** (HU38, D-100, D-101): se leen de Drive en cada
  pedido, sin paginar; su `id` es el de Drive y su autor (`uploadedBy`) es una
  cuenta de Google, no un usuario del sistema. No hay "Presentado" ni
  "Recibido". La lista la ven los tres perfiles (D-103).
- **Carátula y expediente** (HU24, HU25, D-91 a D-94, D-102, D-106): los arma
  el backend en PDF; no se guarda nada de la carátula en la causa. Al generar
  el expediente, el cliente manda las observaciones y, en el penal, la parte
  que no es el cliente (`cover.opposingParty`). Un expediente no se incluye en
  otro, y la causa necesita su carpeta creada.

### Cambios de V4 sobre lo que ya estaba hecho

Lo que V4 cambió en los recursos de los Sprints 1 y 2 (V4 §7.2). **Está
aplicado en la app, en los mocks y en los tests.** Lo que cambió V3 sobre el
Sprint 1 quedó registrado en `API_CONTRACT_V3.md` §7 y ya no es referencia.

| Cambio | En el front |
|---|---|
| `lastName` y `firstName` en lugar de `fullName` en usuarios, abogados, la sesión y toda referencia a ellos (D-68) | Tipos, formularios (dos campos, hasta 100 caracteres), parches, tablas y textos. `formatPersonName` y `formatPersonFullName` en `shared/lib/personName.ts`. Una sesión guardada con la forma V3 se descarta |
| `caseCount` en lugar de `activeCases` en los estados procesales (D-70) | El tipo, la columna "Causas", la baja y la edición |
| "Prescripta" es un estado de sistema protegido (D-53) | `isPrescribedState` en `legal-params/utils/systemStates.ts`; la tabla no ofrece acciones y la página maneja el `422 PROCEDURAL_STATE_PROTECTED` |
| Un acto puede llevar la causa a un estado terminal, salvo "Prescripta" (D-69) | `stateOptions`, `DeadlinePreviewAside` (`allowManualDue`) y `toCreateProceduralActBody` |
| La causa suma los datos por fuero y `courtFeePaid` (D-67) | El alta (`CaseForm`, `validateCase`, `toCreateCaseBody`) y el detalle (`CaseFacts`) |
| `harmfulActDeadline` cuenta como vencimiento abierto (D-78, D-82) | `openDeadline` en el listado, el encabezado y los tableros |
| `prescription` calculada por el backend (D-51) | `PrescriptionBar` recibe `prescription`; `prescriptionNote` arma la nota |
| `prescriptionDeclaration` en la causa | El modal "Marcar prescripta" y el pase en la línea de vida (HU33) |
| `folder` en la causa; `POST /cases` acepta `createFolder` y `copyTemplates` | El alta los manda y su aviso suma la carpeta. El detalle la muestra en `CaseFolderCard` (HU39) |
| Códigos de error nuevos (V4 §7.4) | `ERROR_CODES` de `src/shared/api/contract.ts` suma `DOCUMENT_TEMPLATE_NOT_FOUND`, `DOCUMENT_TEMPLATE_ALREADY_EXISTS`, `FILE_TOO_LARGE`, `PRESCRIPTION_NOT_APPLICABLE`, `PROCEDURAL_STATE_PROTECTED`, `DOCUMENT_STORAGE_UNAVAILABLE` y `PROCEDURAL_ACT_NOT_FOUND` |
| Modificación y baja de calificaciones legales (pendiente del Sprint 2) | `LegalQualificationsPage`, con `useUpdateLegalQualification`, `useDeleteLegalQualification` y `buildLegalQualificationPatch`. Desde el 18/10/2026 las acciones de fila están ocultas (`SHOW_ROW_ACTIONS = false`): el backend no tiene esos dos endpoints (`legal-params/CAMBIOS.md`) |

### Revisión de V5 del 05/11/2026

Pedido del equipo, ya escrito en V5 (`DECISIONES.md`, D-107, D-108 y D-109,
e "Impacto de la revisión del 05/11/2026"). **Está aplicado en la app, en los
mocks y en los tests, y también en el backend** (D-107 y D-108 con su
migración; D-109 en la validación del alta de clientes):

| Cambio | En el front |
|---|---|
| Matrícula del abogado opcional (D-107): `registrationNumber: string | null`; vacía no viaja en el alta, y en el `PATCH` `null` la borra | `lawyers/` (schema, body, patch, tabla con raya), `users/` (ficha nueva), `lawyerLabel` en los selects de causas y usuarios |
| Cliente (D-108): `documentType` (`DNI` o `PASSPORT`), `documentNumber` (reemplaza a `dni`) y `address` (texto libre, hasta 255) | `clients/` (formulario, schema, tabla "Documento"), `ClientCard` y los selects de cliente de causas |
| Cliente (D-109, revisión del 06/11/2026): `address` y `phone` obligatorios en el alta (no vacíos; nunca `null` en las respuestas) | `clients/` (asteriscos, schema, body, tipos), mock (`createClient` y semillas: todos tienen dirección y teléfono) y sus tests |

### Errores de los campos (06/11/2026)

El error de un campo se dibuja con `FieldError` (`shared/components/forms`):
ícono de alerta y cada oración en su renglón, porque el backend junta en un
texto todos los mensajes que fallan sobre un campo. `Field` y `FormModal` ya
lo usan; para un control suelto, `<FieldError message={…} />`, nunca un
`<div className="vz-error">` a mano. Lo prueba
`tests/components/shared/FieldError.test.tsx`.

### Topes de largo en los formularios (06/11/2026)

Los campos de texto no dejan escribir más de lo que acepta el backend
(`maxLength`). Cada schema exporta sus topes por campo
(`CLIENT_MAX_LENGTH`, `CASE_MAX_LENGTH`, `PROCEDURAL_ACT_MAX_LENGTH`, etc.),
sacados de las mismas constantes que valida: el número no se repite en el
componente. En `FormModal` va como `FieldSpec.maxLength`, y en un `'area'`
dibuja el contador. La validación del schema queda como respaldo.

Donde V5 no fija tope, lo decidió el equipo: matrícula 12, años de
prescripción 2 dígitos, días del amparo 3, buscadores 100
(`SEARCH_MAX_LENGTH`, por defecto en `SearchInput`). El DNI se escribe **sin
puntos** (tope 8; la nota del campo dice "Sin puntos.") y el pasaporte tiene
tope 20. El correo, las contraseñas y el login no tienen tope. Lo prueban
`tests/components/shared/{FormModal,SearchInput,formMaxLength}.test.tsx` y un
caso en `ClientsPage`, `RegisterCasePage` y `RegisterProceduralActPage`.

El `409` de un documento repetido sigue siendo `CLIENT_DNI_ALREADY_EXISTS`:
el código no se renombra (D-108).

### Cambios de V5 sobre lo que ya estaba hecho

V5 no rompe nada de lo hecho (`DECISIONES.md` §4, "Impacto de V5"). Lo que ya
está aplicado:

| Cambio | En el front |
|---|---|
| Códigos de error nuevos: `DOCUMENT_NOT_FOUND`, `CASE_FOLDER_NOT_AVAILABLE` y `DOCUMENT_NOT_CONVERTIBLE` | `ERROR_CODES` de `src/shared/api/contract.ts` |
| La carpeta va dentro de `/VZ Causas/Causas/`, con el nombre limpio de lo que Drive no admite | `folderPathPreview` en `cases/utils/caseFolder.ts` |
| El SAC es único entre las causas vigentes (D-97) | Sólo en el mock: el front no valida unicidad |

Lo de las historias del sprint está en
[Sprint 4](#sprint-4--qué-está-hecho-y-dónde).

Si el contrato vuelve a cambiar, **no se toca de una**: primero se listan los
cambios y se acuerdan, después se aplican al contrato, a los mocks, a los tipos
y a este archivo.

### Los mocks

**El mock implementa V5 entero** (`docs/Api-Contract/API_CONTRACT_V5.md`, con
la revisión del 05/11/2026), con MSW: lo de los Sprints 1 a 3 y lo del Sprint 4
(modificar y dar de baja una causa, la carátula, modificar un acto procesal,
los documentos de la causa y el expediente). Lo que hay que saber:

- **Usuarios de prueba:** `fvazquez` (Administrador y Abogado), `mrios`
  (Abogado), `gestion` (Secretaría), `supervision` (Administrador sin ficha) y
  `sledesma` (Secretaría y Abogado). Las contraseñas están en el README.
- **Permisos**, según la tabla del contrato (V5 §4): leer está abierto a
  cualquiera con sesión, salvo `/users`, los modelos y los tableros. `/users` y
  escribir abogados piden `ADMINISTRATOR`. Registrar, modificar y dar de baja
  una causa, registrar un cliente, escribir estados procesales y
  calificaciones legales, crear o reintentar la carpeta, ver la carátula y los
  documentos y generar el expediente, lo hace cualquiera. Descargar un
  documento que no es un expediente pide `LAWYER` o `SECRETARY`. Los modelos y "Marcar prescripta" son de
  `ADMINISTRATOR` o `LAWYER`; `GET /dashboards/lawyer`, de `LAWYER`, y
  `GET /dashboards/administrator`, de `ADMINISTRATOR`. Lo prueba
  `tests/unit/contract/permissions.test.ts`.
- **Los actos no se rigen por un rol** (D-30): los registra, los modifica y
  previsualiza su vencimiento sólo el abogado responsable de la causa. `mrios` lleva la 1 y la
  17; `fvazquez`, la 4, la 6 y la 20; `mferreyra`, la 7; `sledesma`, la 15 y la
  16. Con cualquier otro usuario el mock responde `403`, aunque sea abogado o
  administrador.
- **Datos semilla:** 23 causas, 23 clientes vigentes, 8 calificaciones
  vigentes, 12 modelos vigentes y uno dado de baja. Las causas 1 a 6 son las
  del prototipo; el resto cubre cada regla: en "Iniciada" (7, 11, 22 y 23), sin
  SAC ni calificaciones (23), estado escrito a mano (8), en estado terminal (9,
  10 y 21), con una calificación dada de baja (13), con el vencimiento ajustado
  a mano (8 y 16). Del Sprint 3: alerta de prescripción (4), marcada
  prescripta (10), prescripción cumplida sin marcar (13), carpeta creada (1, 2,
  3, 5 y 6), creándose (11), con error (22) y pendiente (23). Del Sprint 4:
  la carpeta de la causa 1 tiene 12 archivos, entre ellos el expediente v1 y
  una hoja de cálculo de Google que no se puede convertir; las 2, 3, 5 y 6
  tienen un escrito cada una (`DOCUMENT_SEEDS`). La tabla completa está en el
  README y en los comentarios de `CASE_SEEDS` y `DOCUMENT_SEEDS`, en
  `fixtures.ts`.
- **La carátula y el expediente son PDF de verdad**, mínimos (`pdf.ts`): el
  texto de cada recuadro, sin logo ni acentos. Alcanzan para la vista previa y
  la impresión.
- **Los vencimientos son relativos a hoy.** Los actos recientes de las
  semillas se ubican "N días hábiles atrás", así el listado se ve como el
  prototipo cualquier día. Un test que afirme algo sobre vencimientos o sobre
  "hoy" tiene que fijar el día (`usePrototypeToday()` de
  `tests/setup/clock.ts`): `TESTING.md`, "Tests que dependen del día".
- **Lo calculado no se guarda.** `activeCases`, `caseCount`, el estado actual
  de una causa, su vencimiento, su prescripción y su línea de vida salen de los
  actos en cada lectura. Registrar un acto no "actualiza la causa": la próxima
  lectura ya la devuelve cambiada, y por eso la mutación del acto tiene que
  invalidar las claves de la causa. "Iniciada" tampoco se guarda: una causa
  está en ese estado mientras no tenga actos.
- **El mock atiende sólo las rutas exactas de la API.** Los handlers se
  registran con `*` adelante (sirven para `/clients`, `/api/clients` y
  `/api/v1/clients`), y con eso MSW también atrapaba archivos de la app como
  `/src/features/clients/index.ts`: los contestaba con un 404, el `import()`
  de la pantalla fallaba y aparecía "No se pudo cargar esta pantalla" (por
  ejemplo, al entrar a Causas, Inicio o Usuarios). Desde el 05/11/2026 el
  `resolver` deja pasar a Vite todo lo que no es exactamente su ruta
  (`isRoutePath` en `msw-handlers.ts`; test en
  `tests/unit/shared/mockRoutes.test.ts`). Si vuelve a aparecer esa pantalla
  en desarrollo, mirá primero en Network si un archivo `.ts` respondió 404.
- **El detalle está en el README de los mocks**: cómo disparar cada error
  (qué usuario, qué causa, qué dato), cómo subir y descargar archivos, y las
  decisiones que el mock tomó donde el contrato no dice nada. Que el mock no
  invente ni olvide endpoints lo revisa `tests/unit/contract/endpoints.test.ts`
  contra `docs/openapi`. **Hoy está en rojo**: a `docs/openapi` le faltan
  cinco endpoints de V5 que el mock ya implementa (la carátula, la lista y la
  descarga de documentos, modificar un acto y generar el expediente).
- **Si falta un endpoint**, se agrega en `src/shared/mocks/handlers.ts`
  (handler y su entrada en `ROUTES`), y el contrato en `docs/openapi` (el test
  de `tests/unit/contract/` falla si divergen). Sin handler, la pantalla falla
  contra el mock y sus tests también (`onUnhandledRequest: 'error'`).
- **El mock sigue además al esquema de la base** (`backend/prisma/schema.prisma`)
  donde el contrato no entra en detalle: por ejemplo, el nombre de un estado
  procesal es único entre los vigentes, así que el de uno dado de baja se
  puede volver a usar.

---

## Anatomía de un módulo

Las seis carpetas existen siempre, aunque estén vacías (con `.gitkeep`):

```
features/users/
├── types/        user.ts
├── api/          users.api.ts · users.keys.ts · useUsers.ts
│                 useCreateUser.ts · useUpdateUser.ts · useDeleteUser.ts
├── schemas/      user.schema.ts
├── utils/        buildUserPatch.ts · toCreateUserBody.ts · roles.ts · lawyerLink.ts
├── components/   UsersTable.tsx · UserFormModal.tsx · DeleteUserModal.tsx
└── pages/        UsersPage.tsx
```

El ejemplo es `users` porque tiene el ABM completo. En otro módulo, **creá sólo
los hooks de los endpoints que existan y que la pantalla use**: `lawyers`, por
ejemplo, tiene `useLawyers`, `useCreateLawyer` y `useUpdateLawyer`, y no
tiene hook de baja porque esa historia (HU15) no está en el contrato. `clients`
tiene alta y consulta, y nada más.

Dependencias permitidas dentro del módulo, en una sola dirección:

```
pages, components  →  api, schemas, utils, types
schemas, utils     →  types, y entre ellos
api                →  types
types              →  (nada)
```

`schemas/` y `utils/` se usan entre sí: un `toFormErrors` lee el tipo de error
de su esquema, y un esquema puede usar un formateador del módulo. `api/` no
importa más que `types/`. La única excepción es `cases/api/useCaseEdit.ts`,
que orquesta "Modificar causa" para dos páginas (`cases/CAMBIOS.md`).

Hacia afuera: el módulo puede usar `shared/`, `domain/` y el `index.ts` de otro
módulo. **Nunca importa las carpetas internas de otro módulo ni
`@/shared/mocks`.**

Si un módulo tiene cambios que no salen del prototipo ni del contrato (pedidos
del equipo, ajustes de diseño), van en un `CAMBIOS.md` en su raíz, como los de
`dashboard/` y `tools/`.

### `types/` — las formas de los datos

Un archivo por entidad, sacado del contrato. Separá las formas, porque no es lo
mismo lo que llega que lo que se manda:

| Tipo | Qué es |
|---|---|
| `User` | El recurso tal como viene dentro de `data` |
| `CreateUserBody` | El cuerpo del `POST` (sin `id`, sin campos que genera el backend) |
| `UpdateUserBody` | El cuerpo del `PATCH`: todo opcional |
| `UserFormValues` | Los valores del formulario. Sólo `string` y `boolean`, porque es lo que admite `FormValues` de `FormModal`. Nunca `undefined` |
| `UserListParams` | Los parámetros del listado: página, límite y filtros |

Los valores cerrados (roles, fueros, rol procesal) van como unión de literales
**y** como arreglo tipado con esa unión, así el arreglo deja de compilar si la
unión cambia.

**No copies los tipos de `shared/mocks/contract.ts`**: los mocks son sólo para
desarrollo. Escribilos en el módulo a partir del contrato.

### `api/` — todo lo que habla con el servidor

**`<plural>.api.ts`** — una función por endpoint.
- Siempre con `http` de `@/shared/api/http`. Nunca `fetch` ni `axios` directo.
- **Sacá el envoltorio del contrato**: para un recurso devolvé `data`; para una
  colección, `{ data, pagination }`. Ni los hooks ni las páginas tienen que
  saber que existe axios ni que la respuesta viene envuelta.
- Un filtro vacío no viaja: `search: params.search?.trim() || undefined`.
- No sabe de React, de caché ni de pantallas.

**`<plural>.keys.ts`** — las claves de caché, en jerarquía:

```
all       → ['users']
lists()   → ['users', 'list']
list(p)   → ['users', 'list', p]        p = página, límite y filtros
details() → ['users', 'detail']
detail(id)→ ['users', 'detail', id]
```

Los listados son paginados y filtrables: **los parámetros van en la clave**, si
no, dos páginas distintas pisan la misma entrada de caché. Nadie escribe una
clave a mano fuera de este archivo. Lo que depende de un recurso cuelga de su
`detail(id)` (como `casesKeys.timeline(id)`), así invalidar el detalle lo
refresca también.

**Un hook por archivo**, y el archivo se llama igual que el hook
(`useUsers.ts` exporta `useUsers`).
- Consultas: `useQuery`. Los listados usan `placeholderData: keepPreviousData`,
  así la tabla no parpadea al cambiar de página o de filtro. La consulta por id
  lleva `enabled` para no salir con un id inválido.
- Mutaciones: `useMutation`, y **son responsables de dejar la caché bien**
  después de escribir. No se delega a la página:

| Mutación | Detalle | Listados |
|---|---|---|
| Alta | Sembrar `detail(id)` con lo que devolvió el servidor | Invalidar `lists()` |
| Edición | Reemplazar `detail(id)` con lo que devolvió el servidor | Invalidar `lists()` |
| Baja | **Remover** `detail(id)` (invalidarlo dispara un GET que da 404) | Invalidar `lists()` |

Invalidá `lists()` y no `list(p)`: una alta o una baja cambia todas las
páginas, no sólo la que está en pantalla. Si la escritura cambia **otro**
recurso —registrar un acto cambia la causa—, invalidá también
las claves de ese recurso, que su módulo publica en el `index.ts`.

En estados procesales y calificaciones legales, lo que devuelven el `POST` y el
`PATCH` **no trae `caseCount` ni `activeCases`** (D-32): no lo uses para
sembrar ni para reemplazar `detail(id)`. Alcanza con invalidar `lists()`, y el
dato llega con el próximo `GET`.

Si hay baja **en lote**, usá `Promise.allSettled` y devolvé `{ deleted, failed }`:
una baja puede fallar sola (`409` si tiene dependencias, `422` si viola una
regla) y no tiene que cancelar las demás.

El `queryClient` ya está configurado (no reintenta mutaciones, `staleTime`
60 s). No crees otro.

**Acá no van mocks.** Los mocks son compartidos y viven en `shared/mocks/`. Si
tu módulo necesita un endpoint que el mock no tiene, se agrega ahí, siguiendo
su README.

### `schemas/` — validación de los formularios

`<entidad>.schema.ts`. Mientras no se decida lo de `zod`, son **funciones
puras** que reciben los valores del formulario y devuelven un error por campo:
`Partial<Record<keyof UserFormValues, string>>`. Así, el día que entre `zod`,
cambia el interior del archivo y no dónde está.

Las restricciones salen de la tabla del cuerpo de cada endpoint en el contrato
(largos, formatos: SAC de 8 dígitos, DNI de 7 u 8, pasaporte de 6 a 20 letras
y números, matrícula `1-28114` cuando se carga,
modelos `.docx` de hasta 10 MB).

Es la primera barrera, no la única: el backend también valida y devuelve sus
errores campo por campo en los `400` (ver `pages/`).

### `utils/` — transformaciones del módulo

Funciones puras, sin React y sin HTTP:

- **De formulario a cuerpo de alta** (`toCreateUserBody`): recorta espacios y
  convierte `''` en "no se mandó".
- **De formulario a cuerpo de edición** (`buildUserPatch`): compara con el
  original y devuelve **sólo lo que cambió**, recortando antes de comparar. Si
  no cambió nada, no se manda: el contrato responde `400` a un `PATCH` vacío.
- **Mapas de presentación** que usa más de una pantalla del módulo, por ejemplo
  código → rótulo, o estado → tono de `Pill`.

**Las reglas jurídicas no van acá.** Cómputo de plazos, prescripción, actos
interruptivos, estados por fuero: todo eso va en `src/domain/`, sin React. Hoy
casi todo lo calcula el backend (vencimientos, `businessDaysRemaining`,
`prescription`); lo que queda del lado del front es presentación.

### `components/` — piezas del módulo

Tablas, formularios y modales de este módulo, aunque los use una sola pantalla
(así lo fija `ESTRUCTURA.md`). **Antes de crear uno, buscá en `SHARED.md`**, en
la tabla "Si necesitás X, usá Y". Si algo de `shared` casi sirve, se extiende
ahí; no se duplica.

Los componentes son presentacionales: reciben los valores y los errores ya
calculados y avisan con callbacks. No validan ni guardan (ver `UserFormModal`).

### `pages/` — una pantalla por ruta

La página **orquesta**: llama a los hooks, guarda el estado de la pantalla
(página actual, filtros, qué modal está abierto) y arma todo con componentes.
No llama al servidor directo.

- **Patrón de listado:** `PageHeader` → `Panel` con los filtros en `actions` →
  `DataTable` → `FormModal` para alta, edición y confirmación de baja.
- **Patrón de formulario de página** (Registrar causa, Registrar acto):
  `Breadcrumbs` → encabezado → `.vz-split` con el formulario en un `Panel` y el
  panel lateral en `.vz-split__aside`.
- **La paginación y los filtros viven en la página** y se pasan al hook como
  parámetros; `DataTable` no pagina ni filtra. Al cambiar un filtro se vuelve a
  la página 1.
- **El texto del buscador va con demora.** El `SearchInput` muestra `search`
  al instante, y al hook se le pasa
  `const debouncedSearch = useDebouncedValue(search.trim())` (de
  `@/shared/hooks/useDebouncedValue`): si no, sale un pedido por tecla. Los
  selects, las pestañas y el paginado no llevan demora. Ver `ClientsPage`.
- **Un solo estado por modo.** Por ejemplo, "qué modal está abierto y con qué
  registro" es un estado, no dos booleanos que se pueden contradecir.
- **Errores del servidor** (siempre llegan como `ApiError`):
  - para ramificar, `e.is('CODIGO')` o los getters (`isConflict`,
    `isBusinessRule`, `isNotFound`…). **Nunca compares `e.message`.**
  - para marcar campos, `e.fieldError('campo')` en los `400`. Un conflicto que
    es de un campo (usuario repetido, matrícula repetida, SAC repetido,
    documento repetido, nombre de modelo repetido) se muestra **en ese campo**, no en un
    aviso suelto.
  - para mostrar, `e.message`: el backend lo manda en castellano (D-23).
    No escribas mensajes de error genéricos propios.
- **Avisos:** `useToast()` de `@/app/providers/ToastContext`.
  `success` para lo que se creó o se guardó, `info` para una baja (salió bien,
  pero no es un logro), `error` para lo que falló.
- **Estados de la consulta:** cargando, error (con `e.message`) y vacío, con
  las clases `.vz-empty`, como en `UsersPage`.

---

## Enchufar un módulo nuevo

1. Registrar las páginas en `src/app/router/index.tsx`, **adentro** de
   `<RequireAccess />`, con `lazy`: la pantalla se declara en
   `src/app/router/pages.ts` (`PAGES`) y la ruta la usa como
   `{ path: '…', lazy: PAGES.miPantalla }`. No se importa en el router: si
   no, vuelve al archivo principal y se descarga antes del login. Si es una
   sección del rail, sumala también a `SECTION_PAGES` (la adelanta al apuntar
   al ítem); `tests/unit/app/pages.test.ts` revisa las dos cosas. Adentro de
   `<RequireAccess />` ya queda cubierta por su `errorElement`
   (`RouteErrorPage`): si el archivo de la pantalla no se puede descargar
   (un despliegue nuevo con una pestaña vieja) o la pantalla falla al
   dibujarse, se ve un mensaje con "Recargar" y el rail sigue a la vista. No
   hace falta un `errorElement` por ruta. Tampoco un indicador de carga:
   mientras se descarga la pantalla se ve la barra de `NavigationProgress`
   (si tarda más de 150 ms) o, al abrir la app ahí, la pantalla de carga
   (`BootScreen`, la misma que dibuja `index.html` antes de que arranque React).
2. Si falta, agregar el ítem en `src/app/layouts/AppLayout.tsx`, en el grupo
   que corresponda ("Trabajo diario" o "Administración").
3. **Declarar la ruta en `ROUTE_ACCESS`** (`src/app/access/access.ts`) con los
   roles que la ven, tal como los fija el contrato para sus endpoints. Si la
   pantalla tiene una acción que opera un solo perfil, declararla en
   `ACTION_ACCESS`, en el mismo archivo. Ojo al resolver un merge de ese
   archivo: ya se perdió una ruta así (ver `tools/CAMBIOS.md`).
4. Si el mock no tiene el endpoint, agregarlo en `src/shared/mocks/`.
5. Si otro módulo necesita algo de éste, publicarlo en su `index.ts`.

### Acceso por perfil

Hay dos tablas en `src/app/access/access.ts`, y entre las dos son la única
fuente de quién puede qué.

**`ROUTE_ACCESS`: quién ve cada sección.** De ahí leen el rail (esconde los
ítems y los grupos que quedan vacíos) y `RequireAccess` (muestra "Sin acceso"
si alguien escribe la URL a mano).

| Ruta | Perfiles |
|---|---|
| `/inicio`, `/modelos` | Administrador y Abogado |
| `/causas`, `/clientes`, `/herramientas`, `/abogados`, `/estados-y-plazos`, `/calificaciones-legales` | Los tres |
| `/usuarios`, `/reportes` | Administrador |

- **Lo que no está declarado queda denegado para todos**, administrador
  incluido. Si una pantalla nueva no aparece en el menú, casi seguro falta
  acá.
- Las subrutas heredan el permiso de su sección: `/causas/8/acto` → `/causas`.
- Para preguntar por una ruta desde un componente, `useCanAccess(ruta)` de
  `@/app/access/useCanAccess`.
- **La pantalla de entrada** la decide `homeRoute(roles)`: `/inicio` si el
  usuario tiene algún tablero; si no (la Secretaría), `/causas` (CA-41.13).
  La usan todos los lugares que mandan "al inicio", logo incluido.

**`ACTION_ACCESS`: quién opera cada acción.** Es para lo que `ROUTE_ACCESS` no
puede decir: una pantalla que ven varios perfiles, con algo que es de uno solo.

| Acción | Perfiles | Dónde |
|---|---|---|
| `lawyers.create` | Administrador | "Registrar abogado" en `LawyersPage` |
| `lawyers.update` | Administrador | "Modificar" en cada fila de `LawyersPage` (CA-14.6) |
| `dashboard.lawyer` | Abogado | Pestaña "Mi día" de `/inicio` |
| `dashboard.administrator` | Administrador | Pestaña "Estudio" de `/inicio` |
| `cases.declarePrescription` | Administrador y Abogado | "Marcar prescripta" en el detalle de causa |
| `cases.downloadDocument` | Abogado y Secretaría | "Descargar" un documento que no es un expediente, en la tarjeta "Documentación" (D-103). El expediente lo descarga cualquiera |

```tsx
const canCreate = useCan('lawyers.create')   // de @/app/access/useCan

<Button
    disabled={!canCreate}
    title={canCreate ? undefined : 'Sólo el Administrador puede registrar abogados.'}
    onClick={openCreate}
>
    Registrar abogado
</Button>
```

- Por defecto el botón va **deshabilitado**, no escondido: es lo que hace el
  prototipo. Donde el prototipo lo esconde ("Marcar prescripta" para la
  Secretaría), se esconde.
- Una acción nueva se suma a `Action` y a `ACTION_ACCESS`, con el rol que fija
  la tabla de permisos del contrato (V5 §4).
- **Una acción que pueden los tres perfiles no se declara**: el botón va
  habilitado y listo. La tabla es sólo para lo que restringe. Registrar un
  cliente, una causa o una calificación legal no consulta nada (D-39).
- **No** escribas `roles.includes('ADMINISTRATOR')` en un componente: la regla
  tiene que seguir viviendo en un solo lugar.
- Con varios roles alcanza con que uno habilite: quien es Administrador y
  abogado a la vez ve los dos tableros y puede registrar abogados.

**Lo que no es un permiso por rol no va en ninguna de las dos tablas.**
Registrar un acto procesal o un acto interruptivo depende de la causa: sólo su
abogado responsable (D-30). Se resuelve en la pantalla con
`isResponsibleLawyer`.

**Los roles de la sesión se mantienen al día.** Se guardan en el login, pero
`AuthProvider` los vuelve a pedir al abrir la aplicación (`POST /auth/refresh`,
con "Verificando la sesión…" mientras tanto) y cada vez que renueva el token.
Si la ficha profesional cambió, la completa con `GET /lawyers/{lawyerId}`.
Quien se modifica a sí mismo en Usuarios ve el cambio en el momento
(`updateCurrentUser`), y si pierde el acceso a la pantalla va a su inicio. En
los tests, un `getBy…` justo después de renderizar con sesión tiene que
esperar antes con `waitForSession()` de `tests/setup/render.tsx`.

Todo esto es comodidad, no seguridad: quien autoriza es el backend (responde
`403`). Lo que se deshabilita acá es para no ofrecerle a nadie algo que no
puede usar.

---

## Verificar

Desde `frontend/`:

| Qué | Comando |
|---|---|
| Lint | `npm run lint` (oxlint) |
| Tipos de la app | `npx tsc -p tsconfig.app.json --noEmit` |
| Build (también chequea los tipos de los tests) | `npm run build` |
| Tests unitarios y de componentes | `npm test` |
| E2E, antes de un PR | `npm run test:e2e` (ver `TESTING.md`) |
| Matriz de criterios → tests | `npm run ca-matrix` (regenera `MATRIZ_CA.md`) |

Para desarrollar sin backend: `VITE_USE_MOCKS=true` en `.env.local`. Los
usuarios de prueba y sus contraseñas están en el README de los mocks.

## Problemas conocidos

Al 05/11/2026. No se arreglan al paso: cada uno es de su dueño.

1. **`npm test`: de 560, 559 pasan y 1 falla, a propósito** (corrida del
   05/11/2026). Los 9 E2E (`npm run test:e2e`) pasan.
   - `tests/unit/contract/endpoints.test.ts`: a `docs/openapi` le faltan cinco
     endpoints de V5 que el mock ya implementa: `GET /cases/{}/cover`,
     `GET /cases/{}/documents`, `GET /cases/{}/documents/{}/file`,
     `PATCH /cases/{}/procedural-acts/{}` y `POST /cases/{}/case-files`.
2. **`src/features/deadlines/` no tiene pantallas.** La pantalla "Vencimientos"
   no es de ninguna historia (`DECISIONES.md` §3). Sólo tiene el atajo local de
   la campana (`deadlines/CAMBIOS.md`).
3. **El rail dibuja dos cosas que el contrato deja afuera** (`DECISIONES.md`
   §3): el ítem "Reportes" (`/reportes`), que no tiene ruta y da la página de
   no encontrado, y la campana de "Notificaciones" de la barra superior
   (`AppLayout.tsx`). La campana sólo hace algo en desarrollo, como atajo
   para disparar la corrida diaria de los correos.
4. **Lint:** un warning, `react(only-export-components)` en
   `src/shared/components/ui/Icon.tsx:2`.
5. **El alta todavía dice "Tribunal o dependencia".** V5 cambió el rótulo del
   campo `court` a "Órgano interviniente" (V5 §3.7, D-91), y así lo dicen el
   prototipo, "Modificar causa" y su test (`CaseDetailPage.edit.test.tsx`).
   `CaseForm.tsx:178` quedó con el rótulo de V4. Ningún test del alta lo
   busca, así que el cambio no rompe nada; es del dueño del alta.
6. **Los campos de fecha siguen el idioma del navegador.** Son
   `<input type="date">` (el alta, "Modificar causa", las calificaciones, el
   acto procesal, el acto interruptivo y "Marcar prescripta"): en un Chrome en
   español se ven `dd/mm/aaaa`, en uno en inglés `mm/dd/yyyy`, y `lang="es"`
   no lo cambia. Se decidió dejarlo así (28/10/2026): el estudio usa Chrome en
   español. Las fechas que se muestran como texto salen siempre `dd/mm/aaaa`
   (`formatDate`). Forzarlo pediría un campo de fecha propio en shared, que
   cambia tests de otros y los archivos de HU-28.
7. **"Abrir" de la tarjeta "Documentación" se le ofrece a todos.** El
   Administrador sin otro rol no tiene la carpeta compartida en Drive (D-83),
   así que Drive le niega el acceso al abrir un documento. Se decidió dejarlo
   así (03/11/2026); "Descargar" sí sigue la regla (`cases.downloadDocument`).

## Checklist de un módulo

1. Tipos a partir del contrato.
2. El endpoint en los mocks, si no está.
3. `.api.ts`, sacando el envoltorio `{ data }`.
4. `.keys.ts` con los parámetros del listado en la clave.
5. Hooks, uno por archivo, con la caché resuelta en cada mutación.
6. Validación en `schemas/` y transformaciones en `utils/`.
7. Componentes del módulo, después de revisar `SHARED.md`.
8. Página, ruta, ítem del menú si falta, la ruta en `ROUTE_ACCESS` y sus
   acciones en `ACTION_ACCESS`.
9. Lo que otro módulo necesite, en el `index.ts`.
10. Tests según `TESTING.md` §11, y `npm run ca-matrix`.
11. Lint y build.
