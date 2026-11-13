# Auditoría del frontend — resumen general

13/11/2026 · rama `feat/auditoria-front` · Luciano (plan A: técnico y
funcional) y Facundo (plan B: visual, UX, responsive y accesibilidad), los dos
con Claude.

Este documento junta en un solo lugar lo que está repartido en los informes
`00` a `17` de esta carpeta: por qué se hizo la auditoría, qué se encontró, qué
se arregló y qué quedó. Si un dato de acá no coincide con el informe de su
tanda, **manda el informe de la tanda**. Las rutas son relativas a `frontend/`.

## 1. En pocas líneas

- Se revisó el frontend entero buscando bugs, problemas de accesibilidad,
  pantallas que se rompen en algún ancho y código frágil. **No se encontró
  nada crítico**: el front ya estaba bien armado.
- Se encontraron **55 hallazgos** (`H-01` a `H-55`) y 3 huecos de caché
  (`C-1` a `C-3`). De gravedad alta, 5.
- **Los 5 altos están corregidos**, y la gran mayoría de los medios y bajos.
- La suite pasó de **651 tests a 735**. Los 9 E2E pasan. Lint, tipos y build,
  limpios.
- **Todo se probó con los mocks. Nada se probó contra el backend real.**
- Lo último (tanda 11) **está sin commitear**.

## 2. Por qué se hizo

El pedido ([00-ENCARGO.md](00-ENCARGO.md)) fue llevar el frontend a calidad
profesional con mentalidad crítica: que algo parezca funcionar no lo hace
correcto. Se pidió revisar siete áreas (arquitectura, bugs, performance,
UX/UI, responsive, accesibilidad y seguridad), en fases: primero diagnóstico
sin tocar código, después plan, después arreglos por tandas con verificación
después de cada una.

Para trabajar dos personas a la vez sin pisarse, el front se dividió en dos
planes con archivos propios ([02-DIVISION_DE_TRABAJO.md](02-DIVISION_DE_TRABAJO.md)):

| Plan | Quién | Qué | Archivos |
|---|---|---|---|
| A | Luciano | Técnico y funcional: sesión, caché, datos, formularios de causas y actos, modales | `api/`, `utils/`, `schemas/`, páginas de causas y actos, `Modal.tsx`, `AuthProvider.tsx`, mocks |
| B | Facundo | Visual, UX, responsive y accesibilidad | `src/styles/`, `shared/components/ui/`, marcos, tablas, login, páginas de los ABM |

Los archivos compartidos (`FormModal.tsx`, `AppShell.tsx`, `controls.css`) se
repartieron por nota entre los dos ([11](11-PARA_LUCIANO.md),
[13](13-RESPUESTA_A_FACUNDO.md), [15](15-PARA_LUCIANO_2.md),
[16](16-RESUMEN_PLAN_A.md)).

## 3. Cómo estaba el front al empezar

Del diagnóstico ([01-DIAGNOSTICO_INICIAL.md](01-DIAGNOSTICO_INICIAL.md)):
módulos con frontera clara, sin imports cruzados, sin `any`, tipos estrictos,
651 tests y un manejo de sesión cuidado. Sin desborde de página en ninguna de
las 13 pantallas en ninguno de los seis anchos probados.

Lo que había eran tres clases de problema:

1. **Bugs que aparecen con el uso real**: dos pestañas abiertas, más de 100
   clientes, un clic afuera de un formulario a medio llenar.
2. **Accesibilidad con teclado y lector de pantalla**: foco que no se ve,
   errores que no se anuncian, menú del teléfono que no atrapa el foco.
3. **Detalles de terminación**: textos cortados, controles chicos en el
   teléfono, avisos que duran poco.

## 4. Bugs corregidos

Qué pasaba, por qué y cómo se arregló. Los cinco primeros eran de gravedad
alta.

