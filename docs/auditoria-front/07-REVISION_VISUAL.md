# Revisión visual, UX, responsive y accesibilidad (Plan B)

12/11/2026 · rama `feat/auditoria-front` · **sin cambios de código.** Es la
entrega del paso "Primero: terminar la revisión" de
[06-PLAN_B_VISUAL.md](06-PLAN_B_VISUAL.md). Rutas relativas a `frontend/`.
Los `H-01` a `H-33` son los del [diagnóstico](01-DIAGNOSTICO_INICIAL.md) y de
la [ola 1](04-OLA1_RESULTADOS.md); los nuevos arrancan en `H-34`.

Cada hallazgo dice cómo se comprobó: **leído**, **medido** (script o cálculo
en el navegador), **visto** (captura) o **sin verificar**.

## 0. Resumen

La interfaz está **bien resuelta y es consistente**: un solo sistema de
tokens, tablas que pasan a fichas, modales que entran en el teléfono, campos
de 16 px que no hacen zoom en el iPhone, `prefers-reduced-motion` respetado.
No hay desborde de página en ninguna de las 13 rutas en ninguno de los seis
anchos. No se encontró nada crítico.

Lo que hay son **defectos de accesibilidad con teclado y lector de pantalla**
y **detalles de terminación**:

| Gravedad | Cantidad | Lo principal |
|---|---|---|
| ALTO | 2 | El foco no se ve sobre el rail y las zonas oscuras (H-34); los errores de un campo no llegan al lector de pantalla (H-35) |
| MEDIO | 9 | Enter no envía los formularios de modal, contraseñas sin `autocomplete`, textos cortados en el tablero y en el rail, la carátula apretada a 1366 px, acciones de fila con poco contraste, pestañas a medio armar |
| BAJO | 8 | Controles chicos, colores fuera de tokens, enlace de salto, rótulos |

Más los ya conocidos que esta revisión **confirma**: H-04 (avisos), H-07
(rail y menú del teléfono), H-08 (campana), H-25, H-26, H-32, H-33.

## 1. Qué se revisó y qué no

| Qué | Cómo | Alcance real |
|---|---|---|
| 13 rutas × 6 anchos (320, 390, 768, 1024, 1366, 1440) | Script: desborde, texto cortado con puntos, controles de menos de 32 px, elementos fuera de pantalla, contenedores con scroll horizontal | Completo, perfil `fvazquez` |
| Capturas | A ojo | 390 px: Inicio, detalle de causa, Usuarios, modal "Registrar usuario" (vacío y con errores), menú abierto. 1366 px: Inicio, Usuarios, Causas |
| Contraste | Cálculo WCAG de 24 pares de `src/styles/tokens.css` | Completo para tokens; no para los 26 colores escritos a mano |
| Código | `src/styles/{tokens,base,shell,controls,table,feedback,login,skeleton}.css` y los componentes de `src/shared/components/{ui,forms}` | Leídos completos. `cases.css`, `dashboard.css`, `documents.css`, `tools.css`: sólo búsquedas |
| Teclado | Tab sobre el rail; foco al abrir modal y menú | Parcial |

**No se hizo** (queda pendiente, no se da por bueno):

- Perfiles `gestion`, `mrios` y `supervision`.
- Lector de pantalla real (NVDA): lo de la sección 3 sale del código y del DOM.
- Estados de error forzados (`forceFailure`) y de carga con latencia alta,
  pantalla por pantalla.
- Los demás modales (cliente, abogado, estados, calificaciones, modelos,
  bajas, prescripción, acto interruptivo, carátula) en el teléfono.
- Capturas a 768 y 1024 px (sólo medidos).
- Recorrido completo de teclado de alta de causa, acto y expediente.

## 2. Hallazgos nuevos

### ALTO

