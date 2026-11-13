# Tanda 13 — carreras y tests de caché (C-2, C-3)

13/11/2026 · Luciano con Claude · rama `feat/auditoria-front` · cambios en el
árbol de trabajo, **sin commitear**, encima de la tanda 12
([18](18-TANDA12_H55.md)). Rutas relativas a `frontend/`. Cierra las
"Carreras que faltan" y los tests de caché que el
[16-RESUMEN_PLAN_A.md](16-RESUMEN_PLAN_A.md) dejaba pendientes.

## En pocas líneas

| Qué se revisó | Resultado |
|---|---|
| Cambiar de causa con una operación en vuelo | **Bug, corregido.** La carpeta creada en una causa aparecía en otra |
| Sondeo de la carpeta al cambiar de causa | Sin problema: se corta solo |
| Respuesta que llega después de salir de la pantalla | Sin salto de vuelta. Pero un error que llegaba cuando ya se había salido **no se avisaba**. Ahora sale un aviso general (decisión de Luciano del 13/11/2026) |
| C-2 y C-3 (caché) | Ya estaban arreglados; ahora tienen test |

## 1. Cambiar de causa con una operación en vuelo (bug, corregido)

**Qué pasaba.** Desde la causa 1 se registra una causa nueva: el alta
reemplaza la entrada del historial y lleva a su detalle
(`RegisterCasePage.tsx:313`). Ahí se toca "Crear carpeta" y, con el pedido en
vuelo, "Atrás" del navegador vuelve a la causa 1. Cuando llega la respuesta,
**la causa 1 queda con la carpeta de la otra**: "Abrir carpeta en Drive" abre
una carpeta ajena. La otra causa queda con su carpeta "Pendiente", aunque el
servidor ya la creó. La ventana no es chica: el servidor espera a Drive antes
de responder.

**Por qué.** `CaseDetailPage` no se desmonta al cambiar `:caseId`: la misma
página pasa a mostrar la otra causa. Los hooks de mutación de una causa la
reciben como parámetro (`useCreateCaseFolder(caseId)`), y TanStack Query, si
cambian las opciones del hook con una mutación pendiente, se las pasa a esa
mutación (`node_modules/@tanstack/query-core/build/modern/mutationObserver.js:31`):
el `onSuccess` que corre es el de la causa nueva. Hace falta que la causa
anterior esté en caché (si no, mientras carga se dibuja el esqueleto y la
tarjeta se desmonta), que es lo normal para una causa que está antes en el
historial.

**Cómo se comprobó.** Con un test descartable, visitando la causa 1, pasando a
la 23 y volviendo: la caché de la 1 quedó con `vz-causa-23`.

**Arreglo.** Cada hook que recibe la causa lleva una `mutationKey` con ella:
`casesKeys.mutation(id, acción)` (`src/features/cases/api/cases.keys.ts:37`).
Si la clave cambia, TanStack suelta la mutación en vuelo en lugar de pasarle
las opciones nuevas, y esa mutación termina sobre la causa que la pidió. Son
nueve hooks:

| Hook | Qué hacía mal con la causa cambiada (probado en los dos primeros; los demás, leído) |
|---|---|
| `useCreateCaseFolder` | Escribía la carpeta en la otra causa (el caso reproducido) |
| `useUpdateCase` | Reemplazaba la otra causa entera con la respuesta |
| `useDeclarePrescription`, `useDeclareQualificationPrescription` | Ídem |
| `useDeleteCase` | Sacaba de la caché la otra causa, y dejaba la dada de baja |
| `useRegisterInterruptiveAct`, `useCreateCaseFile` | Refrescaba la otra causa en vez de la propia |
| `useRegisterProceduralAct`, `useUpdateProceduralAct` (en `proceedings/`) | Ídem |

Del lado de la pantalla, el botón de la causa nueva ya no queda "guardando"
por la operación de la otra. Lo que se pierde: el aviso de éxito o error de
esa operación (ver la sección 3), porque la página ya no la escucha.

`useDownloadCaseDocument` no se tocó: no escribe en la caché.

## 2. Sondeo de la carpeta al cambiar de causa (sin problema)

