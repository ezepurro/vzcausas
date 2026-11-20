# Tableros de Inicio — registro de cambios

Cambios sobre "Mi día" y "Estudio" (HU-41, HU-42) que no salen del prototipo
ni del contrato.

---

## 2026-11-19 — Reporte: renglón "Sin asignar" (D-145) y selector de mes

**"Sin asignar" en la carga por abogado.** Revisión de V6 del 17/11/2026:
`GET /reports/monthly` trae `unassigned` (`criminal`, `administrative`,
`amparo`, `total`), las causas huérfanas activas al cierre. Va como último
renglón de "Carga por abogado responsable", separado con una línea de puntos,
con el nombre apagado y **sin la línea del promedio**: no es un abogado y no
entra en el promedio, el mínimo ni el máximo. Sin huérfanas no se dibuja. Con
él, la suma de las barras da `summary.activeCases`. El tipo de las alertas de
prescripción admite `responsibleLawyer` en `null` (la pantalla no las
muestra; el PDF dice "Sin asignar").

**Selector de mes** (pedido de Luciano Cipolla: estilo, no lógica). Las
flechas y el mes van en un solo recuadro, del alto de los botones
(`‹ | Agosto 2026 ▾ | ›`), y "Último cerrado" pasa a ser un link chico al
costado. Los meses, la URL `?periodo=` y los deshabilitados en los extremos
no cambian, ni los nombres accesibles ("Mes anterior", "Mes del reporte",
"Mes siguiente", "Último cerrado").

**Tableros:** no cambian. No cuentan las huérfanas: cómo hacerlo está abierto
(C-49).

Tests: `components/dashboard/ReportsPage.test.tsx`.

## 2026-11-14 — "Reportes" (HU-43): lo que difiere del prototipo

La pantalla sigue a la de "Reportes" del prototipo, con estas diferencias, que
manda el contrato V6 §3.13 o que son de implementación:

- **Selector de mes** (rediseñado el 19/11/2026, ver arriba). Es un `<select>` nativo entre las flechas, no el
  calendario desplegable del prototipo. Ofrece los mismos meses (de
  `availableFrom` a `currentPeriod`, este marcado "(en curso)") y suma
  "Último cerrado" cuando no es el que se ve. El mes va en la URL
  (`/reportes?periodo=2026-08`).
- **"Promedio por abogado"** con un decimal (`14,1`), como manda el contrato.
  El prototipo lo redondea a entero.
- **"Causas por estado procesal" no se dibuja** (decisión de Luciano Cipolla,
  14/11/2026). **Se aparta de CA-43.9**, que lo pide con una pestaña por fuero:
  el backend lo sigue mandando en `proceduralStates` y la pantalla no lo usa.
- **Orden de los paneles** (misma decisión): arriba "Causas activas por fuero"
  y "Avance de la prescripción", lado a lado y con el mismo alto; después, a
  todo el ancho, "Causas ingresadas y archivadas por mes"; al final, "Carga por
  abogado responsable". El prototipo pone las barras al lado de la dona y la
  prescripción al final.
- **Las barras de ingresadas y archivadas llevan su cantidad** arriba de cada
  barra, y debajo del gráfico va el detalle del mes resaltado (ingresadas,
  archivadas, saldo y activas al cierre). Sin números, eran barras de colores
  sin escala.
- **El mes cerrado y el en curso.** Debajo del encabezado, "Mes cerrado ·
  datos al …" o la etiqueta "Mes en curso · datos al …" (CA-43.6).
- **El tramo `FROM_90`** dice "Desde el 90 %" (CA-43.10), no "Más del 90 %".
- La lista de alertas de prescripción y los plazos del mes no se dibujan en
  pantalla: el prototipo no los muestra y van en el PDF (CA-43.13).
- No hay número de reporte, versiones, "Guardar" ni "Regenerar" (D-117).

El mock calcula el reporte en cada pedido desde su base, también para los meses
cerrados: con dos simplificaciones (responsable y prescripción de hoy, no a la
fecha de corte). Solo sirve para ver la pantalla; la foto del mes es del backend.

