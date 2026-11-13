# Tanda 14 (primera parte) — tablas anchas, errores de carga, Ctrl+clic

13/11/2026 · Luciano con Claude · rama `feat/auditoria-front` · cambios en el
árbol de trabajo, **sin commitear**, encima de la tanda 13
([19](19-TANDA13_CARRERAS_Y_CACHE.md)). Rutas relativas a `frontend/`.

La tanda 14 era la revisión visual pendiente. Esta primera parte es lo que se
pudo resolver midiendo la página: el panel del navegador estuvo oculto toda la
sesión (no dibuja, no hay capturas ni clics reales) y Claude in Chrome no
estuvo conectado. **Queda para la segunda parte**, con el panel a la vista: el
cursor en "Fuero", el borde de los campos y la flecha del selector a 1366 px,
el tablero "Estudio", los modales y las notas de botones deshabilitados en el
teléfono.

## En pocas líneas

| Qué | Resultado |
|---|---|
| Tablas entre 1.181 y 1.360 px | **Corregido.** Pasan a fichas cuando no entran en su lugar (decisión de Luciano) |
| Estados de error al cargar, pantalla por pantalla | **Corregido.** Ningún error se anunciaba ni se podía reintentar: ahora hay alerta y "Reintentar" (decisión de Luciano) |
| "Registrar causa" con sus listas caídas | **Corregido.** Decía "Ningún cliente coincide." y el responsable quedaba vacío (decisión de Luciano) |
| Estados de carga, pantalla por pantalla | Sin problemas: esqueleto, "Cargando…" en un `status` y `aria-busy` |
| Ctrl+clic en un ítem del rail | Sin problemas |
| Cursor en "Fuero" | Diagnóstico parcial (abajo); arreglo pendiente |

## 1. Tablas entre 1.181 y 1.360 px

**Qué pasaba.** Medido en Causas: de 1.181 a 1.360 px la tabla medía siempre
1.040 px (su mínimo) y su lugar, de 861 a 1.039: scroll horizontal en todo ese
tramo, también a 1.280 px (una notebook común). Usuarios tiene el mismo mínimo
(1.040) y Clientes, 880 (desbordaba de 1.181 a ~1.200).

**Por qué no alcanzaba bajar el mínimo.** Medido a 1.181 px con 860 de mínimo:
la tabla igual quedaba en 949 px, porque las columnas que no se parten (SAC,
Fuero, Responsable, Vencimiento, la acción) suman unos 670, y la carátula
quedaba en 133 px y hasta 7 renglones.

**Las opciones** (preguntadas): fichas cuando no entra; esconder Fuero y
Responsable (un corte nuevo, contra `tokens.css:117` y `frontend/CLAUDE.md`);
mover esas dos columnas (cambia la tabla también a 1366 px y se aparta del
prototipo); o dejarlo. **Luciano eligió fichas cuando no entra.**

**Cómo quedó.**

| Qué | Dónde |
|---|---|
| `DataTable` decide la forma: ficha con la ventana en 1180px o menos, como siempre, **o** si su lugar es más angosto que su `minWidth`. Lo mide antes de dibujar (`useLayoutEffect`) y al cambiar el tamaño (`ResizeObserver`) | `useStacked`, `src/shared/components/ui/DataTable.tsx:24`; el corte en `:5` |
| Para volver de ficha a tabla pide 4 px de margen: al pasar a ficha el panel pierde su borde y el lugar crece 2 px; sin margen, en el límite saltaría de una forma a otra | `:12` |
| Los estilos de la ficha dejaron de colgar de `@media (max-width: 1180px)` y cuelgan de la clase `vz-table--stacked` | `src/styles/table.css:217` en adelante; `src/styles/skeleton.css` (el rótulo de la ficha del esqueleto) |
| La regla del teléfono para el botón de la ficha (42 px) subió de especificidad, para no perder contra la de la ficha (36 px) | `src/styles/table.css`, bloque de 720 px |

No hay diseño nuevo: es la misma ficha que ya se usaba debajo de 1.180 px. El
corte de 1.180 sigue siendo el del proyecto; lo que cambia es que una tabla
que no entra no espera a ese corte.