| Id | Qué pasaba | Causa | Solución |
|---|---|---|---|
| **H-01** | Cerrar sesión en una pestaña dejaba a las otras mostrando datos. Si entraba otra persona, la pestaña vieja mostraba al primer usuario pero pedía con el token del segundo | `AuthProvider` leía la sesión guardada una sola vez; el cliente HTTP, en cada pedido | `AuthProvider` escucha los cambios del almacenamiento: si la sesión desaparece, cierra; si entra otro usuario, vacía la caché y toma su sesión |
| **H-03** | Con más de 100 clientes, el 101 no se podía elegir al registrar una causa, sin ningún aviso | Los desplegables pedían una sola página de 100 | Selector con filtro nuevo (`SearchSelect`): con más de 100 busca en el servidor y avisa "Se muestran 100 de N…" |
| **H-28** | Una calificación recién registrada que caía después de la 100 se mostraba como "dada de baja" y bloqueaba el alta de la causa | Lo elegido se buscaba en esa misma página de 100 | Lo elegido se pide por su id; "dada de baja" pasa a ser el `404` de esa consulta |
| **H-34** | El foco del teclado casi no se veía sobre el rail y las zonas oscuras (2,37:1 de contraste; se pide 3:1) | Un solo color de foco para toda la app | Token `--vz-focus`, que las superficies oscuras redefinen a un color claro |
| **H-35** | El error de un campo no llegaba al lector de pantalla: anunciaba "Apellido, cuadro de edición" sin decir que había un error | El control no tenía `aria-invalid` ni `aria-describedby`; lo obligatorio era un `*` que se leía "asterisco" | Cada control queda unido a su error, su nota y su obligatoriedad, en los formularios de modal (`FormModal`) y en los de página (`CaseForm`, `CaseEditForm`, `ProceduralActForm`) |
| H-05 | Un clic afuera, a veces sin querer, cerraba un formulario y se perdía lo escrito | `Modal` cerraba con cualquier clic en el fondo | Un formulario ya no se cierra con clic afuera; una confirmación sin campos, sí. Escape, "Cancelar" y la `×` siempre cierran |
| H-06 | Con un modal encima de otro, Escape cerraba los dos | Cada modal escuchaba el teclado por su cuenta | Pila de modales: sólo el de arriba atiende Escape y Tab |
| H-36 | Enter no enviaba los formularios de modal | `FormModal` no dibujaba un `<form>` | Ahora lo es, y "Confirmar" es su botón de envío |
| H-14 | El vencimiento estimado de la prescripción daba mal en fin de mes: 31/08 más 6 meses daba 03/03 | La suma de meses se pasaba al mes siguiente | Corta en el último día del mes (28/02), igual que el backend |
| H-11 | Subir o bajar un archivo pesado se cortaba a los 15 segundos | Usaban el tope general de los pedidos | Tope propio de 60 segundos (valor estimado, sin medir contra el backend) |
| H-33 | En el teléfono, "Esta semana" y "Próximos" de "Mis plazos abiertos" quedaban cortados y no se podía llegar a ellos | La fila de filtros no se achicaba y el panel la recortaba | La fila se achica y desliza |
| H-32 | La tabla de Causas hacía scroll horizontal a 1366 px, y la carátula quedaba en cuatro renglones | Mínimo de 1.100 px en un panel de 1.045 | Mínimo de 1.040; la carátula pasó de 156 a 229 px |
| H-04 | Los avisos duraban 2 segundos, también los de error, y se iban aunque se los estuviera leyendo | Un temporizador fijo para todos | 4 s éxito e información, 8 s error; con el mouse encima o el foco adentro no se van |
| H-07 | El menú del teléfono no atrapaba el foco: con Tab se llegaba a lo que estaba detrás | La página de atrás no quedaba inerte | Al abrir, el foco entra al menú y la página queda `inert`; al cerrar, vuelve al botón |
| H-31 | Con los mocks, abrir una segunda pestaña cerraba la sesión de las dos | Cada pestaña tenía su copia de las sesiones del mock | El mock relee las sesiones cuando otra pestaña las escribe |
| — | A 320 px, el selector con filtro quedaba de 34 px de ancho al lado de su botón | Un `<select>` tiene ancho natural; el campo nuevo, no | Ocupa su renglón y el botón baja |
| — | La flecha de un `<select>` desaparecía cuando el campo tenía error | El fondo del error pisaba la imagen de la flecha | El error cambia sólo el color de fondo |
| — | El aviso en el teléfono ocupaba media pantalla de ancho y se partía en seis renglones | La pila se centraba con `left: 50%` | Va de borde a borde: tres renglones |