### Archivos

| Archivo | Qué |
| --- | --- |
| `pages/ReportsPage.tsx` | La página |
| `components/report/*` | El selector, los indicadores y los cuatro gráficos (SVG y CSS) |
| `api/reports.api.ts`, `useMonthlyReport.ts`, `useDownloadMonthlyReport.ts` | Los dos endpoints |
| `types/monthlyReport.ts` | La respuesta, desde V6 L9341-9456 |
| `utils/reportPeriod.ts` | Los períodos `AAAA-MM` |
| `src/styles/reports.css` | Estilos |

---

## 2026-11-09 — "Estudio": las alertas de prescripción se desplazan adentro

**Pedido:** de Luciano Cipolla. Con muchas alertas, "Alertas de prescripción"
crecía sin tope y estiraba la columna lateral (y con ella "Vencimientos del
estudio"), mientras "Carga del equipo" ya se desplazaba adentro.

**Ahora**, sólo en "Estudio", la lista lleva `vz-dash-rows--scroll`: tope de
`26rem`, como "Carga del equipo" y "Causas para impulsar", y scroll propio. En
el teléfono se dibuja entera, como las otras listas. "Mi día" no cambia: ahí
el alto ya lo reparte la columna (`.vz-dash__row--filled`).

### Archivos

| Archivo                                     | Cambio        |
| ------------------------------------------- | ------------- |
| `components/PrescriptionAlertsPanel.tsx`    | Prop `scroll` |
| `components/AdministratorDashboardView.tsx` | La pasa       |

---

## 2026-11-09 — La pestaña y los filtros sobreviven a abrir una causa

**Pedido:** de Luciano Cipolla. En "Estudio", al filtrar por un responsable,
abrir una causa y volver con la flechita, Inicio caía en "Mi día" y el filtro
se perdía.

**Antes:** la pestaña (`HomePage`) y los filtros (urgencia en las dos vistas,
abogado en "Estudio") eran `useState`. Abrir la causa desmonta Inicio; al
volver se monta de nuevo con los valores iniciales: "Mi día" (CA-41.7) y sin
filtros.

**Ahora** viven en la URL (`/inicio?tablero=administrator&urgencia=overdue&responsable=3`),
con `useDashboardFilters`:

- Volver de una causa, el botón atrás del navegador y recargar conservan la
  pestaña y los filtros.
- Entrar a Inicio desde el menú no trae parámetros: "Mi día" sin filtros,
  como pide CA-41.7.
- Se escribe con `replace`: tocar un filtro no suma una entrada al historial.
- Cambiar de pestaña limpia los filtros, como antes (cada vista arrancaba con
  los suyos). Tocar la pestaña que ya se ve no los limpia.
- Un valor que no se entiende (`urgencia=xyz`, `responsable=abc`) cuenta como
  ausente; un abogado que no está en el equipo no filtra.

El mes del calendario sigue en el estado del componente: vuelve al mes actual.

### Archivos

| Archivo                                     | Cambio                                   |
| ------------------------------------------- | ---------------------------------------- |
| `hooks/useDashboardFilters.ts`              | Nuevo: lee y escribe los tres parámetros |
| `pages/HomePage.tsx`                        | La pestaña sale del hook                 |
| `components/AdministratorDashboardView.tsx` | Urgencia y abogado salen del hook        |
| `components/LawyerDashboardView.tsx`        | Urgencia sale del hook                   |

### Verificación

`tests/components/dashboard/HomePage.administrator.test.tsx`, "al volver de
una causa conserva "Estudio" y el abogado elegido" (falla sin el cambio).

---

## 2026-11-08 — Los tableros en el teléfono

**Pedido:** del equipo (Facundo Fiorani), dentro del repaso del responsive de
toda la aplicación (rama `refactor/front`). `dashboard.css` no tenía ningún
corte: en un teléfono los tableros eran los de escritorio, apretados.

**Antes**, a 375 px:

- Los cuatro números de la banda quedaban de a dos con los filetes corridos
  en el segundo renglón y los rótulos cortados ("Próx. 5 días há…", "Mis
  causas acti…").
- El calendario del mes eran 42 celdas de 6rem de alto con los plazos como
  "M." y "N.": no se leía nada y ocupaba más de una pantalla.
- Los cinco filtros de "Mis plazos abiertos" y "Vencimientos del estudio"
  quedaban apilados como botones a todo el ancho.
- Las listas ("Vencimientos del estudio", "Carga del equipo") scrolleaban
  adentro de la página.

**Ahora**, sólo debajo de 721 px (el corte de teléfono de `SHARED.md`):

- Los números van en una grilla de dos columnas, con el filete sólo entre
  las dos y el rótulo entero en dos renglones.
- El calendario entra entero: cada día con su número y un punto por plazo,
  del color de su urgencia. El nombre de la causa no se dibuja (no entra en
  una celda de 45 px), pero sigue siendo el nombre accesible del botón y su
  `title`; la lista de plazos de abajo lo dice completo.
- Los filtros por urgencia son una fila de chips que se desliza de costado
  (regla general de `table.css` para un `.vz-filters[role="group"]`).
- Las listas se dibujan enteras, sin scroll propio.
- La línea de vencimientos achica la columna de la fecha y el chip del plazo
  baja abajo de la carátula; en "Causas para impulsar", "Ver detalle" va a
  todo el ancho; en las alertas, la fecha de prescripción baja abajo de la
  carátula.

Arriba de 720 px nada cambia.

### Archivos

| Archivo                    | Cambio                                             |
| -------------------------- | -------------------------------------------------- |
| `src/styles/dashboard.css` | Bloque "teléfono" al final                         |
| `src/styles/table.css`     | La fila de chips de un `.vz-filters[role="group"]` |

### Verificación

En el navegador con los mocks, como `fvazquez`, "Mi día" y "Estudio" a
375 px, 820 px y 1440 px: sin scroll horizontal, los dos puntos de un día del
calendario en el mismo renglón, los filtros en una fila deslizable. A 820 px y
1440 px se ven como antes.

---

## 2026-10-18 — "Estudio": vencimientos con la altura de la columna lateral

**Pedido:** que "Vencimientos del estudio" mida lo mismo que "Alertas de
prescripción" + "Carga del equipo" juntas.

**Antes:** la fila de dos columnas (`.vz-dash__row`) alinea arriba
(`align-items: flex-start`) y la lista de vencimientos tenía su propio tope de
`40rem`, así que cada columna terminaba a una altura distinta.

**Ahora**, sólo en "Estudio" y sólo con las dos columnas lado a lado:

- La columna de vencimientos se estira hasta la altura de la lateral, y el
  panel queda fuera del flujo (`position: absolute; inset: 0`) para no
  empujar la altura de la fila: la pone la columna lateral.
- La lista de vencimientos ocupa lo que queda bajo la cabecera y se desplaza
  adentro (`flex: 1`, sin el `max-height` de `40rem`).
- Altura mínima de `24rem`, para que no quede chata si la lateral es corta.
- **Lado a lado** se decide con una container query sobre el ancho de la fila
  (`55rem`, lo que suman `34rem` + `20rem` + el espacio entre columnas), no
  sobre la ventana. Cuando las columnas se apilan (pantallas medianas y
  teléfono), cada una vuelve a su alto de siempre.
- "Mi día" no cambia: usa la fila sin la variante.

### Archivos

| Archivo                                     | Cambio                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `components/AdministratorDashboardView.tsx` | La fila suma la clase `vz-dash__row--matched`                                                  |
| `src/styles/dashboard.css`                  | La variante `.vz-dash__row--matched` y su container query, debajo de "disposición del tablero" |

### Verificación

- `tsc` de la app sin errores y 20 de 20 tests de `tests/components/dashboard`.
- En el navegador con los mocks, como `fvazquez`, pestaña "Estudio": a
  1440 px el panel de vencimientos y la columna lateral miden lo mismo
  (808 px) y la lista se desplaza adentro. A 1180 px y 390 px las columnas
  están apiladas y conservan su alto anterior.