Mientras la carpeta está `CREATING`, `useCase` vuelve a pedir la causa cada
3 s (`src/features/cases/api/useCase.ts:25`). Medido con un test descartable:
en la causa 11 (`CREATING`) se pidió una vez más a los 3 s; al pasar a la 1,
**ningún** pedido más de la 11 en los 3,5 s siguientes. El sondeo es de la
consulta que se está mirando y se corta solo. No se agregó test: no hay
defecto, y la espera real haría lenta la suite.

## 3. Respuesta que llega después de salir de la pantalla (aviso nuevo)

Ninguna pantalla usa `mutateAsync`: las 31 mutaciones usan
`mutate(vars, { onSuccess, onError })`. TanStack sólo corre esas funciones si
el componente sigue montado (`mutationObserver.js:76`, `hasListeners()`). Así
que:

- **Lo bueno:** una respuesta tardía nunca navega ni arrastra a la persona de
  vuelta a la pantalla que dejó.
- **Lo que falta:** si sale antes de la respuesta, no se entera de cómo
  terminó. Comprobado con "Crear carpeta" y Drive caído: quedándose, el error
  sale en la tarjeta; saliendo, **ningún aviso**. Donde más pesa es en
  "Registrar causa": si se sale con el alta en vuelo y el servidor la rechaza
  (un SAC repetido, por ejemplo), nadie avisa. El borrador sí queda para
  recuperar.

La caché sí queda bien: lo que hace cada hook (`onSuccess` del `useMutation`)
corre igual.

**Opciones que se plantearon:** dejarlo así; un aviso de error general para
la mutación que falla cuando su pantalla ya no está; o pedir confirmación para
salir mientras se guarda. **Luciano eligió el aviso** (13/11/2026).

**Cómo quedó.**

| Qué | Dónde |
|---|---|
| La caché de mutaciones avisa cada vez que se suma o se va un observador (`observerAdded`, `observerRemoved`). Con eso se lleva, por mutación, quién la escucha: la mutación no lo publica | `trackMutationListeners`, `src/shared/api/leftBehindErrors.ts:57` |
| Si una mutación falla sin nadie que la escuche, se avisa. Si la pantalla sigue ahí, no se agrega nada: el aviso es el suyo | `reportIfLeftBehind`, `:76`, llamado desde el `onError` de la caché (`src/shared/api/queryClient.ts:13`) |
| El texto: "No se completó lo que dejaste en curso: " y el mensaje del servidor. Por ejemplo, "… Ya existe una causa vigente con ese número de SAC." | `leftBehindMessage`, `:34` |
| No se avisa un `UNAUTHENTICATED`: la sesión se cierra y el login ya lo dice. Tampoco lo que falla después de vaciar la caché (`queryClient.clear()`, al cerrar la sesión): es de una sesión que ya terminó. Lo segundo, además, evita que en los tests un error de un test aparezca en el siguiente | `:34` y `:76` |
| Lo muestra el proveedor de avisos, que registra la función al montarse, con el mismo patrón que `http.ts` y `AuthProvider` | `src/app/providers/ToastProvider.tsx:32` |

El éxito sigue callado: lo que hizo el hook ya está en la caché, y al volver
se ve.

**Avisos dobles: no hay.** Las tres bajas con baja optimista
(`useDeleteUser`, `useDeleteProceduralState`, `useDeleteLegalQualification`)
sólo restauran las filas en el `onError` del hook, sin avisar, y
`useCaseEdit` avisa desde el `mutate`, que ya no corre si la pantalla no está.
Si alguien sale de una de esas pantallas y la baja falla, ahora se entera de
que la fila volvió.

**Cambia el texto, no la forma:** es un aviso de error común (8 s, pausa con
el puntero encima), como los demás.

**Las descargas sí terminan** aunque se salga: `useDownloadCaseDocument` y
`useDownloadDocumentTemplate` guardan el archivo, o abren la impresión, dentro
de la propia mutación. Se anota; no parece un defecto.

## 4. Tests de caché C-2 y C-3

Los arreglos son de la auditoría de caché ([12](12-REGISTRO_PLAN_A.md)) y
quedaban "para revisión manual". Ahora cada uno tiene test, que corre la
mutación contra el mock y mira qué claves quedan marcadas como viejas. Cada
test se comprobó también al revés: sin la invalidación del hook, falla.