**Datos que quedaban viejos hasta un minuto** (auditoría de caché, 29
mutaciones leídas):

| Id | Qué quedaba viejo | Después de | Solución |
|---|---|---|---|
| C-1 | La carga de cada abogado y las causas activas de clientes, calificaciones y estados | Cualquier cambio sobre una causa o un acto | `invalidateCaseCounters`, llamado desde esas mutaciones |
| C-2 | Un abogado recién creado no aparecía en "Abogados" ni en "Abogado responsable" | Registrar un usuario con ficha nueva | Las mutaciones de usuario invalidan los listados de abogados |
| C-3 | El nombre y el plazo de un estado o una calificación en las causas | Modificar un estado o una calificación | Esas mutaciones marcan vieja la caché |

**Revisado y sin problemas:** doble envío (un doble clic manda un solo
`POST`), bajas optimistas, retroceso de página al borrar la última fila, y el
cierre de sesión cuando el pedido falla.

## 5. Mejoras que no eran bugs

### Accesibilidad

| Qué | Hallazgo |
|---|---|
| Los ítems del rail son enlaces: se abren en otra pestaña, se copian y se anuncian como enlaces | H-07 |
| Enlace "Saltar al contenido", visible sólo con el foco | H-45 |
| Pestañas con flechas, Inicio y Fin, un solo punto de tabulación, y panel con nombre | H-41 |
| El paginado es una región con nombre y anuncia el cambio de página | H-46 |
| Los avisos de éxito e información son `role="status"`: no interrumpen. Un error sigue siendo `alert` | Decisión 1 |
| Cada acción de fila dice de quién es: "Modificar, botón, Ríos, Malena" | H-40 |
| El motivo de un botón deshabilitado está a la vista, no sólo en el `title`: en Abogados y en el detalle de causa | H-53 |
| Contraseñas y correo con `autocomplete` y tipo `email`: el navegador no ofrece la contraseña del administrador al crear un usuario | H-37 |
| Todos los modales tienen una `×` | H-44 |
| El título de la pestaña del navegador dice la pantalla; en una causa, su carátula | H-20 |

### Visual y responsive

| Qué | Hallazgo |
|---|---|
| Rótulos de la banda del tablero y nombre del usuario en el rail, sin cortar | H-38, H-39 |
| Botón primario deshabilitado legible (de 1,66:1 a 5,43:1) | H-42 |
| Acciones de fila con contraste suficiente (de 3,4:1 a 6,06:1) | H-40 |
| Borde de los campos más marcado | H-43 |
| Controles de toque en el teléfono: botones chicos, "Volver", migas, pie del rail y fecha del hecho pasan a 36–40 px | H-25, H-51, H-52, H-54 |
| El login angosto muestra la marca en una franja arriba | H-26 |
| El selector con filtro tiene la flecha de un `<select>` | — |
| 26 colores escritos a mano pasaron a 13 tokens, con el mismo valor | H-49 |

### Funcionalidad nueva

- **Selector con filtro** para cliente y calificaciones: se escribe para
  filtrar, sin distinguir acentos ni mayúsculas (H-29).
- **"Registrar calificación nueva" desde "Modificar causa"**, sin tener que
  salir del diálogo (H-30).

