# Registro del plan A — técnico y funcional

Lo que se hizo del [plan A](05-PLAN_A_TECNICO.md), tarea por tarea: qué
pasaba, por qué, cómo se arregló y cómo se comprobó. Se actualiza con cada
tanda. Rutas relativas a `frontend/`.

Estado al 13/11/2026: **5 tareas hechas de 10, más la auditoría de caché y de
doble envío.** Los cambios del selector (T-11) están en el commit `d4ad014`;
el resto está en el árbol de trabajo, sin commitear.

## Resumen

| Tarea | Hallazgo | Estado |
|---|---|---|
| T-11 Selector con filtro | H-03, H-28, H-29 | **Hecha** |
| T-13 Modales apilados, cierre con datos y `×` | H-05, H-06, H-44 | **Hecha** |
| T-12 Calificación nueva en "Modificar causa" | H-30 | **Hecha** |
| T-28 El mock con dos pestañas | H-31 | **Hecha** |
| T-10 Sesión entre pestañas | H-01 | **Hecha**, probada con el mock. Falta el backend real |
| T-25 Test intermitente | H-02 | **Endurecido**; la causa no se confirmó |
| T-23 Timeouts de archivos | H-11 | **Hecha**, con un valor estimado: falta medir con el backend |
| T-24 Fecha estimada de prescripción | H-14 | **Hecha** |
| T-26 Renovación por `403` | H-09 | Pendiente (sólo análisis) |
| T-40 Limpieza | H-16, H-18, H-19 | **Hecha en parte** (ver abajo) |

## Verificación de la última tanda

| Qué | Resultado |
|---|---|
| `npx tsc -b` | Limpio |
| `npm run lint` | 0 errores (el warning conocido de `Icon.tsx:2`) |
| `npx vitest run` | **695 de 695** (107 archivos, con lo del plan B). Antes de empezar: 651. **Ojo: falla intermitente abierta**, ver abajo |
| `npm run test:e2e` | **9 de 9** |
| Navegador con mocks | Selector en el alta y en "Modificar causa"; dos pestañas reales (ver T-10) |

No se probó nada contra el backend real.

## T-11 · Selector con filtro (H-03, H-28, H-29)

**Qué pasaba.** El cliente y las calificaciones de "Registrar causa" se
elegían en un `<select>` nativo: no se podía escribir para filtrar. Además el
listado se pedía una sola vez con `limit: 100`: con más clientes que eso, los
últimos por apellido no se podían elegir; y una calificación recién
registrada que caía después de la 100 se mostraba como "Calificación dada de
baja" y bloqueaba el alta (reproducido en la ola 1).

**Causa.** Las opciones y los elegidos salían de la misma página de 100. Lo
que no estaba en esa página "no existía".

**Solución.**
- `SearchSelect` (`src/shared/components/forms/SearchSelect.tsx`): un select
  en el que se escribe para filtrar. No distingue acentos ni mayúsculas,
  encuentra un DNI escrito sin puntos y se maneja con flechas, Enter y Escape.
- Las opciones (`useClientOptions`, `useQualificationOptions`, en
  `src/features/cases/api/`): si todo entra en una página se filtra en el
  selector; con más de 100, lo escrito viaja como `search` y una nota dice
  "Se muestran 100 de N… Escribí para buscar entre todos.".
- Lo **elegido** se pide por su id (`useClient`, `useLegalQualificationsByIds`):
  "dada de baja" pasa a ser el `404` de esa consulta. Desapareció el parche
  `createdClient` del alta.

