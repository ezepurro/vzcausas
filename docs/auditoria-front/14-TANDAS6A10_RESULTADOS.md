# Plan B · Tandas 6 a 10 — después de la respuesta del plan A

13/11/2026 · rama `feat/auditoria-front` · cambios en el árbol de trabajo,
**sin commitear**, encima de `45034cd`. Rutas relativas a `frontend/`. Los
`H-xx` son los de [07-REVISION_VISUAL.md](07-REVISION_VISUAL.md) y
[10-TANDA5_RESULTADOS.md](10-TANDA5_RESULTADOS.md); el reparto de archivos es
el de [13-RESPUESTA_A_FACUNDO.md](13-RESPUESTA_A_FACUNDO.md).

## Tanda 6 · CSS

| Qué | Solución | Archivos |
|---|---|---|
| El aviso en el teléfono era angosto (lo vio Luciano: seis renglones a 320 px) | La pila se centraba con `left: 50%`, que le deja como mucho media pantalla. Ahora va de borde a borde con los avisos centrados adentro; la pila no recibe el mouse, cada aviso sí. A 320 px el mismo aviso mide 300 px y ocupa tres renglones | `src/styles/feedback.css` |
| El selector con filtro no tenía flecha (lo vio Luciano) | Comparte la flecha del `<select>`. Con algo elegido, la `×` de quitar va a la izquierda de la flecha. **Toca el bloque "combobox", que es del plan A**: lo pidió él | `src/styles/controls.css` |
| La flecha de un `<select>` desaparecía cuando el campo tenía error | El fondo del error pasó de `background` a `background-color` | `src/styles/controls.css` |
| H-43 · Borde de los campos (decisión 5) | `--vz-border-strong` en campos, desplegables, áreas y buscadores; al apuntar, `--vz-faint`. Paneles y tarjetas siguen con el borde fino | `src/styles/controls.css`, `shell.css` |
| H-54 · Fecha del hecho de 34 px en el teléfono | 40 px debajo de 720 px. Salió sólo con CSS | `src/styles/cases.css` |

**El aviso "de 5 segundos" no es un defecto.** Cronometrado en el navegador:
un aviso de información duró **4.020 ms**. Lo que vio Luciano se explica por
la pausa con el puntero encima o por la medición a ojo.

## Tanda 7 · Decisiones acordadas

| Decisión | Solución | Archivos |
|---|---|---|
| 1 · `role="status"` en éxito e información | Un error sigue siendo `alert`; éxito e información, `status` | `src/app/providers/ToastProvider.tsx` |
| 2 · De quién es cada acción de fila (H-40) | **Distinto de lo acordado, a propósito:** en vez de `aria-label="Modificar Ríos, Malena"`, cada botón apunta con `aria-describedby` al nombre de su fila. El nombre del botón **sigue siendo "Modificar"** (cumple la condición de Luciano: quien dicta "Modificar" lo encuentra) y un lector de pantalla dice "Modificar, botón, Ríos, Malena". **No rompe ninguno de los 31 tests** que buscan el nombre exacto, así que no se cruza con la auditoría de bajas del plan A | `UsersTable.tsx`, `LawyersTable.tsx`, `ProceduralStatesTable.tsx`, `LegalQualificationsTable.tsx`, `CasesTable.tsx` |
| 3 · Campana (H-08) | Sólo se dibuja con `DAILY_RUN_ENABLED` | `src/app/layouts/AppLayout.tsx` |

Costo de la opción elegida en la decisión 2: en un listado de botones (el
rotor de un lector de pantalla) los nombres siguen repetidos; la descripción
se oye al llegar a cada uno. Si se prefiere el `aria-label`, es cambiar el
atributo en las cinco tablas más esos tests.

Tests actualizados por la decisión 1 (buscaban un aviso de éxito como
`alert`): `tests/components/legal-params/LegalQualificationsPage.test.tsx:67`,
`tests/components/proceedings/RegisterProceduralActPage.edit.test.tsx:92`,
`tests/components/proceedings/RegisterProceduralActPage.test.tsx:60`, `:85` y
`:99`, `tests/e2e/cases.spec.ts:96`, y tres casos de
`tests/components/app/ToastProvider.test.tsx` (más uno nuevo que fija los dos
roles).