### Performance, seguridad y limpieza

- Las fuentes ya no se cargan por `@import` dentro del CSS: `preconnect` y
  `<link>` en `index.html` (H-23).
- La campana de "Notificaciones", que no hacía nada en producción, sólo se
  dibuja en desarrollo (H-08), y la ruta interna que usa ya no queda escrita
  en el build.
- El secreto de la campana **no** sale en el build (comprobado).
- `npm audit`: 0 vulnerabilidades.
- Imports comentados y relativos corregidos (H-18).

## 6. Hallazgos que se retiraron

Se anotaron y después se vio que no eran un problema:

| Id | Por qué se retira |
|---|---|
| H-19 | Las carpetas vacías con `.gitkeep` son la convención del proyecto |
| H-48 | El ojo de la contraseña ya cambia su rótulo; sumarle `aria-pressed` lo empeora |
| "Aviso de 5 segundos" | Cronometrado: dura 4.020 ms. Lo que se vio era la pausa con el puntero encima |
| H-28 en "Modificar causa" | Sólo pasaba en el alta |

## 7. Verificación

Estado final, con los cambios de los dos planes y la tanda 11:

| Qué | Resultado |
|---|---|
| `npm run lint` | 0 errores; un warning conocido en `src/shared/components/ui/Icon.tsx:2` |
| `npx tsc -b` | Limpio |
| `npx vitest run --maxWorkers=4` | **735 de 735** (112 archivos). Al empezar: 651 |
| `npm run test:e2e` | **9 de 9** |
| `npm run build` | Sin errores |
| Navegador, con mocks | Lo modificado se miró a 320–390 px y a 1024–1366 px, tanda por tanda |

**Ojo con la suite a todo paralelismo.** `npx vitest run` sin limitar los
procesos falla de forma intermitente: en dos corridas del 13/11 fallaron 2 y 5
tests, distintos cada vez, todos por tiempo de espera. Solos pasan. Es H-55,
sin resolver (sección 8).

## 8. Lo que queda

### Importa

| Qué | Por qué importa |
|---|---|
| **Probar contra el backend real** | Todo se probó con mocks. Falta: sesión entre pestañas, subida de un modelo, timeouts de archivos, expediente |
| **H-55 · falla intermitente de la suite** | Con todos los núcleos algún test se pasa del tiempo de espera. Pistas en [12-REGISTRO_PLAN_A.md](12-REGISTRO_PLAN_A.md): los `findBy…` esperan 1 s por defecto, poco para 112 archivos en paralelo |
| **Fin de mes de la prescripción: el mock y el backend calculan distinto** | El backend corta en el último día del mes; el mock sigue al prototipo y se pasa al mes siguiente. El contrato no dice nada: hay que decidirlo y escribirlo |
| **Los tres perfiles contra la tabla de permisos** (`gestion`, `mrios`, `supervision`) | No se llegó. `supervision` no se recorrió en ninguna tanda |
| **Carreras** | Respuesta que llega después de salir de la pantalla; sondeo de la carpeta al cambiar de causa |
| **Lector de pantalla real** | Todo lo de ARIA se comprobó en el DOM, nunca con NVDA |

### Revisión visual que falta

El borde nuevo de los campos y la flecha del selector a 1366 px; el tablero
"Estudio" a ojo; los modales de modelos, abogado, usuario, acto interruptivo y
"Marcar prescripta" en el teléfono; estados de error y de carga forzados,
pantalla por pantalla; las notas nuevas de botones deshabilitados en el
teléfono.

### Decisiones del equipo