**Comprobado.** 11 tests del componente
(`tests/components/shared/SearchSelect.test.tsx`), 3 de regresión con 110
registros sembrados (`RegisterCasePage.test.tsx`, "con más de 100 clientes o
calificaciones"), los tests del alta y el E2E adaptados al selector nuevo, y
en el navegador.

**Para el plan B.** Se agregó CSS en el bloque "combobox" de
`src/styles/controls.css`.

**Corregido el 13/11/2026, al mirarlo en el navegador:** a 320 px, al lado
de "Registrar cliente nuevo" o "Registrar calificación nueva", el campo
quedaba de 34 px de ancho. Un `<select>` tiene ancho natural y hacía bajar
al botón; este campo no. Se sumó a la regla del teléfono de `.vz-field-row`
(`controls.css`) y ahora ocupa su renglón. Visto a 320 px en el alta y
adentro de "Modificar causa". Sin test: es CSS.

**Queda.** Un cliente elegido que después se da de baja no avisa nada en el
selector (el alta lo rechaza el servidor). El selector de abogado responsable
sigue siendo un `<select>` (decisión 7).

## T-13 · Modales apilados (H-06)

**Qué pasaba.** Con un modal encima de otro, un Escape cerraba los dos y las
dos trampas del tabulador competían por el foco.

**Causa.** Cada `Modal` registra su `keydown` en `document` y ninguno sabía
si tenía otro encima.

**Solución.** Una pila de modales abiertos en `Modal.tsx`: sólo el de arriba
atiende Escape y Tab. El lugar en la pila se toma en un efecto aparte del que
escucha el teclado, porque ese se rearma cada vez que cambia `onClose`: si la
pila se tocara ahí, un modal de abajo que se redibuja pasaría al frente.

**Comprobado.** 2 tests nuevos en `tests/components/shared/Modal.test.tsx`,
con `onClose` en línea a propósito para cubrir ese caso.

### Cierre con datos cargados y `×` (H-05, H-44) — 13/11/2026

**Qué pasaba.** Un clic en el fondo, a veces sin querer, cerraba un
formulario y se perdía lo escrito sin preguntar. Y ningún modal tenía un
botón visible para cerrar.

**Solución.**
- `Modal` acepta `dismissOnBackdrop` (por defecto `true`). `FormModal` lo
  apaga cuando tiene campos, declarados o propios; también lo apagan
  "Modificar causa" (`CaseEditForm.tsx`) y "Registrar modelo formal"
  (`DocumentTemplateFormModal.tsx`). Una confirmación sin campos se sigue
  cerrando con un clic afuera.
- Todos los modales tienen una `×` en la cabecera (`aria-label="Cerrar"`).
  Escape, "Cancelar" y la `×` siempre cierran: son gestos deliberados.

**Comprobado.** 4 tests nuevos en `Modal.test.tsx` y 3 en
`FormModal.test.tsx`; en el navegador, "Registrar cliente": el clic afuera no
cierra y la `×` sí.

**Cambia para quien usa teclado:** la `×` es la primera parada del tabulador
de cada modal, antes del primer campo.

**Para el plan B.** El estilo de la `×` es mínimo y está en
`src/styles/feedback.css` (`.vz-modal__close`); la cabecera ganó espacio a la
derecha para que el título no la pise.

**No se hizo:** preguntar "¿descartar los cambios?" al cerrar con Escape o
"Cancelar". Haría falta saber si el formulario cambió, y hoy `Modal` no lo
sabe.

## T-12 · "Registrar calificación nueva" en "Modificar causa" (H-30)

**Qué pasaba.** Desde "Modificar causa" no se podía registrar una
calificación: había que cerrar, ir a Calificaciones legales y volver.

**Solución.** El modal de alta que estaba adentro de `RegisterCasePage.tsx`
pasó a ser un componente (`cases/components/NewQualificationModal.tsx`) que
usan las dos pantallas. `useCaseEdit` guarda si está abierto y `CaseEditForm`
lo dibuja encima del diálogo.

**Comprobado.** 2 tests nuevos en `CaseDetailPage.edit.test.tsx`: registra y
la agrega; Escape cierra sólo el de arriba.

**No se hizo: registrar un cliente desde "Modificar causa".** El cliente de
una causa no se modifica por contrato (D-111): no habría cómo asignarlo.

## T-28 · El mock con dos pestañas (H-31)

**Qué pasaba.** Con los mocks, abrir una segunda pestaña cerraba la sesión de
las dos.

**Causa.** Cada pestaña tiene en memoria su copia de las sesiones del mock y
no releía lo que otra emitía: no reconocía el token renovado por la otra,
respondía `401` y el front cerraba la sesión.

**Solución.** `src/shared/mocks/db.ts`: el mock escucha el evento `storage`
y relee las sesiones cuando otra pestaña las escribe.

**Comprobado.** En el navegador: dos pestañas, recarga de una, las dos siguen
con sesión. Sin test automático (es código del mock de desarrollo).

## T-10 · Sesión entre pestañas (H-01)

**Qué pasaba.** Cerrar sesión en una pestaña dejaba a las otras mostrando la
pantalla y los datos hasta su próximo pedido. Y si entraba otra persona, la
pestaña vieja mostraba a la primera mientras pedía con el token de la segunda.

**Causa.** `AuthProvider` leía `localStorage` una sola vez al montarse; el
cliente HTTP, en cada pedido.

**Solución.** `AuthProvider` escucha el evento `storage`
(`src/app/providers/AuthProvider.tsx`):
- desapareció la sesión → se cierra acá también y se vacía la caché, sin
  recordar la pantalla (quien entre después puede ser otra persona);
- entró otro usuario → se vacía la caché y se toma su sesión;
- el mismo usuario con otro token o con otros roles → se actualiza, sin
  tocar la caché.

**Comprobado.** 5 tests en `tests/components/auth/crossTab.test.tsx`, y en el
navegador con dos pestañas: al entrar en una, la otra (parada en el login)
entra sola; al salir en una, la otra va al login en el momento.

**No comprobado.** Contra el backend real. Los borradores de formularios de
la otra pestaña se conservan a propósito (llevan el id de su usuario).

## T-25 · Test intermitente (H-02)

`tests/components/app/RouteErrorPage.test.tsx` falló una vez en una corrida
completa y nunca aislado. Las dos afirmaciones que siguen a un evento
`online`/`offline` ahora esperan (`waitFor`, `findByRole`). **Es una
hipótesis**: la falla no se pudo reproducir, así que no se puede afirmar que
esa fuera la causa. Si vuelve a aparecer, hay que anotar el mensaje.

## T-24 · Fecha estimada de prescripción en fin de mes (H-14)

**Qué pasaba.** El resumen del alta mostraba un vencimiento estimado que
podía no ser el que después tenía la causa: un hecho del 31/08 con 6 meses
daba 03/03 en vez de 28/02.

**Causa.** `estimatedExpiry` sumaba meses con `new Date(año, mes, día)`, que
se pasa al mes siguiente si el de destino es más corto. El backend deja el
día en el último del mes
(`backend/src/subsystems/cases/core/domain/prescription.ts:69`,
`addPrescriptionMonths`).

**Solución.** La misma regla en `src/features/cases/utils/prescription.ts`.

**Comprobado.** Un test nuevo con cinco casos, bisiesto incluido
(`tests/unit/cases/prescription.test.ts`).

**Contradicción sin resolver, para el equipo.** El mock hace la cuenta
vieja a propósito: `src/shared/mocks/calendar.ts:111` (`addMonths`) dice
"mismo criterio que el prototipo, incluido el desborde de fin de mes". El
contrato no dice nada del caso. Hoy el backend corta en el último día y el
mock y el prototipo se pasan de mes: **no se tocó el mock**; hay que decidir
cuál vale y dejarlo escrito en el contrato.

## T-23 · Timeout de subidas y descargas (H-11)

Subir un modelo, bajarlo, la carátula y la descarga de un documento usaban
el tope general de 15 s y podían cortarse a mitad de la transferencia. Ahora
usan `FILE_TRANSFER_TIMEOUT_MS` (60 s, `src/shared/api/http.ts`). **El valor
es una estimación**: no se midió contra el backend desplegado, y no tiene
test.

## T-40 · Limpieza (H-16, H-18, H-19)

Hecho: los dos imports comentados de `src/main.tsx`; los imports relativos
de `src/App.tsx` y `src/shared/components/forms/FormModal.tsx`, ahora con el
alias `@`; y el comentario de `src/shared/api/http.ts` que citaba un
contrato que no existe.

No hecho, a propósito:

- **`react-hook-form`** (H-16) sigue instalado: `frontend/CLAUDE.md` lo deja
  como decisión pendiente del equipo.
- **Las carpetas vacías con `.gitkeep`** (H-19) **no eran un hallazgo**:
  `frontend/CLAUDE.md`, "Anatomía de un módulo", dice que las seis carpetas
  existen siempre. Se retira.
- `src/shared/components/forms/FieldError.tsx:1` conserva su import
  relativo: el archivo es del plan B.

## Falla intermitente abierta (H-55)

En 2 de 6 corridas de la suite completa del 13/11/2026 falló **un** test del
alta de causa, distinto cada vez: "con borrador, 'Recuperar' carga lo que
había" (`RegisterCasePage.draft.test.tsx`) y "al pasar al amparo o al
administrativo…" (`RegisterCasePage.test.tsx`). Aislados pasan siempre, y las
últimas tres corridas completas dieron 694 de 694.

**No se consiguió el mensaje del error ni la causa.** Sospecha, sin
confirmar: el selector nuevo (T-11) suma pedidos y una espera de 200 ms a
esos tests, que aislados ya tardan hasta 2,3 s, y con los 107 archivos
corriendo a la vez alguno se pasa del tiempo. Antes de T-11 estos tests no
habían fallado en ninguna corrida. Hay que capturar el mensaje la próxima vez
que aparezca.

**Capturado después (13/11/2026), y postergado a pedido.** En una corrida
completa falló "con borrador, 'Recuperar' carga lo que había" con:

```
TestingLibraryElementError: Unable to find role="button" and name "Recuperar"
```

Es la primera espera del test (`findByRole`, 1 segundo por defecto): el
diálogo del borrador no llegó a dibujarse a tiempo. En la misma salida
aparece tres veces `Error: useCurrentUser() requires an open session`
(`AuthContext.ts:81`, desde `RegisterCasePage.tsx:100`); **no se determinó**
si es de este test —la sesión se habría cerrado antes de dibujar— o de otro
del archivo que cierra la sesión a propósito. Las dos pistas para retomar:

1. El tiempo de espera: `tests/setup/` no configura `asyncUtilTimeout`, así
   que todo `findBy…` espera 1 s, poco para 107 archivos en paralelo.
2. La sesión: ver si un test del mismo archivo deja la sesión cerrada, o si
   la renovación del arranque falla bajo carga.

Corriendo sólo los tres archivos del alta, cuatro veces seguidas con la suite
completa al lado, no falló.

## Auditoría de caché (13/11/2026)

Se leyeron los 29 hooks de mutación buscando qué queda viejo después de
cada escritura. La caché dura 60 s (`src/shared/api/queryClient.ts:23`), así
que cada hueco es **un dato viejo hasta un minuto**, no un dato perdido.

| # | Qué quedaba viejo | Después de | Gravedad | Arreglo |
|---|---|---|---|---|
| C-1 | La carga de cada abogado en "Abogados", y las causas activas de "Clientes", "Calificaciones legales" y "Estados y plazos" | Registrar, modificar o dar de baja una causa; registrar o modificar un acto; marcar prescripta | MEDIO | `cases/api/invalidateCaseCounters.ts` (nuevo), llamado desde las 5 mutaciones de causa y desde `refreshCaseAfterAct`. Sólo marca: no agrega pedidos en la pantalla que guarda |
| C-2 | Un abogado recién creado no aparecía en "Abogados" ni en "Abogado responsable" del alta de causa | Registrar un usuario con ficha nueva, o cambiarle la ficha | MEDIO | `useCreateUser` y `useUpdateUser` invalidan los listados de abogados |
| C-3 | El nombre y el plazo de un estado o de una calificación en las causas, su línea de vida y los selectores | Modificar un estado procesal o una calificación legal | MEDIO | `useUpdateProceduralState` y `useUpdateLegalQualification` marcan vieja toda la caché, igual que `useUpdateLawyer` (los módulos de causas dependen de `legal-params`, no al revés) |

Para esto `clients`, `lawyers` y `legal-params` ahora publican sus claves de
caché en su `index.ts`. La dirección de las dependencias no cambió.

**Comprobado:** `tests/unit/cases/invalidateCaseCounters.test.ts` (3 tests)
para C-1. **C-2 y C-3 no tienen test propio**: quedan para revisión manual
(registrar un usuario con ficha nueva y abrir enseguida "Registrar causa").

**Revisado y sin problemas:**

- Altas, modificaciones y bajas dejan bien su propio detalle y sus listados.
- La baja optimista (`shared/api/optimisticRemoval.ts`) restaura la fila si
  el servidor la rechaza, y las páginas retroceden si se borra la última fila
  de una página (`UsersPage.tsx:279`, `ProceduralStatesPage.tsx:247`,
  `LegalQualificationsPage.tsx:209`).
- La línea de vida, los documentos y la carátula cuelgan del detalle de la
  causa (`cases.keys.ts`): modificarla los refresca y darla de baja los saca.
- Cerrar sesión cierra del lado del front aunque el pedido falle
  (`LogoutConfirmModal.tsx`, `onSettled`).

**Anotado, sin tocar:** cambiar sólo la matrícula de un abogado no refresca
"Usuarios" (BAJO, se corrige solo al minuto).

## Doble envío (13/11/2026)

Todos los botones de confirmar se deshabilitan mientras la mutación está en
vuelo (`okDisabled` en los 13 usos de `FormModal`; `disabled={saving}` en
`CaseForm.tsx:151`, `ProceduralActForm.tsx:78` y `CaseEditForm.tsx:115`). Se
probó con un doble clic real sobre "Registrar cliente", contando los pedidos:
**salió un solo `POST`**. La prueba fue en jsdom, no en un navegador; el test
no se dejó en el repo.

**No se auditó todavía:** respuestas que llegan después de salir de la
pantalla, el sondeo de la carpeta al cambiar de causa, y los tres perfiles
contra la tabla de permisos.

## Archivos modificados

| Archivo | Tarea |
|---|---|
| `src/shared/components/forms/SearchSelect.tsx` (nuevo), `forms/index.ts` | T-11 |
| `src/styles/controls.css` (bloque combobox) | T-11 |
| `src/features/cases/api/{useClientOptions,useQualificationOptions}.ts` (nuevos), `utils/optionsNote.ts` (nuevo) | T-11 |
| `src/features/clients/api/{clients.api,useClient}.ts`, `clients/index.ts` | T-11 |
| `src/features/legal-params/api/{legalQualifications.api,useLegalQualificationsByIds}.ts`, `legal-params/index.ts` | T-11 |
| `src/features/cases/pages/RegisterCasePage.tsx` | T-11, T-12 |
| `src/features/cases/components/{CaseForm,LegalQualificationPicker}.tsx` | T-11 |
| `src/features/cases/api/useCaseEdit.ts`, `components/CaseEditForm.tsx` | T-11, T-12 |
| `src/features/cases/components/NewQualificationModal.tsx` (nuevo) | T-12 |
| `src/features/cases/utils/prescription.ts`, `tests/unit/cases/prescription.test.ts` | T-24 |
| `src/shared/api/http.ts`, `documents/api/documentTemplates.api.ts`, `cases/api/cases.api.ts` | T-23 |
| `src/main.tsx`, `src/App.tsx` | T-40 |
| `src/shared/components/ui/Modal.tsx`, `forms/FormModal.tsx`, `documents/components/DocumentTemplateFormModal.tsx`, `src/styles/feedback.css` (la `×`), `tests/components/shared/FormModal.test.tsx` | T-13 |
| `src/shared/mocks/db.ts` | T-28 |
| `src/app/providers/AuthProvider.tsx`, `src/features/auth/utils/sessionStorage.ts` | T-10 |
| `src/features/cases/api/invalidateCaseCounters.ts` (nuevo), `useCreateCase`, `useDeleteCase`, `useUpdateCase`, `useDeclarePrescription`, `useDeclareQualificationPrescription`, `refreshCaseAfterAct` | Caché C-1 |
| `src/features/users/api/{useCreateUser,useUpdateUser}.ts` | Caché C-2 |
| `src/features/legal-params/api/{useUpdateProceduralState,useUpdateLegalQualification}.ts` | Caché C-3 |
| `index.ts` de `clients`, `lawyers` y `legal-params` (publican sus claves) | Caché |
| Tests: `unit/cases/invalidateCaseCounters.test.ts` (nuevo), `shared/{SearchSelect,Modal}.test.tsx`, `cases/RegisterCasePage{,.folder,.draft}.test.tsx`, `cases/CaseDetailPage.edit.test.tsx`, `auth/crossTab.test.tsx`, `app/RouteErrorPage.test.tsx`, `e2e/cases.spec.ts`, `setup/searchSelect.ts` (nuevo) | Varias |

## Documentación que quedó atrás

No se tocó; hay que actualizarla cuando se cierre la tanda:

- `frontend/CLAUDE.md`: la tabla de lo que publica cada módulo (`useClient`,
  `useLegalQualificationsByIds`), "Si necesitás X, usá Y" (`SearchSelect`) y
  la descripción de "Registrar causa" (ya no cruza las calificaciones con el
  listado).
- `docs/Frontend-Architecture/SHARED.md`: `SearchSelect` y la pila de modales.
- `docs/Frontend-Architecture/MATRIZ_CA.md`: se regenera con `npm run ca-matrix`.

## Pendiente de la auditoría técnica

Sigue sin hacerse, y es donde pueden aparecer más bugs:

- Carreras que faltan: respuesta que llega después de salir de la pantalla y
  sondeo de la carpeta al cambiar de causa.
- Los tres perfiles contra la tabla de permisos del contrato.
- Lectura completa de `CaseDetailPage`, `GenerateCaseFilePage` y
  `RegisterProceduralActPage`.
- Todo lo que necesita el backend real: sesión entre pestañas, timeouts de
  archivos, variables del build de despliegue.
