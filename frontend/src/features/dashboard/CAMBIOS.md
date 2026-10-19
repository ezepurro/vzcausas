# Tableros de Inicio — registro de cambios

Cambios sobre "Mi día" y "Estudio" (HU-41, HU-42) que no salen del prototipo
ni del contrato.

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
