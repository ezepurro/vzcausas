# Ola 1 — Resultados de la verificación

12/11/2026 · rama `feat/auditoria-front` · **sin cambios de código.** Los
datos de prueba se sembraron en la base en memoria del mock desde el
navegador: no quedó nada en disco.

Rutas relativas a `frontend/`. Los `H-xx` son los del
[diagnóstico](01-DIAGNOSTICO_INICIAL.md); los `T-xx`, los del
[plan](03-PLAN.md). Todo se corrió contra los mocks (`VITE_USE_MOCKS=true`),
con el usuario `fvazquez` (Administrador + Abogado).

## Resumen

| Tarea | Resultado |
|---|---|
| T-01 Sesión entre pestañas | **Confirmado a medias**: la pestaña vieja sigue mostrando datos sin sesión. El cruce de usuarios no se puede probar con el mock |
| T-02 Test rojo | **Intermitente**: aislado pasa 3 de 3; falló 1 vez en 1 corrida de la suite completa |
| T-03 Build, E2E, dependencias | Build bien; E2E 9 de 9; `npm audit` 0 vulnerabilidades; el secreto de la campana **no** sale en el build |
| T-04 Tope de 100 | **H-03 y H-28 reproducidos** (H-28 sólo en el alta: en "Modificar causa" no pasa) |
| T-05 Seis anchos | Sin desborde de página en ninguna ruta. Dos detalles: la tabla de Causas a 1366 px y los filtros del tablero en el teléfono |
| T-06 Teclado y modales | **H-05 y H-07 confirmados**. H-06 hoy no tiene dónde ocurrir |

## T-01 · Sesión entre pestañas (H-01)

**Lo que se hizo.** Pestaña A abierta en `/causas` con sesión. Se abrió una
pestaña B en la misma dirección.

**Lo que pasó.** B terminó en `/login` y borró `vz.token` y `vz.session` de
`localStorage`. A siguió mostrando el listado (20 filas), el rail y el nombre
del usuario **sin sesión guardada**. Recién al navegar a `/clientes` (primer
pedido) A fue al login.

**Lo que confirma.** `AuthProvider` no se entera de que la sesión desapareció
del almacenamiento (`src/app/providers/AuthProvider.tsx:42`, sin oyente de
`storage`): una pestaña queda mostrando datos de alguien que ya salió hasta
su próximo pedido.

**Lo que no se pudo probar: el cruce de usuarios.** El motivo por el que B
perdió la sesión es del mock, no de la app: cada pestaña tiene su copia en
memoria de las sesiones (`src/shared/mocks/db.ts:733`, `PersistedSessions`) y
no relee lo que otra pestaña emitió, así que el token que renueva una pestaña
la otra no lo conoce y responde `401`. **Con los mocks, abrir una segunda
pestaña cierra la sesión de las dos.** Es un hallazgo nuevo (H-31, BAJO: sólo
desarrollo, pero impide probar cualquier cosa con dos pestañas).

Leyendo el código, con el backend real y un usuario distinto en B pasaría
esto en A: un pedido que responde `200` trae datos del usuario de B bajo la
pantalla del de A; y uno que responde `403` dispara la sincronización
(`AuthProvider.tsx:221`), que compara el usuario renovado contra el **del
almacenamiento** (`sessionStorage.ts`, `writeRefreshedSession`) —que ya es el
de B— y deja a A convertida en B sin vaciar la caché. **Sin verificar: hay
que probarlo con el backend levantado.**

## T-02 · `RouteErrorPage.test.tsx` (H-02)

`npx vitest run tests/components/app/RouteErrorPage.test.tsx`, tres veces:
9 de 9 las tres. En la corrida completa del diagnóstico falló el caso "sin
conexión no ofrece recargar" en la línea 109.

El test simula el evento `online` adentro de un `act` (`:104-107`) y afirma
enseguida, sin esperar (`:109`). Aislado alcanza; con 102 archivos corriendo
a la vez, a veces no. **Hipótesis, no confirmada**: cambiar el `getByRole` de
`:109` por una espera (`findByRole` o `waitFor`). No se corrió la suite
completa más veces, así que no hay una tasa de falla.

## T-03 · Build, E2E y dependencias

| Qué | Resultado |
|---|---|
| `npm run build` | Sin errores |
| `npm run test:e2e` | 9 de 9 (21 s) |
| `npm audit` (con y sin dependencias de desarrollo) | 0 vulnerabilidades |

**Tamaño del build**

| Archivo | Tamaño | Comprimido | Qué es |
|---|---|---|---|
| `index-*.js` | 422 kB | 135 kB | Lo que baja antes del login: React, router, TanStack Query, axios, marcos, sesión |
| `browser-*.js` | 552 kB | 193 kB | **Los mocks** (MSW, semillas, handlers) |
| `index-*.css` | 83 kB | — | Todo el CSS, en un archivo |
| `CaseDetailPage-*.js` | 28 kB | 8 kB | La pantalla más pesada |
| Resto de las pantallas | 3 a 21 kB cada una | — | Carga diferida, funciona |

- La carga diferida por pantalla anda: cada página es su archivo.
- **Los mocks se publican** (H-24, confirmado): el archivo sólo se descarga
  si el build se hizo con `VITE_USE_MOCKS=true`. **Ojo**: `.env.local` tiene
  esa variable y `vite build` también lee `.env.local`, así que este build
  local los enciende. Hay que confirmar que el despliegue no usa ese archivo.