**H-34 · El foco del teclado casi no se ve sobre fondo oscuro.** *(medido y
visto)*
El contorno de foco es uno solo para toda la app: 2 px de `--vz-primary`
(`src/styles/base.css:25`). Sobre el rail (`--vz-rail`) da **2,85:1**, y sobre
el ítem activo (`--vz-rail-on-bg`) **2,37:1**; WCAG 1.4.11 pide 3:1. En la
captura a 1366 px el ítem enfocado se distingue apenas. Afecta a los ítems
del rail, "Cambiar contraseña", "Cerrar sesión", cerrar menú, y a lo que se
enfoca dentro de la banda oscura del tablero y del acceso rápido de
Herramientas (este último ya lo resuelve: `src/styles/tools.css:74`). El logo
también (`src/styles/shell.css:31`).
*Propuesta:* una variable `--vz-focus` que valga `--vz-primary` y que las
superficies oscuras (`.vz-rail`, `.vz-dash-band`) redefinan a
`--vz-rail-fg-on`. Un cambio en `base.css` y dos líneas en `shell.css` y
`dashboard.css`.

**H-35 · El error de un campo no está asociado al campo.** *(leído y medido)*
`Field` dibuja el error debajo (`src/shared/components/forms/Field.tsx:30-32`
y `FieldError.tsx`), pero el control no recibe `aria-invalid` ni
`aria-describedby`: en "Registrar usuario" con los seis errores a la vista,
el DOM tiene **0** controles con `aria-invalid`. El foco va bien al primer
campo con error, pero un lector de pantalla anuncia "Apellido, cuadro de
edición" sin decir que hay un error ni cuál. Sólo
`LegalQualificationPicker.tsx:132` y `SearchSelect` lo hacen. Lo obligatorio
es un `*` suelto (`Field.tsx:32`): se lee "asterisco" y el control no lleva
`aria-required`.
*Propuesta:* `FormModal` ya conoce `id`, `error` y `required` de cada campo:
pasa `aria-invalid`, `aria-describedby` y `aria-required` al control y el
`id` a `FieldError`; el `*` queda `aria-hidden`. En los formularios de página
(`CaseForm`, `ProceduralActForm`) es del plan A: se pide.
*Archivos:* `forms/FormModal.tsx` (**compartido**), `forms/Field.tsx`.

### MEDIO

**H-36 · Enter no envía los formularios de modal.** *(medido)*
`FormModal` no dibuja un `<form>` (`FormModal.tsx:80`; en el DOM del modal no
hay ninguno): el botón de confirmar es un `onClick` (`:91`). En un alta de
cliente, escribir el último dato y apretar Enter no hace nada. Login, alta de
causa y acto sí son `<form>`. Es la inconsistencia de interacción más visible
de la app.
*Propuesta:* envolver el cuerpo en `<form>` y que confirmar sea `submit`.
**Compartido y de riesgo alto** (todos los ABM): lo decide y lo toca A, o se
libera a B.

**H-37 · Contraseñas y correo sin `autocomplete` ni tipo.** *(medido)*
En "Registrar usuario" ningún control tiene `autocomplete`
(`FormModal.tsx:157`; `features/users/components/UserFormModal.tsx:72`, `:86`,
`:95`). El navegador puede ofrecer —o completar solo— la contraseña del
administrador en "Contraseña inicial" de otra persona. El correo es
`type="text"`: en el teléfono no sale el teclado con `@`.
*Propuesta:* `autoComplete` opcional en `FieldSpec` (`new-password`, `off`,
`email`) y un tipo `'email'`. Mismo archivo compartido que H-35.

**H-38 · Rótulos cortados en la banda del tablero.** *(medido y visto)*
A 1024 y 1366 px "PRÓX. 5 DÍAS HÁBIL…" y "MIS CAUSAS ACTIV…" se cortan con
puntos (`src/styles/dashboard.css:40-50`: `nowrap` + `ellipsis`). En el
teléfono ya envuelven (`:582`). Son los cuatro números más importantes de la
pantalla de entrada, a los dos anchos de notebook.
*Propuesta:* dejar que el rótulo use dos renglones también en escritorio.

**H-39 · El nombre del usuario se corta en el rail en todos los anchos.**
*(medido y visto)*
"Fernando G. Vázquez" queda en "Fernando G. …" a 1366 y a 1440 px
(`src/styles/shell.css:149`): avatar, dos botones y el relleno le dejan unos
90 px. El `title` está en el avatar, no en el nombre.
*Propuesta:* permitir dos renglones al nombre y sumarle `title`.

