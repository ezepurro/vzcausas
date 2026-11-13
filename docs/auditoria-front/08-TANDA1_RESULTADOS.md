# Plan B · Tanda 1 — Accesibilidad sin riesgo

12/11/2026 · rama `feat/auditoria-front` · cambios en el árbol de trabajo,
**sin commitear**. Rutas relativas a `frontend/`. Los `H-xx` son los de
[07-REVISION_VISUAL.md](07-REVISION_VISUAL.md).

Sólo se tocaron archivos propios del plan B
([06-PLAN_B_VISUAL.md](06-PLAN_B_VISUAL.md)): CSS de `src/styles/` y
componentes de `src/shared/components/ui/`. Ningún archivo compartido, ningún
texto visible de botón cambiado, ningún corte de pantalla nuevo.

## Qué cambió

| Hallazgo | Solución | Archivos |
|---|---|---|
| H-34 · El foco no se veía sobre fondo oscuro | Token `--vz-focus` (vale `--vz-primary`); `:focus-visible` lo usa; el rail y la banda del tablero lo redefinen a `--vz-rail-fg-on` | `src/styles/tokens.css`, `base.css`, `shell.css`, `dashboard.css` |
| H-38 · Rótulos de la banda del tablero cortados | El rótulo usa hasta dos renglones; todos reservan ese alto y se apoyan abajo, así los números quedan alineados | `src/styles/dashboard.css` |
| H-39 · Nombre del usuario cortado en el rail | Hasta dos renglones (`line-clamp`) y `title` con el nombre completo | `src/styles/shell.css`, `src/shared/components/ui/RailUser.tsx` |
| H-42 · Primario deshabilitado ilegible (1,66:1) | Fondo `--vz-sunken`, borde `--vz-border`, texto `--vz-muted` (5,43:1) | `src/styles/controls.css` |
| H-40 (parte de CSS) · Acciones de fila al 72 % de opacidad | Sin opacidad: quedan en el color apagado (6,06:1). Se borraron las tres reglas de opacidad y la de `hover: none`, que ya no hacían falta | `src/styles/table.css` |
| H-25, H-52 · Botones `sm` de 28 px en el teléfono | 36 px debajo de 720 px. Los que ya tenían alto propio en el teléfono (acciones de ficha, paginado, chips) lo conservan | `src/styles/controls.css` |
| H-51 · "Volver" de 26 px y enlaces de las migas de 15 px | 36 px debajo de 720 px | `src/styles/shell.css` |
| H-25 · Botones del pie del rail (29×32) | 36×36 con el rail como menú (debajo de 1024 px) | `src/styles/shell.css` |
| H-33 · Filtros de "Mis plazos abiertos" en el teléfono | Ver "Hallazgo corregido" abajo | `src/styles/table.css` |
| H-41 · Pestañas sin teclado | Flechas, Inicio y Fin; un solo punto de tabulación; `aria-label` y `panelId` opcionales | `src/shared/components/ui/Tabs.tsx` |
| H-46 · Paginado sin región ni anuncio | `<nav aria-label="Paginación">` y el resumen con `aria-live="polite"` | `src/shared/components/ui/Pagination.tsx` |
| H-47 · Migas rotuladas "Migas" | `aria-label="Ruta de navegación"` | `src/shared/components/ui/Breadcrumbs.tsx` |

Test nuevo: `tests/components/shared/Tabs.test.tsx` (4 casos: tabulador,
flechas con vuelta, Inicio y Fin, nombre del grupo y `aria-controls`).

## Hallazgo corregido: H-33 era más grave

La ola 1 lo midió como "4 px de scroll" (BAJO). Mirándolo a 390 px: la fila
que envuelve a los chips (`.vz-panel__head > .vz-filters`) no se achicaba por
debajo de su contenido, medía 538 px dentro de un panel de 360 y se salía; el
panel la recortaba. **"Esta semana" y "Próximos" quedaban cortados y no se
podía llegar a ellos**, y el fondo de la cabecera se veía partido. Pasa a
MEDIO. Arreglo: `min-width: 0` en la fila y en el grupo de chips
(`src/styles/table.css`). Ahora la fila mide 332 px y desliza sus 542.

## Lo que no se hizo de la tanda

| Qué | Por qué |
|---|---|
| H-48 · Ojo de la contraseña con `aria-pressed` | El botón ya cambia su rótulo ("Mostrar contraseña" / "Ocultar contraseña"), que es una forma válida del patrón. Sumar `aria-pressed` con rótulo cambiante lo empeora. **Se retira el hallazgo** |
| H-50 · Puntos del calendario de 18×20 px | Agrandarlos no entra en una celda de 45 px con dos plazos; hacer tocable el día entero cambia el comportamiento de `DeadlineCalendar` cuando hay varios plazos. Queda para decidir |
| `aria-controls` en las pestañas de Inicio y de Estados | `Tabs` ya lo acepta (`panelId`), pero marcar el panel es en `HomePage.tsx` y `ProceduralStatesPage.tsx`, páginas compartidas. Se pide |

## Verificación

| Qué | Resultado |
|---|---|
| `npm run lint` | 0 errores; el warning conocido de `src/shared/components/ui/Icon.tsx:2` |
| `npx tsc -b` | Limpio |
| `npx vitest run` | **669 de 669** (104 archivos, 103 s). Se corrió antes del último ajuste de `table.css` (H-33), que es sólo CSS y jsdom no lo evalúa |
| Foco sobre el rail, 1366 px | Visto: contorno claro en "Causas" al tabular |
| Banda del tablero, 1366 px | Visto: "PRÓX. 5 DÍAS HÁBILES" y "MIS CAUSAS ACTIVAS" enteros, números alineados |
| Nombre en el rail, 1366 y 390 px | Visto: "Fernando G. Vázquez" en dos renglones |
| Acciones de fila en Usuarios, 1366 px | Visto |
| Chips de "Mis plazos abiertos", 390 px | Medido (332 de ancho, 542 de contenido) y visto |
| Migas y botón `sm` en el alta, 390 px | Medido: "Volver" 36×36, enlace 42×36, "Usar esta carátula" 36 de alto; sin desborde de página |

**Sin verificar:**

- El primario deshabilitado no se miró en pantalla: en el alta de causa
  "Registrar causa" no está deshabilitado (el ejemplo de H-42 estaba mal). El
  cambio vale para los `okDisabled` de los modales; falta mirar uno.
- Las pestañas con teclado en el navegador (sólo el test).
- El anuncio del paginado y el foco con un lector de pantalla real.
- 320, 768, 1024 y 1440 px después de los cambios; los otros tres perfiles.
- `npm run test:e2e` y `npm run build`: se corren al cerrar la ola.
- Al pasar de 1366 a 390 px en el emulador el rail se vio abierto un instante
  sin velo; parece la transición al cruzar el corte y es anterior a esta
  tanda. No se investigó.

## Para Luciano

- `Pagination` ahora es un `<nav>` llamado "Paginación" y `Breadcrumbs` se
  llama "Ruta de navegación": un test que busque `navigation` sin nombre en
  una página con tabla va a encontrar más de uno.
- `Tabs`: la pestaña no elegida tiene `tabIndex={-1}`. Los tests que hacen
  clic siguen igual; uno que llegue con `user.tab()` a una pestaña no elegida,
  no.