**Medido en el navegador** (forma inicial, recargando en cada ancho):

| Tabla | Ancho | Forma | Lugar | Scroll |
|---|---|---|---|---|
| Causas | 1.180 | fichas | 861 | no |
| Causas | 1.280 | fichas | 961 | no |
| Causas | 1.366 | tabla | 1.045 | no |
| Causas | 1.440 | tabla | 1.119 | no |
| Clientes | 1.190 | fichas | 871 | no |
| Clientes | 1.240 | tabla | 919 | no |
| Causas | 375 | fichas; botón de la ficha 42 px | 347 | no |

**El cambio en vivo** (agrandar o achicar la ventana con la pantalla abierta)
**no se pudo ver**: con el panel oculto la página no dibuja cuadros, y
`ResizeObserver` no avisa. Lo fija el test.

**Los E2E y la ventana de 1.280 px.** Con el cambio fallaron 2 de 9 (Causas y
Usuarios): Playwright usaba la ventana de su dispositivo "Desktop Chrome",
1.280 × 720, y a ese ancho esas tablas ahora son fichas. En una ficha, cada
celda lleva arriba el nombre de su columna (`content: attr(data-label)`), y
ese texto entra en su nombre accesible: la celda del SAC se llama
"N° SAC 12907344", y las pruebas la buscaban por `'12907344'` exacto. **Luciano
eligió fijar la ventana de los E2E en 1366 × 768**, el ancho de referencia de
la auditoría (`playwright.config.ts`), sin tocar las pruebas. Pasaba igual
debajo de 1.180 px desde antes; que el lector de pantalla diga "N° SAC
12907344" en una ficha no es un defecto.

## 2. Errores al cargar

**Qué pasaba.** Recorrido forzando un 500 en todos los pedidos, como
`gestion`: Causas, Clientes, Abogados, Estados y plazos, Calificaciones, el
detalle de una causa, "Generar expediente" y "Registrar acto procesal" muestran
"No se pudo cargar…" con el mensaje del servidor, pero **sin rol de alerta**
(un lector de pantalla no lo anuncia) y **sin forma de volver a intentar**
salvo recargar. Cada pantalla armaba el bloque a mano (15 lugares). Usuarios,
Inicio y Modelos tienen el mismo bloque (leído; no se recorrieron, son de
Administrador).

**Las opciones** (preguntadas): alerta y "Reintentar"; sólo la alerta; o
dejarlo. **Luciano eligió alerta y "Reintentar"** (el botón no está en el
prototipo).

**Cómo quedó.** Un componente compartido, `LoadError`
(`src/shared/components/ui/LoadError.tsx:23`): el mismo bloque `vz-empty`, con
el título y el mensaje en un `role="alert"` y debajo "Reintentar", que llama al
`refetch` de la consulta y espera mientras vuelve a pedir ("Reintentando…").
No ofrece reintentar lo que va a responder lo mismo: un 404 (la causa no
existe o se dio de baja), un 403 o un 400 (`isTransient`, `:44`). Lo usan las
15: los ocho listados y el tablero, el detalle de causa, "Generar expediente",
"Registrar acto procesal" (la causa, el acto y los estados) y la línea de vida
(`CaseTimeline` recibe ahora el error, `onRetry` y `retrying`).

**Medido en el navegador:** Causas con un 500 → el aviso y "Reintentar"; con
el servidor de vuelta, "Reintentar" trae las 20 causas y el aviso se va.
"Reintentando…" no llegó a verse (lo cubre el test).

## 3. "Registrar causa" con sus listas caídas

**Qué pasaba.** Con los listados fallando, el selector de cliente decía
**"Ningún cliente coincide."**, el de responsable quedaba vacío y el de
calificaciones, igual que el de cliente. Ningún aviso: parecía que no había
clientes ni abogados cargados.