- **El secreto de la campana no sale** (confirmado): en el archivo principal
  queda `"x-internal-trigger-secret": void 0`. Sí quedan a la vista la ruta
  `/internal/deadlines/daily-run` y el nombre del encabezado: se van solos si
  la campana deja de dibujarse en producción (T-22).
- Las herramientas de desarrollo de TanStack Query no entran en el build.
- 135 kB comprimidos de arranque es razonable; no hay nada urgente acá.

## T-04 · El tope de 100 (H-03, H-28)

Se sembraron por la API del mock 111 clientes (110 con apellido `Aaprueba…`,
que quedan primeros) y 106 calificaciones (105 con nombre `Aa prueba …`).

| Prueba | Resultado |
|---|---|
| Selector de cliente en "Registrar causa" | **100 opciones exactas.** No está GÓMEZ ni ninguno de los 23 clientes reales. Ningún aviso de que faltan |
| Selector de calificaciones en "Registrar causa" | **100 opciones.** No está "Robo calificado" ni ninguna de las 8 reales |
| "Registrar calificación nueva" desde el alta, con un nombre que cae después de la 100 | Se registra, el modal se cierra y la calificación aparece como **"Calificación dada de baja — Ya no está vigente: quitala para poder registrar la causa."** Su nombre no se muestra |
| "Modificar causa" de la causa 1, cuya calificación quedó fuera de las 100 | **Bien**: "Robo calificado — art. 167 inc. 2 CP" se muestra con su plazo. El diagnóstico decía que acá también fallaba: **estaba mal**, el diálogo toma el nombre de la causa |

**H-28 queda así**: ALTO, sólo en el alta. Registrar una calificación nueva
desde "Registrar causa" con más de 100 calificaciones en la base la muestra
como dada de baja y bloquea el alta (`RegisterCasePage.tsx:208-214`, `:317`).

No se probó el cliente recién creado con recarga y borrador (recargar borra
la base en memoria del mock y con ella lo sembrado).

## T-05 · Seis anchos

Las 13 rutas con pantalla, en 320, 390, 768, 1024, 1366 y 1440 px. Se midió
con un script: desborde de la página, elementos que se salen del ancho sin un
contenedor con scroll, contenedores con scroll horizontal, y botones y
títulos cortados.

| Ancho | Resultado |
|---|---|
| 320 | Sin desborde. Los filtros de Inicio (`.vz-filters`) tienen 4 px de scroll horizontal |
| 390 | Igual que 320 |
| 768 | Limpio |
| 1024 | Limpio |
| **1366** | **La tabla de Causas hace scroll horizontal** (55 px, `.vz-panel__scroll`). Es el ancho de notebook más común |
| 1440 | Limpio |

Dos hallazgos nuevos: **H-32 (MEDIO)**, la tabla de Causas no entra a
1366 px; **H-33 (BAJO)**, los 4 px de los filtros del tablero.

**Límites.** Es una medición, no una revisión visual: no detecta
superposiciones, alineaciones ni jerarquía. Sólo se miraron capturas a 375 px
(Causas, detalle e Inicio, en el diagnóstico). Un solo perfil. Los modales no
se midieron en ningún ancho. La revisión con ojos de las 13 pantallas sigue
pendiente.

## T-06 · Teclado, foco y modales

| Prueba | Resultado |
|---|---|
| Foco visible al tabular | Sí: contorno sólido de 2 px en el botón probado |
| Enlace "saltar al contenido" | No hay |
| H-05: modal "Registrar cliente" con texto escrito, clic en el fondo | **Se cierra sin preguntar** y lo escrito se pierde |
| H-07: menú del teléfono abierto | El contenido de atrás no queda inerte (`inert` ausente, sin `aria-hidden`) y **el foco no entra al menú**: queda en un botón de la página tapada. Los ítems son `<button>` |
| H-06: dos modales apilados | **Hoy no hay ninguna pantalla que apile modales**: los del alta se abren sobre una página, y "Modificar causa" no abre otro. Pasa a ser real con T-12 |

No se hizo el recorrido completo de teclado pantalla por pantalla ni la
prueba con lector de pantalla. Tampoco los estados de carga, vacío y error uno
por uno.

## Cambios al diagnóstico y al plan

| Qué | Cambio |
|---|---|
| H-01 | Primera mitad confirmada; el cruce de usuarios sigue sin verificar y necesita el backend real |
| H-02 | Es intermitente, no un test roto |
| H-03, H-05, H-07, H-24 | Confirmados |
| H-06 | Baja a latente: no ocurre hoy. T-13 sigue siendo requisito de T-12 |
| H-28 | Sólo el alta; "Modificar causa" está bien |
| H-31 (nuevo, BAJO) | Con los mocks, una segunda pestaña cierra la sesión de las dos (`db.ts:733`) |
| H-32 (nuevo, MEDIO) | La tabla de Causas hace scroll horizontal a 1366 px |
| H-33 (nuevo, BAJO) | 4 px de scroll en los filtros de Inicio en el teléfono |
| T-10 | Para probarlo hace falta el backend real **o** arreglar antes H-31 en el mock |
| T-11b | El punto 3 se achica: "Modificar causa" ya resuelve los nombres desde la causa; el arreglo es sólo del alta |

## Lo que queda de la ola 1

- Cruce de usuarios entre pestañas, con el backend real.
- Revisión visual con capturas de las 13 pantallas y de todos los modales, en
  los seis anchos y con los perfiles `gestion`, `mrios` y `supervision`.
- Recorrido completo de teclado y lector de pantalla.
- Estados de carga, vacío y error por pantalla.
- Confirmar con qué variables se hace el build que se despliega.