## Tanda 8 · Formularios de modal (H-35, H-37)

| Qué | Solución | Archivos |
|---|---|---|
| El error no estaba unido al campo | `FormModal` pasa al control `aria-invalid`, `aria-describedby` (el error, o la ayuda del campo si no hay error) y `aria-required`. `Field` acepta `errorId` y `noteId` y se los pone al mensaje y a la nota | `src/shared/components/forms/FormModal.tsx`, `Field.tsx` |
| Lo obligatorio era un `*` que se leía "asterisco" | El `*` es `aria-hidden`; lo anuncia `aria-required` | `Field.tsx` |
| Contraseñas y correo sin `autocomplete` ni tipo | `FieldSpec` suma `autoComplete` y el tipo `'email'`. "Registrar usuario": usuario y correo `off`, contraseñas `new-password`. "Cambiar contraseña": `current-password` y `new-password`. El correo del cliente es `type="email"` | `FormModal.tsx`, `src/features/users/components/UserFormModal.tsx`, `src/features/auth/components/ChangePasswordModal.tsx`, `src/features/clients/components/ClientFormModal.tsx` |

6 tests nuevos en `tests/components/shared/FormModal.test.tsx`. Ningún test
existente cambió.

## Tanda 9 · Marco (H-07, H-45)

| Qué | Solución | Archivos |
|---|---|---|
| Los ítems del rail eran botones | Son `<a href>`: se abren en otra pestaña, se copian y se anuncian como enlaces. Un clic común sigue avisando con `onNavigate` (sin recargar); con Ctrl, Cmd, Shift o el botón del medio se deja al navegador. `AppShell` sigue sin conocer el router | `src/shared/components/ui/AppShell.tsx`, `src/styles/shell.css` |
| El menú del teléfono no atrapaba el foco | Al abrir, el foco va a "Cerrar menú" y la página queda `inert`; al cerrar, vuelve al botón que lo abrió | `AppShell.tsx` |
| No había "Saltar al contenido" | Primer enlace de la página, visible sólo con el foco; lleva el foco a `<main>` | `AppShell.tsx`, `shell.css` |

Tests: 5 nuevos en `tests/components/shared/AppShell.test.tsx`. Cambiaron de
`button` a `link` tres búsquedas: `AppShell.test.tsx:93`,
`tests/components/app/AppLayout.test.tsx:33` y `tests/e2e/fixtures/auth.ts:53`
(`goTo`, que usan todos los E2E).

"Nueva causa" sigue siendo un botón.

## Tanda 10 · Pestañas y título (H-41, H-20)

| Qué | Solución | Archivos |
|---|---|---|
| Las pestañas no decían qué panel controlan | `role="tabpanel"` con nombre, y `aria-controls` desde cada pestaña | `src/features/dashboard/pages/HomePage.tsx`, `src/features/legal-params/pages/ProceduralStatesPage.tsx` |
| Todas las pestañas del navegador se llamaban "VZ Causas" | Hook `usePageTitle('Clientes')` → "Clientes · VZ Causas"; al salir vuelve a "VZ Causas" | `src/shared/hooks/usePageTitle.ts` (nuevo) y una línea en 9 páginas: Inicio, Clientes, Modelos formales, Herramientas, Usuarios, Abogados, Estados y plazos, Calificaciones legales e Iniciar sesión |

4 tests nuevos en `tests/components/shared/usePageTitle.test.tsx`.

**Falta la línea en las 5 páginas del plan A** (`cases/pages/*` y
`proceedings/pages/*`): hoy en una causa la pestaña dice "VZ Causas".

## Verificación

| Qué | Resultado |
|---|---|
| `npm run lint` | 0 errores; el warning conocido de `Icon.tsx:2` |
| `npx tsc -b` | Limpio |
| `npx vitest run` | **704 de 704** (108 archivos). Antes de estas tandas: 688 |
| `npm run build` | Sin errores |
| `npm run test:e2e` | **9 de 9** |

En el navegador, con mocks y `fvazquez`, a 320 px:

| Qué | Resultado |
|---|---|
| Login angosto | **Visto**: franja oscura con la marca y el formulario debajo |
| Aviso | Medido: 300 px de ancho, tres renglones, `role="status"`, 4.020 ms |
| Menú | Medido: el foco entra a "Cerrar menú", la página queda `inert`; con Escape el foco vuelve a "Abrir menú" |
| Rail | Medido: `<a href="/causas">` con `aria-current` |
| "Saltar al contenido" | Medido: fuera de la vista; aparece con el foco; lleva el foco a `<main>` |
| Campana | No se dibuja (sin `VITE_INTERNAL_TRIGGER_SECRET`) |
| Selector con filtro en el alta | **Visto**: con flecha, borde más marcado, 262 px |
| "Registrar usuario" con errores | **Visto** y medido: 7 controles con `aria-invalid`, "Apellido" descrito por su error, `autocomplete` en usuario, correo y contraseñas |
| Estados y plazos | Medido: panel "Fuero Penal", pestaña con `aria-controls`, "Modificar" descrito por el nombre de su fila |
| Título | "Iniciar sesión · VZ Causas", "Inicio · VZ Causas", "Usuarios · VZ Causas" |

**Sin verificar:**

- Lector de pantalla real: todo lo de ARIA se comprobó en el DOM.
- Abrir un ítem del rail en otra pestaña con Ctrl+clic en el navegador (sólo
  el test).
- El borde nuevo de los campos y la flecha del selector a 1366 px, y un
  campo con error a la vista junto a un `<select>`.
- Que el navegador efectivamente deje de ofrecer la contraseña guardada en
  "Registrar usuario": depende del gestor de contraseñas de cada navegador.
- Los perfiles `gestion`, `mrios` y `supervision` después de estas tandas.
- El tablero "Estudio" a ojo (pendiente desde la tanda 5).

## Estado del plan B

Hecho todo lo que el reparto le dejó. Queda, y **no es del plan B**:

| Qué | De quién |
|---|---|
| H-36 · Enter envía los formularios de modal | Plan A |
| H-05, H-44 · cierre del modal y `×` (el estilo de la `×` vuelve al plan B) | Plan A |
| H-35 en `CaseForm` y `ProceduralActForm` | Plan A, con `errorId` y `noteId` de `Field` |
| H-20 · la línea de `usePageTitle` en sus 5 páginas | Plan A |
| H-53 · motivo de un botón deshabilitado | Para después, pantalla por pantalla |
| H-50 · puntos del calendario en el teléfono | Sin decidir |

## Para Luciano

- **`FormModal.tsx` y `Field.tsx` quedan libres**: terminé H-35 y H-37.
  `Field` acepta `errorId` y `noteId`; para H-35 en `CaseForm` y
  `ProceduralActForm` alcanza con pasarlos y poner en el control
  `aria-invalid`, `aria-describedby` y `aria-required`, como hace
  `FormModal`. `FieldType` suma `'email'` y `FieldSpec`, `autoComplete`.
- **El hook del título está**: `usePageTitle` en
  `src/shared/hooks/usePageTitle.ts`. Falta tu línea en `CasesPage`,
  `RegisterCasePage`, `CaseDetailPage`, `GenerateCaseFilePage` y
  `RegisterProceduralActPage`. Acepta `undefined` mientras la carátula no
  llegó.
- **Acciones de fila**: fui por `aria-describedby` en vez de `aria-label`,
  así no toco los tests de las tablas mientras auditás las bajas. Si igual
  preferís el `aria-label`, decime.
- **Tests tuyos que toqué**: los seis de `alert` → `status` de arriba, y de
  `button` → `link` en `AppLayout.test.tsx:33` y en `goTo` de
  `tests/e2e/fixtures/auth.ts`. Un test nuevo que navegue por el rail tiene
  que buscar `link`.
- **Bloque "combobox" de `controls.css`**: le sumé la flecha, `padding-right`
  al campo y moví la `×` (`right: 30px`). Miralo en "Modificar causa".
- **`Modal.tsx`**: no lo toqué. Cuando esté la `×`, avisame y le doy estilo.
- La campana ya no se dibuja sin `VITE_INTERNAL_TRIGGER_SECRET`.
