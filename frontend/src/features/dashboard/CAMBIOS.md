# Tableros de Inicio — registro de cambios

Cambios sobre "Mi día" y "Estudio" (HU-41, HU-42) que no salen del prototipo
ni del contrato.

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

| Archivo | Cambio |
|---|---|
| `src/styles/dashboard.css` | Bloque "teléfono" al final |
| `src/styles/table.css` | La fila de chips de un `.vz-filters[role="group"]` |

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

| Archivo | Cambio |
|---|---|
| `components/AdministratorDashboardView.tsx` | La fila suma la clase `vz-dash__row--matched` |
| `src/styles/dashboard.css` | La variante `.vz-dash__row--matched` y su container query, debajo de "disposición del tablero" |

### Verificación

- `tsc` de la app sin errores y 20 de 20 tests de `tests/components/dashboard`.
- En el navegador con los mocks, como `fvazquez`, pestaña "Estudio": a
  1440 px el panel de vencimientos y la columna lateral miden lo mismo
  (808 px) y la lista se desplaza adentro. A 1180 px y 390 px las columnas
  están apiladas y conservan su alto anterior.
