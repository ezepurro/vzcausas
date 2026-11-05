# Causas — registro de cambios

Cambios sobre las pantallas de causas que no salen del prototipo ni del
contrato.

---

## 2026-11-03 — Generar expediente: la espera y el corte por tiempo (HU25)

**Pedido:** de Luciano Cipolla, al probar contra el backend: generar el
expediente tarda mucho y la pantalla no lo explica.

**Antes:** mientras se generaba, sólo el botón decía "Generando…". Los paneles
seguían activos: se podía reordenar, quitar documentos o cambiar las
observaciones, y lo que se veía dejaba de ser lo que se mandó. Si el pedido
pasaba los 120 s (`CASE_FILE_TIMEOUT_MS`), el aviso decía "Intentá de nuevo en
unos minutos", pero el backend lo guarda igual: reintentar dejaba otra
versión en la carpeta.

**Ahora:**

- **Mientras se genera**, los dos paneles quedan deshabilitados y atenuados:
  son un `fieldset disabled`, y el arrastre se apaga aparte
  (`CaseFileDocumentsPanel` con `disabled`). Bajo el botón, "Uniendo la
  carátula y 3 documentos. Puede tardar un par de minutos." y el tiempo que
  lleva (`generatingMessage`, `elapsedLabel`). El botón suma un aro que gira
  y debajo corre una barra que va y viene, la misma espera que la carpeta del
  detalle (quietos con movimiento reducido). Es una barra sin avance a
  propósito: el contrato no tiene cómo consultar en qué paso va el servidor,
  y por eso tampoco hay mensajes de etapa.
- **Si se intenta salir mientras se genera**, un aviso: "El expediente se
  está generando", con "Quedarme" y "Salir igual". El servidor lo termina
  igual, pero quien sale no ve el resultado y al volver lo generaría de
  nuevo. Cubre el rail, las migas, la flecha y el atrás del navegador
  (`useBlocker`); recargar o cerrar la pestaña muestra el diálogo del
  navegador (`beforeunload`), cuyo texto no se elige. Si la generación
  termina con el aviso abierto, se cierra y se queda en la pantalla.
- **Si no llega la respuesta** (corte por tiempo o red caída), en lugar del
  aviso genérico queda uno fijo en "Resultado": el expediente puede haberse
  generado, y antes de volver a generarlo conviene mirar "Documentación"
  (`UNCONFIRMED_CASE_FILE_MESSAGE`). Se vuelve a leer la carpeta, así el
  nombre estimado sube de versión si ya quedó guardado. El aviso se va al
  generar de nuevo.
- Los errores con respuesta (400, 422, 502) siguen como antes.

Tests: `components/cases/GenerateCaseFilePage.test.tsx` ("mientras genera…",
"si no llega la respuesta…", "si se intenta salir…", "Salir igual…"),
`unit/cases/caseFile.test.ts` ("mientras se genera"). La animación, el
contador y el diálogo de `beforeunload` no se prueban en jsdom.

---

## 2026-11-03 — "Descargar" en la tarjeta "Documentación" (HU38)

**Pedido:** del equipo (Facundo Fiorani). Para bajar un escrito había que
abrirlo en Drive y descargarlo desde ahí.

**Antes (prototipo):** cada documento tenía sólo "Abrir", que lo abre en
Drive. La descarga por la API (`GET /cases/{caseId}/documents/{documentId}/file`,
V5 §3.12) la usaba únicamente "Generar expediente" (decisión del 28/10/2026 en
`TESTING.md` §11).

**Ahora:** cada fila suma "Descargar", al lado de "Abrir", que baja el archivo
por la API como adjunto. No cambia el contrato: el endpoint ya preveía la
descarga de cualquier documento de la carpeta (HU38).

- Quién descarga sigue la regla de la API (D-103): el Abogado y la Secretaría,
  todos los documentos (`cases.downloadDocument` en `ACTION_ACCESS`); el
  expediente, cualquiera. El Administrador sin otro rol no tiene la carpeta
  compartida en Drive (D-83): en los demás documentos ve "Descargar"
  deshabilitado, con el motivo en el `title`. Ese texto no sale del prototipo.
- Un documento de Google llega exportado a PDF (V5 `:7595`) y se guarda con
  ".pdf" (`documentDownloadName`), como el nombre que pone el servidor.
