# Plan A — Técnico y funcional

**Lo ejecuta:** Luciano con Claude. **El otro plan:**
[06-PLAN_B_VISUAL.md](06-PLAN_B_VISUAL.md), del compañero.

12/11/2026 · rama `feat/auditoria-front` · **propuesta: nada de esto se
programa hasta acordarlo.** Los `H-xx` están en el
[diagnóstico](01-DIAGNOSTICO_INICIAL.md) y en los
[resultados de la ola 1](04-OLA1_RESULTADOS.md); el detalle de cada tarea
(solución, riesgo, criterio de terminado), en [03-PLAN.md](03-PLAN.md). Este
documento dice **qué es de este plan, en qué orden y qué archivos son suyos**.

Rutas relativas a `frontend/`.

## Archivos de este plan

Sólo este plan los modifica:

- `src/app/providers/{AuthProvider.tsx,AuthContext.ts,QueryProvider.tsx}`
- `src/app/router/*` (menos `ForbiddenPage`, `RouteErrorPage`, `SectionPlaceholder`), `src/app/access/*`
- `src/shared/api/*`, `src/shared/lib/*`, `src/shared/mocks/**`
- `src/shared/components/ui/Modal.tsx`, `src/shared/components/forms/{FormModal,Combobox,SearchSelect}.tsx`
- `src/features/*/api/**`, `types/**`, `schemas/**`, `utils/**`, `index.ts`
- `src/features/cases/pages/*`, `src/features/cases/components/{CaseForm,CaseEditForm,LegalQualificationPicker}.tsx`
- `src/features/proceedings/pages/*`
- `tests/**`, configuración (`vite`, `vitest`, `playwright`, `tsconfig`, `package.json`)

**Una excepción dentro del CSS**, que es del plan B: el bloque "combobox" de
`src/styles/controls.css` (el selector con filtro) lo toca este plan. El plan
B no edita ese bloque.

## Tareas, en orden

| # | Tarea | Hallazgo | Archivos | Depende de |
|---|---|---|---|---|
| 1 | **T-11 · Selector con filtro** para cliente y calificaciones en "Registrar causa" y "Modificar causa", con búsqueda en el servidor; lo elegido se resuelve por id | H-03, H-28, H-29 | `SearchSelect.tsx` (nuevo), bloque combobox de `controls.css`, `cases/pages/RegisterCasePage.tsx`, `cases/api/useCaseEdit.ts`, `CaseForm`, `CaseEditForm`, `LegalQualificationPicker`, hooks nuevos en `clients` y `legal-params` | — |
| 2 | **T-13 · Modales**: sólo el de arriba atiende Escape y Tab; y lo que se decida sobre cerrar con datos cargados | H-05, H-06 | `Modal.tsx`, `FormModal.tsx` | Decisión 3. El plan B revisa el resultado |
| 3 | **T-12 · "Registrar calificación nueva" en "Modificar causa"** | H-30 | `useCaseEdit.ts`, `CaseEditForm.tsx` | 1 y 2 |
| 4 | **T-28 · El mock con dos pestañas**: que cada pestaña relea las sesiones guardadas | H-31 | `src/shared/mocks/db.ts` | — |
| 5 | **T-10 · Sesión entre pestañas** | H-01 | `AuthProvider.tsx` + test nuevo | 4, o el backend levantado |
| 6 | **T-25 · Test intermitente** | H-02 | `tests/components/app/RouteErrorPage.test.tsx` | — |
| 7 | **T-23 · Timeout de subidas y descargas** | H-11 | `documents/api/documentTemplates.api.ts`, `cases/api/cases.api.ts` | Medir con el backend |
| 8 | **T-24 · Fecha estimada de prescripción** en fin de mes | H-14 | `cases/utils/prescription.ts` + unit | — |
| 9 | **T-26 · Renovación por `403`**: sólo análisis | H-09 | — | 5 |
| 10 | **T-40 · Limpieza**: dependencia sin uso, imports relativos y comentados, carpetas vacías, comentario viejo de `http.ts:7` | H-16, H-18, H-19 | Varios, todos de este plan | Al final |

Fuera de orden, cuando haya decisión: **T-27** (permisos desde el backend,
decisión 4) y **T-41** (Prettier, decisión 5: si va, antes que todo y
avisándole al plan B).

**No son de este plan** aunque el diagnóstico los marcó como A: `/reportes`
sin ruta (H-21) es la pantalla del Sprint 5, y las páginas grandes (H-12) no
se tocan mientras no estorben una corrección.

## Lo que este plan le deja al plan B

- **T-13** cambia cómo se cierran todos los modales: avisar antes de empezar
  y cuando esté, para que B lo revise en el teléfono.
- **T-11** agrega un componente compartido (`SearchSelect`). Si B lo quiere
  usar o cambiarle el aspecto, se pide acá.
- Los tests (`tests/**`) son de este plan, pero **el que rompe un test lo
  arregla en la misma tanda**: si B renombra un botón, actualiza su test.

## Verificación pendiente de la ola 1 (de este plan)

- El cruce de usuarios entre dos pestañas, con el backend real.
- Con qué variables se hace el build que se despliega (los mocks no deben
  quedar encendidos).
- La invalidación de caché de las 29 mutaciones, una por una.
- Carreras: doble clic en "Guardar", respuesta que llega tarde, sondeo de la
  carpeta al cambiar de causa.
- Los tres perfiles contra la tabla de permisos del contrato.

## Estado al 12/11/2026

**T-11 quedó empezada y frenada** a pedido ("sólo auditoría"). En el árbol de
trabajo, sin commitear, hay piezas nuevas que **ninguna pantalla usa
todavía**: `SearchSelect.tsx`, `useClient`, `useLegalQualificationsByIds`,
`useClientOptions`, `useQualificationOptions`, `optionsNote.ts`, las dos
funciones `get…` por id y el bloque de CSS. Compila y el lint pasa; **no
tiene tests y no se probó en el navegador**. Falta decidir si se conserva
para retomarla o se descarta.