| Qué | Hallazgo |
|---|---|
| Puntos del calendario en el teléfono (18×20 px): ¿todo el día tocable? | H-50 |
| El front decide permisos con sus tablas y no con `permissions` del backend | H-10 |
| `react-hook-form` instalado y sin uso | H-16 |
| Preguntar "¿descartar los cambios?" al cerrar un formulario con Escape o "Cancelar" | H-05 |
| Las tres notas "Solo el abogado responsable (…)" del detalle de causa: ¿se unen en una? | H-53 |
| Si después molesta que los nombres de las acciones de fila se repitan en un listado de botones, pasar a `aria-label` | H-40 |

### Para después

- Un `403` cualquiera renueva la sesión (H-09): sólo análisis.
- Páginas de 500–600 líneas (H-12): no se tocaron.
- Tests de C-2 y C-3.
- Entre 1.181 y 1.360 px la tabla de Causas sigue con scroll horizontal.
- Los mocks se publican en el build si se hace con `VITE_USE_MOCKS=true`
  (H-24): confirmar con qué variables se despliega.
- **Documentación atrasada**: `frontend/CLAUDE.md` y
  `docs/Frontend-Architecture/SHARED.md` no mencionan `SearchSelect`,
  `usePageTitle`, `fieldIds`/`controlA11y`, la pila de modales ni
  `dismissOnBackdrop`. `MATRIZ_CA.md` se regenera con `npm run ca-matrix`.
  El `CLAUDE.md` raíz dice que el contrato vigente es V5 y el del front, V6
  (H-15).

## 9. Lo nuevo que conviene conocer

| Archivo | Qué es |
|---|---|
| `src/shared/components/forms/SearchSelect.tsx` | El select con filtro |
| `src/shared/components/forms/fieldA11y.ts` | `fieldIds` y `controlA11y`: unen un campo con su error y su nota |
| `src/shared/hooks/usePageTitle.ts` | El título de la pestaña: una línea por página |
| `src/shared/components/ui/Modal.tsx` | La pila de modales, `dismissOnBackdrop` y la `×` |
| `src/app/providers/AuthProvider.tsx` | La sincronización de la sesión entre pestañas |
| `src/app/providers/toastDuration.ts` | Cuánto dura cada tipo de aviso |
| `src/features/cases/api/invalidateCaseCounters.ts` | Qué listados quedan viejos cuando cambia una causa |
| `src/features/cases/api/useClientOptions.ts`, `useQualificationOptions.ts` | De dónde salen las opciones del selector |
| `src/features/cases/components/NewQualificationModal.tsx` | "Registrar calificación nueva", compartido por el alta y "Modificar causa" |
| `tests/setup/searchSelect.ts` | `chooseOption`, para elegir en un `SearchSelect` desde un test |

**Tres cosas que rompen un test nuevo si no se saben:**

- Un test que navegue por el rail tiene que buscar `link`, no `button`.
- Un aviso de éxito o de información es `status`, no `alert`.
- Dentro de un modal, un botón `/cerrar/i` ahora encuentra también la `×`.

## 10. Dónde está el detalle

| Qué querés ver | Documento |
|---|---|
| El pedido original | [00](00-ENCARGO.md) |
| Arquitectura y hallazgos H-01 a H-33 | [01](01-DIAGNOSTICO_INICIAL.md), [04](04-OLA1_RESULTADOS.md) |
| Hallazgos visuales H-34 a H-52 | [07](07-REVISION_VISUAL.md) |
| Plan A, tarea por tarea, con causa y solución | [12](12-REGISTRO_PLAN_A.md), [16](16-RESUMEN_PLAN_A.md) |
| Plan B, tanda por tanda | [08](08-TANDA1_RESULTADOS.md), [09](09-TANDA2_RESULTADOS.md), [10](10-TANDA5_RESULTADOS.md), [14](14-TANDAS6A10_RESULTADOS.md) |
| La última tanda | [17](17-TANDA11_RESULTADOS.md) |
| Las notas entre los dos planes y las decisiones acordadas | [11](11-PARA_LUCIANO.md), [13](13-RESPUESTA_A_FACUNDO.md), [15](15-PARA_LUCIANO_2.md) |