- Mientras baja, sólo el botón de esa fila queda deshabilitado. Si Drive no
  responde, un aviso con el mensaje del servidor; la lista queda.
- En el teléfono (720px) los botones bajan a su renglón, debajo del nombre:
  al lado, el nombre quedaba en un par de letras.
- `useDownloadCaseDocument` recibe el nombre del archivo (`fileName`) en vez
  de calcularlo: `api/` no depende de `utils/`.

El aspecto se pidió a Claude Design; si cambia, se ajusta la tarjeta. Tests:
`components/cases/CaseDetailPage.documents.test.tsx` ("descarga (CA-38.7)"),
`unit/app/actionAccess.test.ts`, `unit/cases/caseDocument.test.ts`.

---

## 2026-11-03 — Flecha de volver en las pantallas de causas

**Pedido:** del equipo (Facundo Fiorani). Para volver había que usar el botón
atrás del navegador o el rail, que deja en la entrada de la sección.

**Antes (prototipo):** sólo las migas, que llevan siempre a `/causas` aunque se
haya entrado a la causa desde Inicio.

**Ahora:** una flecha chica antes de las migas (`Breadcrumbs` con `onBack`) en
el detalle, Registrar causa, Registrar o Modificar acto (`proceedings/`) y
Generar expediente. Vuelve a la pantalla anterior de la aplicación
(`useGoBack`); si se entró por la URL, va a la pantalla de la que cuelga: el
listado desde el detalle y el alta, el detalle desde el acto y el expediente.

- Volver o guardar en el acto y "Volver a la causa" del expediente también
  vuelven atrás en lugar de sumar el detalle al historial: si no, la flecha
  del detalle llevaría de nuevo al formulario.
- Registrar una causa reemplaza el alta por el detalle en el historial, por lo
  mismo.
- La flecha del alta descarta el borrador, como la miga "Causas".

Los filtros del listado siguen sin conservarse al volver: viven en el estado de
la página, no en la URL. Quedó para más adelante.

---

## 2026-10-29 — Generar expediente (HU25) y vista previa de la carátula (HU24)

**Pedido:** decisiones de Luciano Cipolla al programar la pantalla, donde el
prototipo no alcanza o choca con el contrato.

**Antes (prototipo):** la pantalla "Generar expediente" ofrece todos los
documentos que no son expediente, ordena sólo arrastrando y dibuja la hoja de
carátula en HTML, sobre una imagen de la plantilla.

**Ahora** (`GenerateCaseFilePage` en `/causas/:caseId/expediente`):

