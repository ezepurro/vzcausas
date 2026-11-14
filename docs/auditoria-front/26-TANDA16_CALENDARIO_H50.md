# Tanda 16 — el calendario en el teléfono (H-50)

13/11/2026 · Facundo con Claude · rama `feat/auditoria-front` · **sin
commitear**. Rutas relativas a `frontend/`. La propuesta (maqueta, teclado,
lector de pantalla y tests) se mostró antes de programar y Facundo la aprobó.

## Qué pasaba

- En el teléfono, cada plazo de "Agenda de plazos" era un punto de **18×20
  px**: muy chico para tocarlo, y sin texto que dijera de qué causa era.
- En cualquier ancho, un día con más de dos plazos mostraba **"+N más" como
  texto**: los plazos que no entraban en la celda no se podían abrir desde el
  calendario.

## Cómo quedó

Un día puede abrir, debajo de la grilla, **la lista de todos sus plazos**: el
título ("Martes 15 de septiembre · 3 plazos"), "Cerrar" y un renglón por plazo
con la carátula entera, el estado y cuándo vence. Cada renglón es un **enlace
de verdad** a `/causas/:id` (se abre en otra pestaña con Ctrl+clic, como el
rail).

| Ancho | Cómo se abre |
|---|---|
| Teléfono (720 px o menos) | **El día entero es un botón** (49×57 px, medido a 375 px), con hasta tres puntos de color. Se abre la lista también con un solo plazo: el punto no dice qué causa es, y así el gesto hace siempre lo mismo. Las carátulas de la celda ya no se dibujan |
| Más ancho | La celda queda como estaba: la carátula recortada lleva a la causa. **"+N más" pasa a ser un botón** que abre la lista |

- **Teclado.** Tab recorre sólo los días con plazos (los demás no son
  botones). Al abrirse la lista, el foco va a su título; Escape o "Cerrar" la
  cierran y devuelven el foco al botón que la abrió. Volver a tocar el día
  también la cierra; cambiar de mes o "Hoy", también.
- **Lector de pantalla.** El día se anuncia "Martes 15 de septiembre, 3
  plazos", con `aria-expanded`. "+N más" dice "+1 más: ver los 3 plazos del
  martes 15 de septiembre". La lista es una región con el título de nombre.
- No cambia ningún endpoint ni campo: usa los plazos que ya trae
  `GET /dashboards/lawyer`.

**Archivos:** `src/features/dashboard/components/DeadlineCalendar.tsx`,
`src/features/dashboard/utils/dashboardDate.ts` (`dayTitle`),
`src/styles/dashboard.css` (`.vz-dash-cal__open`, `.vz-dash-cal__more`,
`.vz-dash-cal__list*`).

## Tests nuevos

`tests/components/dashboard/DeadlineCalendar.test.tsx`, 8 tests: el día abre
la lista con todos sus plazos como enlaces a su causa; el foco va al título;
"+N más" abre la misma lista; Escape cierra y devuelve el foco; "Cerrar" y
volver a tocar el día la cierran; elegir otro día cambia la lista y cambiar de
mes la cierra; un día sin plazos no es un botón; la carátula de la celda sigue
llevando a la causa.

En jsdom no hay CSS, así que el botón del día y la celda con sus carátulas
están a la vez: el test prueba las dos formas de abrir la lista. Ningún test
existente se modificó.

## Verificación

| Qué | Resultado |
|---|---|
| `npm run lint` | 0 errores; el warning conocido de `src/shared/components/ui/Icon.tsx:2` |
| `npx tsc -b` | Limpio |
| `npx vitest run` | 782 de 782 (122 archivos), en una corrida |
| Navegador, con mocks, `mrios`, a 375 px | El día 4 es un botón de 49×57 px con su punto; al tocarlo queda marcado, se abre la lista con el enlace a `/causas/17` y el foco va al título. Sin scroll horizontal |
| Navegador, a 1366 px | El calendario se ve igual que antes: carátulas en la celda, el botón del día oculto |

**Sin verificar:**

- **"+N más" en el navegador**: `mrios` no tiene un día con tres plazos. Lo
  cubre el test.
- Escape y "Cerrar" en el navegador (sí en los tests).
- El anillo de foco del título al abrir con el dedo: en la prueba (un clic
  disparado por código) se ve; con un toque real puede no verse. Mirarlo en un
  teléfono.
- Los E2E y el build.
- Lector de pantalla real.