**H-32 (se amplía) · La tabla de Causas a 1366 px.** *(medido y visto)*
La causa del scroll: `minWidth={1100}`
(`src/features/cases/components/CasesTable.tsx:117`) contra 1.045 px
disponibles. Y hay un segundo defecto: la **carátula queda en 156 px** (pide
32 %, `:49`) y parte en cuatro renglones, mientras "Estado procesal" ocupa
273 px con una sola palabra. La columna que más se lee es la más angosta.
*Propuesta:* bajar el mínimo y darle a la carátula un ancho mínimo real; que
el estado pueda partir. `CasesTable.tsx` es del plan B (tablas).

**H-40 · Acciones de fila con contraste bajo.** *(leído y visto)*
"Modificar" y "Eliminar" van en `--vz-muted` al 72 % de opacidad
(`src/styles/table.css:69`): unos 3,4:1 sobre blanco, por debajo del 4,5:1 de
texto. Suben al entrar con el mouse a la fila o al enfocarlos; quien mira sin
apuntar los ve lavados. Además los dos se anuncian igual en las 20 filas
("Modificar, botón"): no dicen de quién.
*Propuesta:* opacidad a 1 con el color apagado (6,06:1), y `aria-label` con
el nombre de la fila en las tablas (`UsersTable.tsx:73` y las otras cuatro).
El texto visible no cambia, pero **los tests buscan por nombre accesible**:
se actualizan en la misma tanda.

**H-41 · Pestañas con el patrón ARIA a medias.** *(leído)*
`Tabs` declara `role="tablist"` y `role="tab"`
(`src/shared/components/ui/Tabs.tsx:10`, `:15`) pero no hay `tabpanel`, ni
`aria-controls`, ni flechas, ni un solo punto de tabulación. Un lector de
pantalla promete un comportamiento que no existe.
*Propuesta:* flechas izquierda/derecha y `tabIndex` como ya hace
`SegmentedControl`; `aria-controls` opcional.

**H-42 · Botón primario deshabilitado ilegible.** *(medido)*
Texto blanco sobre `--vz-border-strong` (`src/styles/controls.css:23`):
**1,66:1**. WCAG exime lo deshabilitado, pero "Registrar causa" pasa buena
parte del alta en ese estado y el rótulo no se lee.
*Propuesta:* texto `--vz-muted` sobre `--vz-sunken` con borde, como el resto
de lo deshabilitado.

**H-43 · Borde de los campos por debajo de 3:1.** *(medido)*
`--vz-border` sobre blanco da **1,31:1** (`controls.css:84`). WCAG 1.4.11
pide 3:1 para el límite de un control. Es parte de la identidad (bordes
finos): **decisión del equipo**, no se toca sin acordar. Alternativa barata:
usar `--vz-border-strong` sólo en campos (1,66:1, mejora sin llegar).

**H-44 · Modal sin botón de cerrar.** *(visto)*
El modal no tiene una `×` en la cabecera
(`src/shared/components/ui/Modal.tsx`): en el teléfono "Registrar usuario"
mide 982 px de contenido en 701 visibles y "Cancelar" queda siempre a la
vista, así que no bloquea; pero es la convención que se busca primero. Va con
la decisión de H-05. `Modal.tsx` es del plan A.

### BAJO

