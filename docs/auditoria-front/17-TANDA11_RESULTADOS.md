# Tanda 11 — lo que quedaba después del cierre del plan A

13/11/2026 · Facundo con Claude · rama `feat/auditoria-front` · cambios en el
árbol de trabajo, **sin commitear**, encima de `93b22ca`. Rutas relativas a
`frontend/`. Responde a [16-RESUMEN_PLAN_A.md](16-RESUMEN_PLAN_A.md).

**Para Luciano: esta tanda toca archivos del plan A.** El 16 los dejaba como
pendientes ("Detalles, para después") y cerraba la etapa, así que se tomaron
acá. Están listados en "Archivos del plan A que se tocaron", abajo.

## Qué cambió

| Hallazgo | Solución | Archivos |
|---|---|---|
| H-44 · La `×` del modal tenía el estilo mínimo del plan A | Radio y transición de los tokens, alineada con el título, estado al apretar; 40 px en el teléfono. La cabecera del teléfono le deja 56 px | `src/styles/feedback.css` |
| H-20 · La pestaña decía sólo "VZ Causas" en las 5 páginas de causas y actos | Una línea de `usePageTitle` en cada una: "Causas", "Registrar causa", la carátula en el detalle, "Generar expediente · {carátula}", y "Registrar acto procesal · {carátula}" o "Modificar acto procesal · {carátula}". Mientras la causa no llega, el detalle dice "VZ Causas" y las otras dos, el nombre de la pantalla | `src/features/cases/pages/{CasesPage,RegisterCasePage,CaseDetailPage,GenerateCaseFilePage}.tsx`, `src/features/proceedings/pages/RegisterProceduralActPage.tsx` |
| H-35 · El error, la nota y lo obligatorio no llegaban al control en los formularios de página | Cada control lleva `aria-invalid`, `aria-describedby` (el error, o la nota si no hay error) y `aria-required`, con los mismos ids que `FormModal` (`{id}-error`, `{id}-note`). Dos funciones nuevas lo arman: `fieldIds(id)` para `Field` y `controlA11y(id, error, { note, required })` para el control. Se hizo también en **"Modificar causa"** (`CaseEditForm`), que no estaba en el reparto y tenía el mismo defecto | `src/shared/components/forms/fieldA11y.ts` (nuevo), `index.ts`; `src/features/cases/components/{CaseForm,CaseEditForm}.tsx`; `src/features/proceedings/components/ProceduralActForm.tsx` |
| H-35 · Tres controles no aceptaban esos atributos | `Combobox` suma `aria-invalid`, `aria-describedby` y `aria-required`; `SearchSelect`, `aria-required`; `SegmentedControl`, los tres (van al `radiogroup`); `LegalQualificationPicker` los pasa a su selector de "Agregar calificación…" | `src/shared/components/forms/{Combobox,SearchSelect,SegmentedControl}.tsx`, `src/features/cases/components/LegalQualificationPicker.tsx` |
| H-53 · El motivo de un botón deshabilitado iba sólo en `title` | Nota visible unida al botón con `aria-describedby`, pantalla por pantalla (decisión 6 del [13](13-RESPUESTA_A_FACUNDO.md)). El `title` se conserva. **Abogados:** "Sólo el Administrador registra y modifica abogados." bajo el encabezado, para quien no es Administrador; cada "Modificar" sigue descrito por el nombre de su fila y suma la nota. **Detalle de causa**, para un abogado que no es el responsable: bajo "Modificar causa" y "Dar de baja", "Solo el abogado responsable (…) modifica o da de baja la causa."; bajo la fila "Sobre la causa", "Solo el abogado responsable (…) marca prescripta la causa o sus calificaciones.", que describe a "Marcar toda la causa prescripta" y a cada "Marcar prescripta" | `src/features/lawyers/pages/LawyersPage.tsx`, `components/LawyersTable.tsx`; `src/features/cases/pages/CaseDetailPage.tsx`, `components/CaseQualifications.tsx`; `src/styles/shell.css` (`.vz-page-note`), `cases.css` (`.vz-case-actions__note`) |
| La ruta `/internal/deadlines/daily-run` seguía escrita en el build (lo encontró el plan A) | La constante de la ruta se lee adentro de `import.meta.env.DEV`, igual que el secreto: en el build queda la cadena vacía | `src/features/deadlines/api/deadlines.api.ts` |

Ningún texto visible que ya existía cambió, y ningún test existente se
modificó.

### Una decisión para revisar

En el detalle de causa, un abogado que no es el responsable ahora ve **tres**
notas que empiezan igual ("Solo el abogado responsable (…)"): la de los actos,
que ya estaba, y las dos nuevas. Cada una está al lado de lo que explica. Se
podrían unir en una sola, pero la de los actos es texto del prototipo y la
busca `tests/components/cases/CaseDetailPage.test.tsx:216`.

## Archivos del plan A que se tocaron

