# Resumen del plan A — qué se hizo y qué quedó

13/11/2026 · Luciano con Claude · rama `feat/auditoria-front`.

Es el cierre de esta etapa del plan A (técnico y funcional). El detalle de
cada tarea —problema, causa, solución y cómo se comprobó— está en
[12-REGISTRO_PLAN_A.md](12-REGISTRO_PLAN_A.md). Las rutas son relativas a
`frontend/`.

## Antes de seguir: hay una mezcla sin terminar

El último `pull` dejó **un conflicto**, en
`tests/components/shared/FormModal.test.tsx` (Facundo y el plan A agregaron
tests al final del mismo archivo). **El contenido ya está resuelto** —quedaron
los tests de los dos— pero la mezcla no se cerró: falta el `git add` de ese
archivo y el commit. Hasta entonces `git status` va a decir "unmerged paths".

## Estado de la verificación

Con los cambios de los dos planes juntos, el 13/11/2026:

| Qué | Resultado |
|---|---|
| `npm run lint` | 0 errores; el warning conocido de `Icon.tsx:2` |
| `npx tsc -b` | Limpio |
| `npx vitest run` | **715 de 715** (108 archivos). Al empezar la auditoría: 651 |
| `npm run test:e2e` | **9 de 9** |
| `npm run build` | Sin errores |

**No se probó nada contra el backend real**: todo fue con los mocks. Lo
último (Enter en los modales, y lo que trajo el último `pull` de Facundo) **no
se miró en el navegador**.

## Lo que se hizo

| # | Qué | Hallazgo | Comprobado con |
|---|---|---|---|
| 1 | **Selector con filtro** para cliente y calificaciones, en "Registrar causa" y "Modificar causa". Se escribe para filtrar; con más de 100 registros busca en el servidor y avisa cuántos hay | H-03, H-28, H-29 | 11 tests del componente, 3 de regresión con 110 registros, E2E, navegador |
| 2 | **Una calificación recién registrada ya no aparece como "dada de baja"**: lo elegido se resuelve por id, no buscándolo en la página de 100 | H-28 | Test de regresión |
| 3 | **"Registrar calificación nueva" desde "Modificar causa"** | H-30 | 2 tests, navegador |
| 4 | **Modales apilados**: sólo el de arriba atiende Escape y Tab | H-06 | 2 tests, navegador a 320 px |
| 5 | **Un formulario ya no se cierra con un clic afuera**, y todos los modales tienen una `×` | H-05, H-44 | 7 tests, navegador |
| 6 | **Enter envía los formularios de modal** | H-36 | 4 tests. Sin mirar en el navegador |
| 7 | **Sesión entre pestañas**: salir en una saca a las otras; si entra otra persona, las otras pasan a ser de ella y se vacía la caché | H-01 | 5 tests, dos pestañas reales con el mock |
| 8 | **El mock con dos pestañas**: abrir la segunda ya no cierra la sesión de las dos | H-31 | Navegador |
| 9 | **Caché**: los contadores de causas (carga de cada abogado, causas activas de clientes, calificaciones y estados) se refrescan después de cada cambio sobre una causa | C-1 | 3 tests |
| 10 | **Caché**: un abogado creado junto con un usuario aparece en "Abogados" y en "Abogado responsable" | C-2 | Sin test |
| 11 | **Caché**: modificar un estado o una calificación refresca las causas que los muestran | C-3 | Sin test |
| 12 | **Fecha estimada de prescripción en fin de mes**: 31/08 más 6 meses daba 03/03; ahora 28/02, como el backend | H-14 | 1 test con 5 casos |
| 13 | **Timeout de subir y bajar archivos**: de 15 a 60 segundos | H-11 | Sin test; el valor es una estimación |
| 14 | **El selector a 320 px** quedaba de 34 px de ancho al lado del botón | — | Navegador |
| 15 | **Limpieza**: imports comentados y relativos, comentario que citaba un contrato inexistente | H-18 | Suite |
| 16 | **Test intermitente de `RouteErrorPage`** endurecido | H-02 | La causa no se confirmó |

Auditado y **sin problemas**: doble envío (un doble clic manda un solo
`POST`; probado en jsdom, no en un navegador), bajas optimistas, retroceso de
página al borrar la última fila, y el cierre de sesión cuando el pedido falla.

## Lo que quedó sin hacer

### Importa