| Id | Qué | Evidencia | Propuesta |
|---|---|---|---|
| H-45 | No hay enlace "Saltar al contenido" | Ninguno en `src/`; `AppShell.tsx:158`. Con teclado hay que pasar los 12 controles del rail en cada pantalla | Enlace oculto hasta enfocarlo, primero en `AppShell` |
| H-46 | El paginado no es una región con nombre ni anuncia el cambio de página | `ui/Pagination.tsx:38` | `<nav aria-label="Paginación">` y el resumen con `role="status"` |
| H-47 | Migas rotuladas "Migas" y con botones en vez de enlaces | `ui/Breadcrumbs.tsx:31` | `aria-label="Ruta de navegación"`; enlaces, con T-21 |
| H-48 (**retirado**, ver [08](08-TANDA1_RESULTADOS.md)) | El ojo de la contraseña no dice su estado | `forms/PasswordInput.tsx` (sin `aria-pressed`) | `aria-pressed` y rótulo fijo "Mostrar contraseña" |
| H-49 | 26 colores escritos a mano fuera de `tokens.css` | `dashboard.css` (18: `:61`, `:62`, `:115-117`, `:191`, `:355`, `:449-451`, `:503-505`…), `cases.css` (3), `controls.css` (3), `documents.css` (1), `table.css` (1), más `#fff` en `ToastProvider.css` | Pasarlos a tokens (`--vz-on-dark-danger`, etc.) sin cambiar el valor |
| H-50 | Los puntos del calendario en el teléfono miden 18×20 px | `dashboard.css:608` | Que toda la celda del día sea el área de toque |
| H-51 | Botón "Volver" de 26×26 y enlaces de las migas de 15 px de alto en el teléfono | `shell.css:288`; se suma a H-25 | 36 px en el teléfono, con T-31 |
| H-52 | Botones `sm` de 28 px en el teléfono fuera de las tablas: "Hoy", "Usar esta carátula", "Marcar prescripta", "Vista previa", "Crear carpeta" | `controls.css:66`; medido a 320 y 390 px | 36 px debajo de 720 px, con T-31 |

## 3. Confirmados de la lista anterior

| Id | Estado | Nota |
|---|---|---|
| H-04 avisos | Confirmado (leído) | Además: `#fff` a mano y `×` como texto |
| H-07 rail y menú | Confirmado (medido) | Con el menú abierto el foco queda en `body` y `.vz-main` no es `inert` |
| H-08 campana | Confirmado (visto) | Sigue en la barra de todas las pantallas |
| H-25 controles chicos | Confirmado y detallado en H-51 y H-52 | |
| H-26 login sin marca | Sin volver a mirar | |
| H-32 tabla de Causas | Confirmado y ampliado arriba | |
| H-33 filtros de Inicio | **Era más grave**: los chips quedaban cortados. Corregido en la tanda 1 ([08](08-TANDA1_RESULTADOS.md)) | Pasa a MEDIO |

## 4. Lo que está bien y no se toca

- Sin desborde de página en 78 combinaciones de ruta y ancho.
- Modal en el teléfono: entra, scrollea adentro, el pie queda fijo, el foco
  entra al abrir y vuelve al cerrar, y va al primer campo con error.
- Contraste de texto: todos los pares de tokens de texto pasan 4,5:1
  (`--vz-faint` sobre `--vz-sunken`, el más justo, 4,51:1).
- `SegmentedControl`, `Meter`, `IconButton`, los buscadores (todos con
  `aria-label`) y `DataTable` (roles a mano para la vista de fichas).
- Idioma del documento (`index.html:2`, `lang="es"`).

## 5. Plan propuesto

**Nada de esto se programa hasta acordarlo.** Ordenado por lo que más mejora
con menos riesgo. "Propio" = archivos del plan B; "Compartido" = hay que
pedirlo a Luciano.

### Tanda 1 — Accesibilidad sin riesgo (propio, sólo CSS y `ui/`)

| # | Tarea | Hallazgo | Archivos | Tests que cambian |
|---|---|---|---|---|
| 1 | Foco visible sobre fondo oscuro | H-34 | `base.css`, `shell.css`, `dashboard.css` | Ninguno |
| 2 | Rótulos del tablero y nombre del rail sin cortar | H-38, H-39 | `dashboard.css`, `shell.css`, `ui/RailUser.tsx` | Ninguno |
| 3 | Botón primario deshabilitado legible; acciones de fila con contraste | H-42, H-40 (CSS) | `controls.css`, `table.css` | Ninguno |
| 4 | Controles de toque en el teléfono | H-25, H-50, H-51, H-52 (T-31) | `controls.css`, `shell.css`, `dashboard.css`, `cases.css` | Ninguno |
| 5 | Filtros de Inicio (T-36) | H-33 | `dashboard.css` | Ninguno |
| 6 | Pestañas, paginado, migas, ojo de contraseña | H-41, H-46, H-47, H-48 | `ui/Tabs.tsx`, `ui/Pagination.tsx`, `ui/Breadcrumbs.tsx`, `forms/PasswordInput.tsx` | Los que busquen "Ocultar contraseña" o `navigation` "Migas" |