| Caché | Test | Qué fija |
|---|---|---|
| C-2 | `tests/components/users/userMutations.cache.test.tsx:34` | Registrar un usuario con ficha nueva marca viejos los listados de abogados (los de "Abogados" y el de "Abogado responsable") y los de usuarios |
| C-2 | `:56` | Vincular un usuario a otra ficha (`ravila` a la de Campos, que no tenía usuario), ídem |
| C-3 | `tests/components/legal-params/legalParamsMutations.cache.test.tsx:39` | Modificar un estado procesal marca viejos el detalle de una causa, su línea de vida, el listado de causas y el tablero |
| C-3 | `:50` | Modificar el plazo de una calificación legal, ídem |

## Tests nuevos

13, en 4 archivos: los cuatro de arriba, dos en
`tests/components/cases/caseSwitchRace.test.tsx`:

| Test | Qué fija |
|---|---|
| `:37` | La carpeta creada en una causa no aparece en la causa a la que se volvió con "Atrás", y "Abrir carpeta en Drive" sigue apuntando a la propia |
| `:62` | "Modificar causa" deja la respuesta en la causa modificada aunque el hook ya sea de otra, y el botón de la nueva no queda "guardando" |

Los dos fallan sin la `mutationKey` (comprobado sacándola de
`useCreateCaseFolder` y `useUpdateCase`).

Y 7 en `tests/components/shared/leftBehindErrors.test.tsx`, para el aviso.
Usan una pantalla de prueba que pide "Crear carpeta" de la causa 23 con Drive
caído y un botón para salir de ella:

| Test | Qué fija |
|---|---|
| Saliendo antes de la respuesta | Sale el aviso, con el mensaje del servidor. Sin el `onError` de la caché, falla (comprobado) |
| Quedándose | No se agrega ningún aviso |
| Saliendo, con la sesión cerrada en el medio (`queryClient.clear()`) | No se avisa. Sin ese resguardo, falla (comprobado) |
| Saliendo, y la operación sale bien | No se avisa nada |
| `leftBehindMessage` (3) | El texto con el mensaje del servidor; `null` para `UNAUTHENTICATED`; texto general para un error que no es del servidor |

Ningún test existente se modificó.

**Para escribir sondas en tests:** en esta versión de Vitest, un
`console.log` de un test que pasa no se muestra; `process.stdout.write`, sí.

## Verificación

| Qué | Resultado |
|---|---|
| `npm run lint` | 0 errores; el warning conocido de `Icon.tsx:2` |
| `npx tsc -b` | Limpio |
| `npx vitest run` | **759 de 759** (118 archivos). Antes de la tanda: 746 |
| `npm run build` | Sin errores |
| `npm run test:e2e` | **9 de 9** (también cubre la tanda 12, que no los había corrido) |
| Navegador, con mocks, `gestion`, 1366 px · cambio de causa | Causa 1 → causa 23 → "Crear carpeta" con 2 s de demora → "Atrás": la 1 sigue con `vz-causa-1`; al volver a la 23, tiene `vz-causa-23` y ya no ofrece crearla. La navegación se hizo con el historial del navegador (`pushState` y `history.back()`), sin recargar |
| Navegador · el aviso, 1366 px | Causa 22 → "Reintentar" con Drive caído y 2 s de demora → salir al listado: en el listado sale "No se completó lo que dejaste en curso: No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.". Quedándose: sólo el error de la tarjeta, sin aviso agregado |
| Navegador · el aviso, 375 px | El aviso entra en tres renglones, a todo el ancho (355 px), sin desborde. **Visto** en captura |
| Consola | Sin errores propios. Quedaron dos `ReferenceError` de una versión intermedia de `ToastProvider.tsx` que tomó la recarga en caliente entre dos ediciones (la marca `?t=` es de ese momento); al recargar no se repitieron, y el archivo servido trae la importación. Los 502 y el 401 son los forzados (Drive caído) y el de la sesión al recargar |

**Sin verificar:**

- "Registrar causa" con un SAC repetido saliendo de la pantalla, en el
  navegador: el mecanismo es el mismo para todas las mutaciones y se probó con
  la carpeta.
- Capturas a 1366 px: el panel del navegador estaba oculto y no dibujaba. Se
  leyó el DOM.
- Contra el backend real, donde la espera de Drive es la de verdad.