`src/features/cases/pages/*` (los cuatro), `RegisterProceduralActPage.tsx`,
`CaseForm.tsx`, `CaseEditForm.tsx`, `LegalQualificationPicker.tsx`,
`CaseQualifications.tsx`, `ProceduralActForm.tsx`,
`src/features/deadlines/api/deadlines.api.ts` y, de `shared/forms`,
`Combobox.tsx` y `SearchSelect.tsx`. En todos el cambio es de atributos, una
línea de hook o una nota: no cambia qué se valida, qué se envía ni la caché.

## Tests

20 nuevos, en 4 archivos:

| Archivo | Qué fija |
|---|---|
| `tests/unit/shared/fieldA11y.test.ts` (5) | Los ids, y qué lleva el control con error, con nota y obligatorio |
| `tests/components/cases/pageTitle.test.tsx` (6) | El título de las 5 páginas, y el de "Modificar acto procesal" |
| `tests/components/cases/fieldErrors.a11y.test.tsx` (4) | "Registrar causa", "Modificar causa" y "Registrar acto procesal": obligatorios anunciados, nota como descripción, y el error como descripción al enviar vacío |
| `tests/components/cases/disabledReason.test.tsx` (5) | Las notas de Abogados y del detalle de causa, a quién se le muestran y que describen a sus botones |

## Verificación

| Qué | Resultado |
|---|---|
| `npm run lint` | 0 errores; el warning conocido de `Icon.tsx:2` |
| `npx tsc -b` | Limpio |
| `npx vitest run --maxWorkers=4` | **735 de 735** (112 archivos). Antes de esta tanda: 715 |
| `npx vitest run` (todos los núcleos) | **Falla intermitente**: 2 tests en una corrida y 5 en otra, distintos cada vez, por tiempo de espera (`UsersPage.test.tsx:81`, `tests/unit/app/pages.test.ts:13`, entre otros). Esos mismos tests pasan solos y con 4 procesos. Es lo que el plan A dejó abierto como H-55; **no se comprobó si fallaba igual antes de esta tanda en esta máquina** |
| `npm run test:e2e` | **9 de 9** |
| `npm run build` | Sin errores |
| Ruta interna en el build | `grep -r "daily-run" dist` y `"internal/deadlines"`: **ninguna coincidencia** |

En el navegador, con mocks y `mrios`, sin errores en la consola:

| Qué | Resultado |
|---|---|
| Detalle de la causa 4 (ajena), 1024 px | **Visto**: las dos notas nuevas en su lugar. Medido: los cuatro botones deshabilitados apuntan a una nota que existe. Título: "ACOSTA, Jonathan E. p.s.a. Infracción Ley 23.737 · VZ Causas" |
| Abogados, 1024 px | **Visto**: la nota bajo el encabezado |
| "Modificar causa" con la carátula vacía, 1024 px | **Visto** y medido: la `×` de 32 px; la carátula con `aria-invalid`, descrita por "La carátula es obligatoria."; SAC, fuero, cliente y calificaciones descritos por su nota |
| El mismo diálogo a 375 px | **Visto** y medido: la `×` de 40 px, sin pisar el título, sin desborde |
| "Registrar causa" enviado vacío, 375 px | Medido: carátula, cliente y responsable inválidos y descritos por su error; fuero, carátula, cliente, rol y responsable con `aria-required`; ningún `aria-describedby` apunta a un id que no exista |
| **Enter en un formulario de modal** (H-36, que el plan A no había mirado en el navegador) | Medido en "Registrar cliente": con el foco en "Apellido", Enter valida, marca los 4 obligatorios que faltan y lleva el foco al primero |

**Sin verificar:**

- Lector de pantalla real: todo lo de ARIA se comprobó en el DOM.
- El título de "Generar expediente" y de "Registrar acto procesal" en el
  navegador (sólo sus tests).
- La nota de Abogados y las del detalle de causa en el teléfono.
- Lo que ya venía pendiente de las tandas 5 a 10 y **sigue pendiente**: el
  perfil `supervision`; `gestion` después de las tandas 6 a 10; el borde nuevo
  de los campos y la flecha del selector a 1366 px; el tablero "Estudio" a
  ojo; los modales de modelos, abogado, usuario, acto interruptivo y "Marcar
  prescripta" en el teléfono; estados de error y de carga forzados; Ctrl+clic
  en el rail.
- Nada contra el backend real.

## Lo que queda de la auditoría

| Qué | De quién |
|---|---|
| H-50 · puntos del calendario en el teléfono (18×20 px) | Sin decidir |
| H-55 · falla intermitente de la suite con todos los núcleos | Plan A lo dejó abierto; ver arriba |
| La revisión visual pendiente de la lista de "Sin verificar" | Plan B |
| Lo "Importa" del [16](16-RESUMEN_PLAN_A.md): backend real, fin de mes de la prescripción (mock contra backend), los tres perfiles contra la tabla de permisos, carreras | Plan A |
| Documentación atrasada: `frontend/CLAUDE.md` y `docs/Frontend-Architecture/SHARED.md` no mencionan `SearchSelect`, `usePageTitle`, `fieldIds`/`controlA11y`, la pila de modales ni `dismissOnBackdrop`; `MATRIZ_CA.md` se regenera con `npm run ca-matrix` | Sin asignar |
