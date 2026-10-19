# Herramientas — registro de cambios

Sección "Herramientas" del rail (`/herramientas`): accesos directos a sitios
externos que el estudio usa a diario (PDF, normativa, organismos, oficina).

**No está en el prototipo ni en el contrato.** No tiene endpoint: el catálogo
es fijo y vive en el front. Si algún día se administra desde el sistema, hará
falta un endpoint nuevo y pasar por el contrato (ver `CLAUDE.md`, "No inventes
endpoints").

## Cómo sumar una herramienta

Agregarla en `utils/catalog.ts` (`TOOLS`). La página arma sola las secciones,
las pestañas, los contadores y la búsqueda. `featured: true` la suma a la
franja de "Accesos rápidos". Para un grupo nuevo: sumarlo a `ToolCategory` y
`TOOL_CATEGORIES` (`types/tool.ts`), a `CATEGORY_INFO` (`utils/catalog.ts`) y
darle su tono en `styles/tools.css` (`.vz-tool--<grupo>`).

**Logo:** PNG cuadrado de 128 px con fondo transparente en
`public/tools/<id>.png`, y `logo: logo('<id>.png')` en el catálogo. Sin logo
se muestra `monogram`; si el archivo no carga, también. `brand` es el color de
marca (filete de arriba y borde al pasar el mouse). El test
`tests/unit/tools/filterTools.test.ts` falla si un logo declarado no existe.

---

## 2026-10-18 — Sólo las herramientas del estudio, sin pestañas

Pedido del equipo: quedan **sólo las 7 de la página vieja** y se ve el
catálogo entero, sin filtro por grupo.

- **Se sacaron las 9 propuestas** (Carta documento online del Correo, CSJN,
  SAIJ, Boletín Oficial de Córdoba, Boletín Oficial de la Nación, calculadora
  de intereses del BCRA, feriados, PDF24 y Google Drive). Lo que se averiguó de
  cada una queda en la entrada de abajo, por si se quiere volver a sumar alguna.
- **Se sacaron las pestañas.** `ToolsPage` ya no tiene el estado `category` y
  `filterTools` dejó de recibir el grupo: sólo filtra por la búsqueda, que
  sigue. La franja de accesos rápidos se ve mientras no se busca.
- **Quedan dos grupos** en lugar de cuatro, para no tener secciones de una
  sola tarjeta:
  - **Poder Judicial de Córdoba**: Servicios Extranet, Justicia de Córdoba,
    Tasa de Justicia y Jurisemia (pasa acá desde "Consulta jurídica": es un
    servicio del PJ).
  - **Trámites y documentos**: ARCA, iLovePDF e Imprimir carta documento.
- Se borraron de `public/tools/` los 8 logos que ya no se usan. Quedan
  `justicia-cordoba.png`, `arca.png` e `ilovepdf.png`.
- `styles/tools.css`: quedan sólo los tonos de `judicial` y `documents`.
- Tests: se quitó el del filtro por grupo y los ejemplos de búsqueda usan
  herramientas que siguen ("bancor" → Tasa de Justicia).
- `filterTools.ts`: el rango de tildes del regex se volvió a escribir con
  escapes (`̀-ͯ`); en una edición anterior había quedado con los
  caracteres literales.

Verificación: `tsc` de la app y `oxlint` del módulo sin errores, 8 de 8 tests
de `tests/unit/tools`, y se miró la página en el navegador con los mocks.

---

## 2026-10-18 — Herramientas reales, logos y color de marca

### Las 7 herramientas de la página vieja (las pasó el equipo)

Se revisaron una por una el 18/10/2026: las siete responden bien.

| Herramienta | URL | Estado / cambio |
|---|---|---|
| Servicios Extranet (SAC para Auxiliares) | `justiciacordoba.gob.ar/JusticiaCordoba/extranet.aspx` | OK, sin cambios. Pide usuario |
| iLovePDF | `ilovepdf.com/es` | OK, sin cambios |
| Justicia de Córdoba (portal) | `justiciacordoba.gob.ar/JusticiaCordoba/Inicio/index.aspx` | OK, sin cambios |
| Jurisemia | `justiciacordoba.gob.ar/Jurisemia/#/home` | OK, sin cambios. Buscador semántico de jurisprudencia del Boletín Judicial, abierto al público desde agosto de 2026 |
| Tasa de Justicia | `justiciacordoba.gob.ar/tasajusticia/Comprobantes/_Comprobantes_Administrativo.aspx` | OK, sin cambios. Genera la boleta para pagar en Bancor o en línea |
| ARCA (ex AFIP) | era `afip.gob.ar/landing/default.asp` → **ahora `arca.gob.ar/landing/default.asp`** | La de AFIP sigue andando, pero ya muestra el portal de ARCA. Se usa el dominio nuevo |
| Imprimir carta documento | `imprimir-carta-documento.preimpresos.com` | OK, sin cambios. Es un sitio de terceros, no del Correo: imprime sobre el formulario preimpreso. Por eso se sumó también la opción oficial online (ver abajo) |

**La revista de la página vieja no se incluyó:** el link no funciona y no
hay URL para verificar. Si aparece la dirección nueva, se suma.

### Propuestas (no estaban en la página vieja)

Todas se verificaron el 18/10/2026 (responden y son el sitio oficial).

| Herramienta | URL | Por qué |
|---|---|---|
| Carta documento online (Correo Argentino) | `miscomunicacionesdigitales.com.ar` | Servicio oficial del Correo para redactar, pagar y enviar cartas documento y telegramas sin ir a la sucursal. Complementa la de imprimir |
| Jurisprudencia de la Corte (CSJN) | `sj.csjn.gov.ar/homeSJ/` | Fallos y sumarios de la Corte Suprema |
| SAIJ | `saij.gob.ar` | Normativa y jurisprudencia nacional (ya estaba en el alta) |
| Boletín Oficial de Córdoba | `boletinoficial.cba.gov.ar` | Normativa y edictos de la provincia |
| Boletín Oficial de la Nación | `boletinoficial.gob.ar` | Ya estaba en el alta |
| Calculadora de intereses BCRA | `bcra.gob.ar/calculadora-intereses-creditos-laborales-judicializados/` | Tasa para uso de la justicia en créditos laborales. A dónde llevaba la URL vieja "tasa-de-interes-para-uso-de-la-justicia" |
| Feriados nacionales | `argentina.gob.ar/feriados` | Para contar plazos hábiles |
| PDF24 Tools | `tools.pdf24.org/es/` | OCR de escaneos, gratis (ya estaba en el alta) |
| Google Drive | `drive.google.com` | Las carpetas de las causas (HU39) (ya estaba en el alta) |

**Se sacaron** Smallpdf y DeepL, que estaban en el alta: Smallpdf repetía lo
que hace iLovePDF y DeepL no tiene que ver con el trabajo del estudio.

**Quedaron afuera por no poder verificarlas:**
- Colegio de Abogados de Córdoba (`abogado.org.ar`): el dominio es el suyo,
  pero el sitio bloquea las consultas automáticas y no se pudo ver la página.
- Caja de Abogados de Córdoba: no apareció el sitio oficial
  (`cajaabogados.org.ar` es la de Buenos Aires).

### Grupos nuevos

| Antes | Ahora |
|---|---|
| Documentos PDF | **Poder Judicial de Córdoba**: Extranet, portal, Tasa de Justicia |
| Consulta jurídica | **Consulta jurídica**: Jurisemia, CSJN, SAIJ, boletines oficiales |
| Organismos y trámites | **Organismos y cálculos**: ARCA, BCRA, feriados |
| Oficina | **Documentos y correspondencia**: iLovePDF, PDF24, cartas documento, Drive |

Destacadas en "Accesos rápidos": Servicios Extranet, Tasa de Justicia,
Jurisemia e iLovePDF.

### Logos y color de marca

- **Los logos se bajaron una vez de cada sitio** (favicon, ícono de app o
  logo del encabezado), se recortaron y se pasaron a PNG de 128 px en
  `public/tools/`. Se sirven desde la app: la página no le pide nada a
  ningún sitio externo al cargar.
- El escudo del Poder Judicial se recortó del logo de la Extranet y lo usan
  sus cuatro servicios, Jurisemia incluido: su favicon propio es de 16 px y
  no se lee. La "SJ" de la Corte se recortó del encabezado de su sitio.
- **Sin logo:** el Boletín Oficial de la Nación (su ícono es de 32 px y no se
  distingue) y la de imprimir carta documento (no tiene). Llevan iniciales en
  el tono del grupo.
- **Color de marca (`brand`):** el filete de arriba de cada tarjeta, el
  borde al pasar el mouse y el filete izquierdo en la franja. **Es la única
  excepción a "no hardcodear colores"** de `tokens.css`: es un dato de cada
  sitio, no del tema, y vive en el catálogo, no en los componentes. Sin
  `brand`, se usa el tono del grupo.

### Archivos

| Archivo | Cambio |
|---|---|
| `types/tool.ts` | Grupos nuevos (`judicial`, `legal`, `government`, `documents`); campos `logo` y `brand` |
| `utils/catalog.ts` | Catálogo rehecho: 16 herramientas |
| `utils/brandStyle.ts` | Nuevo: pasa `brand` a la variable CSS `--vz-tool-brand` |
| `components/ToolSeal.tsx` | Nuevo: el sello con el logo, o las iniciales si no hay o no carga |
| `components/ToolCard.tsx`, `components/QuickAccessBand.tsx` | Usan `ToolSeal` y el color de marca |
| `src/styles/tools.css` | Tonos de los grupos nuevos, filete de marca, sello con logo, franja con las destacadas en una fila, dominios largos con "…", sin subrayado ni cambio de color al pasar el mouse |
| `public/tools/*.png` | Nuevos: 11 logos |
| `tests/unit/tools/filterTools.test.ts` | Grupos nuevos y test de que cada logo existe |

Afuera del módulo no se tocó nada más que `public/tools/`.

### Verificación

- `tsc` de la app sin errores, `oxlint` sin avisos en el módulo, 9 de 9
  tests de `tests/unit/tools`.
- Se miró en el navegador con los mocks (1440 px y 390 px) y con el mouse
  encima de una tarjeta.

---

## 2026-10-18 — Alta de la sección

### Archivos nuevos (dentro del módulo)

| Archivo | Qué es |
|---|---|
| `types/tool.ts` | `Tool`, `ToolCategory` y `TOOL_CATEGORIES` |
| `utils/catalog.ts` | `TOOLS` (9 herramientas de ejemplo) y `CATEGORY_INFO` (rótulo y bajada de cada grupo) |
| `utils/filterTools.ts` | `filterTools` (búsqueda sin tildes ni mayúsculas en nombre, descripción y etiquetas), `groupByCategory`, `displayHost` |
| `components/ToolCard.tsx` | Tarjeta: sello con iniciales en el tono del grupo, nombre, dominio, descripción y etiquetas. Toda la tarjeta es el enlace |
| `components/QuickAccessBand.tsx` | Franja oscura de "Accesos rápidos" con las destacadas, con el lenguaje de la banda de Inicio |
| `components/ToolSection.tsx` | Título del grupo con contador y la grilla de tarjetas |
| `pages/ToolsPage.tsx` | La página: encabezado, franja, pestañas por grupo, buscador y catálogo |
| `api/.gitkeep`, `schemas/.gitkeep` | Las seis carpetas del módulo, aunque queden vacías |

### Archivos nuevos (fuera del módulo)

| Archivo | Qué es |
|---|---|
| `src/styles/tools.css` | Estilos de la sección (`.vz-tool*`, `.vz-tools-*`). Sin colores nuevos: cada grupo toma tokens semánticos (PDF `danger`, jurídico `primary`/`ok`, organismos `warn`, oficina neutro) |
| `tests/unit/tools/filterTools.test.ts` | Búsqueda, filtro por grupo, agrupado y sanidad del catálogo |

### Archivos tocados (fuera del módulo), una línea cada uno

| Archivo | Cambio |
|---|---|
| `src/app/layouts/AppLayout.tsx` | Ítem `Herramientas` en "Trabajo diario", debajo de "Modelos" |
| `src/app/access/access.ts` | `'/herramientas': EVERYONE` en `ROUTE_ACCESS` |
| `src/app/router/index.tsx` | Import de `ToolsPage` y ruta `herramientas` dentro de `RequireAccess` |
| `src/shared/components/ui/Icon.tsx` | Iconos `tools` (llave, para el rail) y `external` (flecha diagonal, para las tarjetas) |
| `src/styles/index.css` | `@import './tools.css'` |

### Decisiones

- **Visible para los tres perfiles.** Son enlaces públicos; no hay nada que
  restringir.
- **El buscador no lleva demora** (`useDebouncedValue`): filtra en memoria y no
  sale ningún pedido.
- **Los enlaces abren en pestaña nueva** con `rel="noopener noreferrer"`, y
  llevan un texto oculto "(se abre en una pestaña nueva)" para lectores de
  pantalla.
- **Sin favicons de terceros:** el sello con iniciales evita pedir imágenes a
  servicios externos y mantiene la paleta del sistema.
- **La franja de accesos rápidos** sólo se ve con "Todas" y sin búsqueda; al
  filtrar se muestra sólo lo que coincide.
- **Nota al pie del catálogo** recordando que son sitios externos y que hay
  que revisar su privacidad antes de subir escritos con datos de clientes.
- **Sin `index.ts`:** ningún otro módulo usa nada de éste; el router importa la
  página directo, como con `dashboard`.

### Verificación

- `npx tsc -p tsconfig.app.json --noEmit`: sin errores.
- `oxlint` sobre lo tocado: sólo el aviso `only-export-components` de
  `Icon.tsx`, que ya estaba (exporta `ICONS`).
- `tests/unit/tools`: 8 de 8 pasan. En `AppLayout.test.tsx`, `access.test.ts`
  y `actionAccess.test.ts` fallan 3 tests **que ya fallaban antes de este
  cambio** (Sprint 3 en rojo: `/modelos` para la Secretaría y la acción de
  marcar prescripta). No se tocaron.

### Catálogo inicial

PDF: iLovePDF ★, Smallpdf, PDF24 Tools · Consulta jurídica: SAIJ ★, Boletín
Oficial · Organismos y trámites: Poder Judicial de Córdoba ★, ARCA ·
Oficina: Google Drive ★, DeepL. (★ = destacada)