| Qué | Por qué quedó | Dónde retomarlo |
|---|---|---|
| **Falla intermitente en tests del alta de causa** (H-55): 2 de 6 corridas completas, un test distinto cada vez | Postergado a pedido. Se capturó el mensaje (`Unable to find role="button" and name "Recuperar"`), no la causa | `12-REGISTRO_PLAN_A.md`, "Falla intermitente abierta": dos pistas, el tiempo de espera de los tests y la sesión |
| **Probar contra el backend real**: sesión entre pestañas, timeouts de archivos, subida de un modelo, expediente | No hubo backend levantado | — |
| **El mock y el backend calculan distinto el fin de mes de la prescripción** | Es una contradicción a decidir: `src/shared/mocks/calendar.ts:111` sigue al prototipo a propósito; el backend corta en el último día (`backend/src/subsystems/cases/core/domain/prescription.ts:69`); el contrato no dice nada | Decidirlo y escribirlo en el contrato |
| **Los tres perfiles contra la tabla de permisos** (`gestion`, `mrios`, `supervision`) | No se llegó | — |
| **Carreras que faltan**: respuesta que llega después de salir de la pantalla, sondeo de la carpeta al cambiar de causa | No se llegó | — |
| **La ruta `/internal/deadlines/daily-run` sigue en el build** aunque la campana ya no se dibuje en producción | Se comprobó en `dist/`: el módulo se importa igual. El secreto no sale | `src/features/deadlines/api/deadlines.api.ts`, `src/app/layouts/AppLayout.tsx` |

### Detalles, para después

- **Título de la pestaña en las 5 páginas de causas** (H-20). El hook de
  Facundo ya existe: `src/shared/hooks/usePageTitle.ts`.
- **Errores asociados al control en `CaseForm` y `ProceduralActForm`** (H-35):
  el patrón está en `FormModal.tsx`.
- **Motivo de un botón deshabilitado sólo en `title`** (H-53).
- **Preguntar "¿descartar los cambios?"** al cerrar un formulario con Escape o
  "Cancelar": hoy no pregunta.
- **Renovación de sesión por cada `403`** (H-09): sólo análisis, sin empezar.
- **El front decide permisos con sus tablas y no con `permissions` del
  backend** (H-10): espera decisión del equipo.
- **`react-hook-form` instalado y sin uso** (H-16): decisión pendiente.
- **Páginas de 500–600 líneas** (H-12): no se tocaron.
- **Tests de C-2 y C-3** (caché de abogados y de estados/calificaciones).
- **Documentación atrasada**: `frontend/CLAUDE.md` y
  `docs/Frontend-Architecture/SHARED.md` no mencionan `SearchSelect`, los
  hooks nuevos, la pila de modales ni `dismissOnBackdrop`; `MATRIZ_CA.md` hay
  que regenerarla con `npm run ca-matrix`.

## Respuesta corta a `15-PARA_LUCIANO_2.md`

**a. Correr todo:** pasa (tabla de arriba: 715 tests, 9 E2E, build). Difiere
de tus 704 sólo por los tests nuevos del plan A. De lo que pediste mirar:

- La campana con `DAILY_RUN_ENABLED`: **la ruta interna sigue en el build**
  (está en `dist/assets/index-*.js`). El secreto no.
- El bloque "combobox" con tu flecha, los bordes nuevos, `AppShell` y tus
  cambios a mis tests: **no se miraron en el navegador**. Los tests pasan.

**b. `aria-describedby` en las acciones de fila:** se deja así. No toca los
31 tests y cumple; si después molesta que los nombres se repitan en un
listado de botones, se cambia.

**c. La tabla de la sección 3:**

| Tarea | Estado |
|---|---|
| H-36 · Enter envía los formularios de modal | **Hecho.** El cuerpo de `FormModal` es un `<form>` y "Confirmar" es su botón de envío |
| H-05, H-44 · cierre con clic afuera y `×` | **Hecho.** La clase es `.vz-modal__close`, en `src/styles/feedback.css`, con un estilo mínimo: es tuya |
| H-35 en `CaseForm` y `ProceduralActForm` | Pendiente |
| H-20 · título en mis 5 páginas | Pendiente |
| H-53 · motivo del botón deshabilitado | Pendiente |

`FormModal.tsx` cambió: si lo volvés a tocar, partí de esta versión.

## Archivos del plan A que conviene conocer

| Archivo | Qué es |
|---|---|
| `src/shared/components/forms/SearchSelect.tsx` | El select con filtro |
| `src/features/cases/api/useClientOptions.ts`, `useQualificationOptions.ts` | De dónde salen sus opciones y cómo se resuelve lo elegido |
| `src/features/cases/api/invalidateCaseCounters.ts` | Qué listados quedan viejos cuando cambia una causa |
| `src/features/cases/components/NewQualificationModal.tsx` | "Registrar calificación nueva", compartido por el alta y "Modificar causa" |
| `src/shared/components/ui/Modal.tsx` | La pila de modales, `dismissOnBackdrop` y la `×` |
| `src/app/providers/AuthProvider.tsx` | El oyente de `storage` que sincroniza la sesión entre pestañas |
| `tests/setup/searchSelect.ts` | `chooseOption`, para elegir en un `SearchSelect` desde un test |