- **Sin carpeta creada** la pantalla abre igual: la vista previa funciona
  (CA-24.9), la lista dice "La carpeta de la causa todavía no está creada en
  Drive." y "Generar PDF" queda deshabilitado, en lugar de esperar el `422
  CASE_FOLDER_NOT_AVAILABLE`.
- **Un documento que no se puede convertir** (`convertibleToPdf: false`) se
  muestra en "No incluidos" con "No se puede convertir a PDF" e "Incluir"
  deshabilitado. No se elige solo: daría `422 DOCUMENT_NOT_CONVERTIBLE`.
- **El nombre de "Resultado"** antes de generar se estima con la versión más
  alta de la carpeta + 1 (`caseFileNamePreview`). La versión la lleva el
  servidor: después de generar se muestra el nombre que devuelve.
- **Orden:** además del arrastre del prototipo (desde toda la tarjeta, con
  mouse o con el dedo), cada documento lleva "↑" y "↓". Sirven con el
  teclado, y son lo que prueba el orden: jsdom no calcula posiciones, así que
  el arrastre no tiene test.
- **Colores** de los recuadros "PDF" / "DOC": los tokens `danger` y `primary`
  en lugar de los hexadecimales del prototipo.
- **Vista previa de la carátula:** muestra el PDF de `GET /cases/{caseId}/cover`,
  no una hoja dibujada en el front. D-94 pide que lo que se ve sea lo que se
  imprime, y las partes de cada recuadro las decide el backend. Se presenta
  como el prototipo (la hoja sola sobre el fondo oscuro, sin la barra del
  visor de PDF en Chrome y Edge), en `CoverPreviewModal`. Con el mock la hoja
  es texto suelto (`pdf.ts`): la del estudio llega con el backend.
- **"Modificá los datos de la causa"** abre "Modificar causa" en la misma
  pantalla, como el prototipo. Para eso la orquestación del diálogo pasó de
  `CaseDetailPage` a `api/useCaseEdit.ts` (acordado con Facundo Fiorani), que
  usan las dos pantallas. El hook importa dos tipos de `components/`
  (`CaseEditFormProps`, `SelectedQualification`), la validación de
  `schemas/case.schema` y cuatro funciones de `utils/` (`buildCasePatch`,
  `caseForm`, `suggestedCaption`, `toFormErrors`): es el único archivo de
  `api/` que importa algo más que `types/`.

---

## 2026-10-28 — Línea de vida: "Modificar" no se ofrece en una causa prescripta

**Pedido:** decisión del equipo al planificar HU28 (Ezequiel Purro), donde el
prototipo no alcanza.

**Antes (prototipo):** cada acto procesal de la línea de vida lleva
"Modificar", en cualquier causa.

**Ahora:** en una causa marcada prescripta (`prescriptionDeclaration` distinto
de `null`) la línea de vida no dibuja "Modificar" (`canModifyActs` de
`CaseTimeline`, desde `CaseDetailPage`). Los actos de una causa "Prescripta"
no se modifican: el backend responde `422 CASE_IN_TERMINAL_STATE` (D-99,
CA-28.9), así que ofrecer el botón sólo llevaría a un error. Si alguien entra
a `/causas/:caseId/acto/:actId` escribiendo la URL, el `422` se muestra con su
mensaje al guardar. En las demás causas terminales el botón sigue, porque ahí
corregir el acto que la cerró es posible (CA-28.8).

---

## 2026-10-21 — Registrar causa: borrador y calificaciones dadas de baja

**Pedido:** que lo cargado en "Registrar causa" no se pierda al irse a otra
pantalla, sin perder la posibilidad de salir y volver con el formulario vacío.

**Antes:** el formulario vivía sólo en el estado de la página. Ir a otra
sección del rail lo desmontaba y al volver arrancaba vacío.

**Ahora:**

- Cada cambio se guarda como borrador en `sessionStorage`
  (`utils/caseDraft.ts`), con la clave `vz-draft:case:{id del usuario}`. Dura
  lo que la pestaña. El formulario sin tocar no se guarda.
- Al volver con un borrador, un modal pregunta "Tenés una causa sin terminar":
  **Recuperar** lo carga, **Empezar de nuevo** lo borra. No se cierra de
  ninguna otra forma: ni con Escape ni con un click en el fondo. Por eso usa
  `Modal` y no `FormModal`, que con esos dos gestos llama a `onCancel`.
- El borrador se borra al registrar la causa, con Cancelar o la miga "Causas",
  con "Empezar de nuevo" y al cerrar sesión a pedido del usuario
  (`clearDrafts()` de `shared/lib/drafts.ts`, desde `AuthProvider`). Si la
  sesión se cierra por un token vencido **se conserva**: quien vuelve a entrar
  lo recupera. Como la clave lleva el usuario, otro que entre en la misma
  pestaña no lo ve.
- Un borrador con otra forma que la del formulario actual —claves de más o de
  menos, o un valor de otro tipo— se descarta sin preguntar. Así, sumar o
  sacar un campo de `CaseFormValues` invalida solo los borradores viejos.
- Se guardan sólo los valores: ni los errores ni el modal de cliente o
  calificación que estuviera abierto.

**Calificaciones dadas de baja.** Una calificación elegida que ya no viene en
el listado —se dio de baja mientras se cargaba la causa, o venía en un
borrador— antes desaparecía de la pantalla pero seguía viajando en el `POST`,
y el `400` del backend no se podía corregir: la fila con "Quitar" no existía.
Ahora se dibuja como "Calificación dada de baja" con su botón "Quitar"
(`UnavailableQualification` en `LegalQualificationPicker`), no cuenta para la
prescripción del resumen, y "Registrar causa" no sale hasta que se quite. El
cliente y el abogado no cambian: el select queda sin elegir y el `400` del
backend marca el campo (CA-18.10).

**Límite conocido:** el listado de calificaciones se pide con `limit: 100`
(`OPTIONS_LIMIT` en `RegisterCasePage`). Con más de 100 vigentes, las que
quedan afuera se verían como dadas de baja.
