# Tanda 14, segunda parte — revisión a ojo

13/11/2026 · Facundo con Claude · rama `feat/auditoria-front` · el recorrido no tocó
código; H-56 se arregló después, el mismo día (ver "Arreglo de H-56"). Rutas relativas a `frontend/`.

Es lo que la primera parte ([20](20-TANDA14_VISUAL_PARTE1.md)) dejó "sin
verificar" porque el panel del navegador estaba oculto. Esta vez estuvo a la
vista: todo lo de abajo se miró en capturas, con mocks, en el Chromium del
panel (Chrome 156), a 1366 × 768 y a 375 × 812 salvo donde dice otra cosa.

## En pocas líneas

- **Nada roto.** Los cinco modales entran en el teléfono, el tablero "Estudio"
  se lee bien en los dos anchos, las fichas a 1.280 px y el bloque de error se
  ven como se esperaba.
- **Un hallazgo visual para arreglar** (la flecha del `<select>` no es la del
  selector con filtro, H-56) y **uno menor** (el pie del listado dice "Sin
  resultados" mientras carga o falla, H-57). Ninguno se tocó.
- Cuatro observaciones que no son errores, para decidir si se hace algo.

## 1. Qué se miró

| # | Qué | Con quién | Resultado |
|---|---|---|---|
| 1 | Borde de los campos (H-43), en "Registrar causa", a 1366 px | `mrios` | Bien: el borde se distingue del fondo del panel; en error, fondo rosado, borde y mensaje rojo. La flecha del selector con filtro no desaparece con el campo en error |
| 2 | Flecha del `<select>` y del selector con filtro, a 1366 px | `mrios` | **No son iguales**: ver H-56 |
| 3 | Tablero "Estudio" | `supervision` | Bien. A 1366 px: banda de números, "Vencimientos del estudio" con sus filtros, "Alertas de prescripción" y "Carga del equipo", sin textos cortados. A 375 px: la banda pasa a 2 × 2 con "Cartera por fuero" debajo, los paneles se apilan, los filtros de vencimientos deslizan, sin scroll horizontal |
| 4 | Modales en el teléfono: modelo, acto interruptivo, "Marcar prescripta", abogado y usuario | `mrios` (los tres primeros), `supervision` | Bien los cinco: 359 px de ancho con 8 px de margen, la `×` y los dos botones del pie a la vista, sin scroll horizontal. El de usuario ocupa el alto entero (792 de 812 px) y desliza por dentro con el pie fijo |
| 5 | Notas de botones deshabilitados en el teléfono | `gestion` (Abogados); `mrios` en la causa 4 y `supervision` en la causa 1, vistas con los arreglos de la tanda 15 ([21](21-TANDA15_PERFILES.md)) | Bien: la nota va debajo de la descripción de la página (Abogados) o junto a sus botones (detalle), en un renglón o dos |
| 6 | Tabla en fichas a 1.280 px | `gestion`, Causas | Bien: una ficha por causa con la carátula de título, cuatro datos en fila, el vencimiento y "Ver detalle". Ver la observación A |
| 7 | Bloque de error con "Reintentar" | `gestion`, Clientes con un 500 forzado y 2,5 s de demora | Bien: título, mensaje del servidor y botón centrados en el panel. Ver H-57 y la observación B |

## 2. Hallazgos

| Id | Gravedad | Qué | Dónde | Propuesta |
|---|---|---|---|---|
| **H-56** | Baja (visual) | En Chrome, la flecha de un `<select>` es un **triángulo relleno** y la del selector con filtro (`SearchSelect`) es un **chevron fino**. En "Registrar causa" están a la vista a la vez: "Fuero" y "Cliente". La tanda de Facundo había igualado las dos (`src/styles/controls.css:100`), pero donde el navegador entiende `appearance: base-select` el `<select>` deja de usar el fondo y dibuja `::picker-icon`, con el ícono por defecto del navegador (`controls.css:208` a `:235`). Medido: `background-image: none` en el `<select>` y el SVG en el campo del selector | `src/styles/controls.css:231` | Darle a `::picker-icon` el mismo dibujo: `content: var(--vz-select-arrow)`. **Sin probar a ojo**: las capturas dejaron de responder antes de poder verlo. Probar también que siga girando al abrir |
| **H-57** | Baja | El pie de un listado dice **"Sin resultados"** y muestra "Anterior" y "Siguiente" mientras la tabla carga (debajo del esqueleto) y cuando falló (debajo de "No se pudieron cargar los clientes"). "Sin resultados" es falso en los dos casos | Visto en Clientes; el pie es de `Pagination`, así que es probable que pase en los ocho listados (sin verificar en los otros) | No dibujar el pie mientras no hay datos, o que no diga nada. Decidir cuál |

## 3. Observaciones (no son errores)

| | Qué | Comentario |
|---|---|---|
| A | A 1.280 px las fichas de Causas muestran dos causas y media por pantalla; la tabla mostraba unas ocho | Es el costo de la decisión de la primera parte (fichas cuando la tabla no entra). Alternativa, si molesta: sacar una columna entre 1.181 y 1.360 px. Decisión del equipo |
| B | En Clientes, "Reintentar" vuelve al esqueleto de carga; el botón no llega a decir "Reintentando…" | No está mal: se entiende que está cargando. "Reintentando…" lo cubre el test de `LoadError` |
| C | En "Estudio" a 1366 px, "Vencimientos del estudio" desliza por dentro: con el puntero encima, la rueda mueve la lista y no la página | Es del diseño del tablero. Anotado por si resulta incómodo en uso |
| D | "Registrar modelo formal" dice "Arrastrá el archivo acá" también en el teléfono, donde no se arrastra | El enlace "elegilo desde la computadora" funciona igual. De texto |

## Arreglo de H-56

13/11/2026, **sin commitear**. `.vz-select::picker-icon` lleva ahora el mismo
dibujo que la flecha de fondo (`content: var(--vz-select-arrow)`,
`src/styles/controls.css:231`). Es una regla de CSS adentro del
`@supports (appearance: base-select)`: donde el navegador no lo entiende,
nada cambia.

- **Visto**, en el Chromium del panel a 1366 px: "Fuero" en "Registrar causa"
  muestra el chevron fino, igual que el selector con filtro. Medido: el
  `content` de `::picker-icon` es el SVG en los dos `<select>` de la
  pantalla.
- **Sin verificar**: que la flecha siga girando al abrir el desplegable (las
  capturas volvieron a fallar), el `<select>` deshabilitado y en error, y
  los demás `<select>` de la aplicación. No se corrieron tests: no cambió
  código de `src/` fuera del CSS.

## Verificación

| Qué | Resultado |
|---|---|
| Navegador, con mocks, panel a la vista | Lo de la sección 1, en capturas. Los anchos y la falta de scroll horizontal, además, medidos en el DOM |
| Código | Sin cambios en esta tanda: no se corrieron lint, tipos ni tests |

**Sin verificar:**

- El arreglo propuesto para H-56 (ver su fila).
- El cambio de tabla a fichas **en vivo**, redimensionando entre 1.180 y 1.366
  px (lo cubre `tests/components/shared/DataTable.stacked.test.tsx`).
- Usuarios, Inicio y Modelos con error forzado: se miró Clientes; es el mismo
  componente (`LoadError`).
- Las fichas de Usuarios y de Clientes a 1.280 px: se miró Causas.
- El teclado del teléfono tapando un campo: no se puede ver sin un teléfono.
- **El cursor en "Fuero"**: sigue pendiente, necesita Chrome real
  ([20](20-TANDA14_VISUAL_PARTE1.md), sección 5).