### Tanda 2 — Tabla de Causas y avisos (propio)

| # | Tarea | Hallazgo | Archivos | Tests que cambian |
|---|---|---|---|---|
| 7 | T-35: tabla de Causas a 1366 px | H-32 | `cases/components/CasesTable.tsx`, `table.css` | Ninguno previsto |
| 8 | T-20: avisos (duración por tipo, pausa, un solo anuncio, clases `vz-toast*`) | H-04 | `ToastProvider.tsx`, `ToastProvider.css` → `feedback.css` | Los que esperan que el aviso desaparezca a los 2 s |
| 9 | Nombre accesible de las acciones de fila | H-40 (ARIA) | Las 5 `*Table.tsx` | Los que buscan `{ name: 'Modificar' }` en tablas: **muchos**; se propone `aria-label` sólo si A está de acuerdo |

### Tanda 3 — Marco (compartido: `AppShell.tsx`, `AppLayout.tsx`)

| # | Tarea | Hallazgo | Depende de |
|---|---|---|---|
| 10 | T-21: rail como enlaces, menú del teléfono con fondo inerte y foco adentro; enlace de salto | H-07, H-45 | Aviso a Luciano; tests de `AppLayout` |
| 11 | T-22: campana sólo si hace algo | H-08 | **Decisión 2** |

### Tanda 4 — Formularios de modal (compartido: `FormModal.tsx`)

| # | Tarea | Hallazgo | Depende de |
|---|---|---|---|
| 12 | Errores y obligatorios asociados al control | H-35 | Que Luciano libere `FormModal.tsx` |
| 13 | `autocomplete` y tipo `email` | H-37 | Ídem; `UserFormModal.tsx` es propio |
| 14 | Enter envía | H-36 | Decisión de A: toca todos los ABM |

### Tanda 5 — Lo que queda del 06

T-32 (marca en el login del teléfono), T-34 (fuentes), T-30 (comentario de
cortes y H-49, colores a tokens), T-33 (título de pestaña, al final).

### Decisiones que hacen falta

1. **Campana** (H-08): ¿se saca de producción? Recomendación: sí, dibujarla
   sólo con `DAILY_RUN_ENABLED`.
2. **Cierre de modal con datos** (H-05) y **`×` en la cabecera** (H-44).
   Recomendación: no cerrar con clic afuera si hay algo escrito; Escape y
   "Cancelar" siguen cerrando; sumar la `×`.
3. **Borde de los campos** (H-43): ¿se oscurece? Recomendación: pasar los
   campos a `--vz-border-strong` y no más.
4. **Acciones de fila con `aria-label`** (tarea 9): rompe tests de A.
   Recomendación: hacerlo, actualizando los tests en la misma tanda.
5. **`FormModal.tsx`** (tanda 4): ¿lo toca B o lo toma A?

### Antes de cerrar cada tanda

`npm run lint`, `npx tsc -b`, `npx vitest run`, y lo modificado mirado en el
navegador en 390 y 1366 px. Se registra en un `08-…` por tanda: archivos,
qué cambió y qué se verificó.

## 6. Para Luciano (origen en lógica o en archivos del plan A)

- **H-35 y H-36 en formularios de página**: `CaseForm` y `ProceduralActForm`
  tienen el mismo `Field` sin `aria-invalid`. No se revisó si lo pasan a
  mano.
- **H-36**: `FormModal` sin `<form>`.
- **H-44**: `Modal.tsx` sin botón de cerrar.
- Nada de lo encontrado en esta revisión resultó ser un bug de lógica.