**Cómo quedó.** `useClientOptions` y `useQualificationOptions` avisan si su
lista falló (`failed`), y cada selector lo dice: "No se pudieron cargar los
clientes. Recargá la página para volver a intentar." (y "las calificaciones",
"los abogados"; `optionsFailedText`,
`src/features/cases/utils/optionsNote.ts:20`). En el de responsable va como
nota debajo del campo, unida a él (`aria-describedby`). Vale también para
"Modificar causa", que comparte las calificaciones y el responsable
(`useCaseEdit`, `CaseEditForm`). Decisión de Luciano.

## 4. Lo que se revisó y estaba bien

**Carga.** En las nueve pantallas recorridas, con 8 s de demora: esqueleto con
la forma de la pantalla, "Cargando …" en un `role="status"` y `aria-busy`.

**Ctrl+clic en el rail.** Los ítems son enlaces (`<a href="/clientes">`). Con
Ctrl, Cmd, Mayús o el botón del medio, la app no intercepta el clic y lo deja
al navegador (otra pestaña o ventana); con el clic común, navega adentro.
Comprobado mirando si la app cancela el evento.

## 5. Cursor en "Fuero": lo que se sabe

Del punto A (respuesta a Luciano, 13/11/2026), en el Chromium del panel
(Chrome 156):

- El campo es un `<input disabled>` con `cursor: not-allowed` y
  `user-select: none` aplicados (`src/styles/controls.css:117`).
- Un clic deja la selección del documento colapsada **en el `.vz-field`, justo
  antes del campo**. No se ve ninguna barrita en las capturas; una selección
  colapsada en texto no editable no se dibuja, salvo con la navegación con
  cursor de Chrome (F7) prendida. **Hipótesis sin confirmar**: es lo que vio
  Facundo.
- Un doble clic **selecciona "Penal"** con el resaltado a la vista, aunque el
  campo tenga `user-select: none`. Tampoco lo frenan `pointer-events: none` ni
  `user-select: none` en el `.vz-field` (probados en vivo, sin tocar archivos).
- Los tests exigen que "Fuero" y "Cliente" sigan siendo campos de texto
  deshabilitados (`tests/components/cases/CaseDetailPage.edit.test.tsx:142`).

**Pendiente**: probar en Chrome real (o con el panel a la vista) un arreglo
que tape el campo con una capa que no admita selección, y confirmar qué ve
Facundo. El arreglo de Facundo (`user-select: none`) queda: no hace daño, pero
no alcanza.

## Tests nuevos

| Archivo | Tests | Qué fija |
|---|---|---|
| `tests/components/shared/DataTable.stacked.test.tsx` | 4 | Tabla con lugar de sobra; fichas si no entra aunque la ventana sea ancha; fichas con la ventana en 1180px o menos; el cambio en vivo y el margen para volver a tabla |
| `tests/components/shared/LoadError.test.tsx` | 4 | La alerta con el mensaje y "Reintentar"; sin red también; sin "Reintentar" para un 404; el botón espera mientras pide |
| `tests/components/cases/loadErrors.test.tsx` | 4 | Causas: alerta, "Reintentar" y vuelve a cargar. "Registrar causa": cliente, responsable (nota unida al campo) y calificaciones dicen que no se pudieron cargar |

Ningún test existente se modificó. Cambió la configuración de los E2E
(`playwright.config.ts`, la ventana).

## Verificación

| Qué | Resultado |
|---|---|
| `npm run lint` | 0 errores; el warning conocido de `Icon.tsx:2` |
| `npx tsc -b` | Limpio |
| `npx vitest run` | **771 de 771** (121 archivos). Antes de la tanda: 759 |
| `npm run build` | Sin errores |
| `npm run test:e2e` | **9 de 9**, con la ventana en 1366 × 768 (con 1.280 fallaban 2: ver la sección 1) |
| Navegador, con mocks, `gestion` | Lo de las secciones 1 a 4, medido en el DOM. Sin capturas |

**Sin verificar:**

- Todo lo visual: el panel estuvo oculto. En particular, cómo se ve una tabla
  pasando a fichas a 1.280 px y el bloque de error con su botón.
- El cambio de forma en vivo al redimensionar (sí, en el test).
- Usuarios, Inicio y Modelos con error forzado (son de Administrador; mismo
  componente).
