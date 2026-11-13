# Respuesta del plan A a `11-PARA_LUCIANO.md`

13/11/2026 · de Luciano (plan A: técnico y funcional), para Facundo.

Responde los tres puntos de tu nota. Las rutas son relativas a `frontend/`.
Lo hecho del plan A está en [12-REGISTRO_PLAN_A.md](12-REGISTRO_PLAN_A.md).

## a. Correr todo con tus cambios: todavía no se pudo

Tu commit (`f6e94b9`) está bajado pero **no aplicado** en esta máquina: la
rama local quedó un commit atrás, porque hay cambios del plan A sin commitear
y el `pull` no los pisa. Cuando Luciano commitee y haga el `pull`, se corre
lint, tipos, `vitest`, E2E y build, y se anota acá el resultado.

Lo que se revisó sin aplicarlo, comparando archivos:

- **No hay archivos en común** entre tu commit y lo que el plan A tiene sin
  commitear, salvo `docs/auditoria-front/README.md` (ya se dejó como estaba
  para que no choque).
- Tus cambios en `src/styles/controls.css` **no tocan el bloque "combobox"**
  del selector con filtro.
- El registro del plan A se llamaba `07-REGISTRO_PLAN_A.md` y chocaba en
  número con tu `07-REVISION_VISUAL.md`: pasó a `12-REGISTRO_PLAN_A.md`.
- Los tests nuevos del plan A no buscan `navigation` sin nombre, ni "Migas",
  ni llegan a una pestaña con `user.tab()`, ni miran cuánto dura un aviso.
  **No se espera ninguna rotura, pero no está corrido.**

**Cambios del plan A que te tocan a vos:**

- `src/shared/components/ui/Modal.tsx`: con un modal encima de otro, sólo el
  de arriba atiende Escape y Tab (H-06).
- `src/shared/components/forms/SearchSelect.tsx` (nuevo): el selector con
  filtro de cliente y calificaciones. Su CSS está en el bloque "combobox" de
  `controls.css`. Falta mirarlo a 320 px y adentro de "Modificar causa".
- "Modificar causa" ahora abre "Registrar calificación nueva" **encima** del
  diálogo: es el único lugar con dos modales apilados.
- La sesión se sincroniza entre pestañas, y con los mocks ya se pueden abrir
  dos pestañas sin que se cierre la sesión (H-31).

## b. Las seis decisiones

| # | Decisión | Recomendación del plan A | Costo del lado del plan A |
|---|---|---|---|
| 1 | `role="status"` en avisos de éxito e información | **De acuerdo.** Un aviso de "guardado" no tiene que interrumpir | 19 líneas en 7 archivos de test buscan `ByRole('alert')`; hay que ver cuáles son de éxito. Lo hacés vos con los tests en la misma tanda; el plan A no tiene tests propios que dependan de eso |
| 2 | `aria-label` en las acciones de fila ("Modificar Ríos, Malena") | **De acuerdo**, con una condición: que el nombre **empiece** con el texto visible, así quien dicta "Modificar" por voz lo sigue encontrando | 31 líneas en 9 archivos buscan `name: 'Modificar'`, `'Eliminar'` o `'Ver detalle'` con el texto exacto. Son tuyas en la misma tanda. Avisá antes: el plan A va a auditar las bajas y puede estar tocando esos mismos tests |
| 3 | Campana sólo si `DAILY_RUN_ENABLED` | **De acuerdo.** Además saca del build la ruta interna `/internal/deadlines/daily-run`, que hoy queda a la vista | Ninguno: ningún test busca "Notificaciones". `AppLayout.tsx` es tuyo |
| 4 | Modal: no cerrar con clic afuera si hay algo escrito, y `×` en la cabecera | **De acuerdo, con un cambio:** `Modal` no sabe si hay algo escrito. Propuesta: un formulario (`FormModal` y los diálogos con campos) **nunca** se cierra con clic afuera; una confirmación sin campos, sí. Escape, "Cancelar" y la `×` siempre cierran | Lo toma el plan A: `Modal.tsx`, `FormModal.tsx`, sus tests, y un test que cierra con clic en el fondo (`RegisterCasePage.draft.test.tsx:95`). El estilo de la `×` es tuyo |
| 5 | Borde de los campos a `--vz-border-strong` | **De acuerdo.** 1,31:1 no llega al 3:1 que se pide para el borde de un control | Ninguno |
| 6 | Motivo de un botón deshabilitado sólo en `title` | El detalle de causa ya tiene el patrón que sirve: una nota visible debajo ("Solo el abogado responsable (…) registra actos."). Propuesta: nota visible unida al botón con `aria-describedby`, **pantalla por pantalla**, no un componente nuevo | Toca páginas del plan A (`CaseDetailPage`) y el patrón de `frontend/CLAUDE.md`. Para después de la auditoría de caché y carreras |

## c. Reparto de los archivos compartidos

| Tarea | Quién | Cuándo |
|---|---|---|
| H-35 · `aria-invalid`, `aria-describedby`, `aria-required` en `FormModal.tsx` y `Field.tsx` | **Facundo.** `FormModal.tsx` queda liberado para esto | Cuando quieras: el plan A no lo tiene abierto. Avisá al terminar |
| H-35 en `CaseForm` y `ProceduralActForm` | **Plan A**, con lo que hayas definido en `Field` | Después de lo tuyo |
| H-37 · `autocomplete` y tipo `'email'` en `FieldSpec` | **Facundo**, en la misma pasada que H-35 | Ídem |
| H-36 · `FormModal` como `<form>`, Enter envía | **Plan A.** Cambia cuándo se envía cada ABM y se cruza con la auditoría de doble envío | Después de H-35 y H-37, para no editar el archivo a la vez |
| H-05 y H-44 · cierre del modal y `×` | **Plan A** (`Modal.tsx`) | Es lo siguiente del plan A sobre ese archivo. Te aviso para que le des estilo a la `×` |
| H-07, H-45 · rail como enlaces, menú del teléfono, "Saltar al contenido" | **Facundo.** `AppShell.tsx` y `AppLayout.tsx` son tuyos, con sus tests | Cuando quieras |
| H-41 · `role="tabpanel"` en `HomePage` y `ProceduralStatesPage` | **Facundo.** Son páginas tuyas | Cuando quieras |
| H-20 · título de la pestaña | **Facundo** el hook y sus 8 páginas; **plan A** suma la línea en las 5 suyas (`cases/pages/*`, `proceedings/pages/*`) | Avisá cuando el hook esté |
| H-54 · campo de fecha de 34 px en `LegalQualificationPicker` | **Facundo si es sólo CSS** (`cases.css`). Si pide tocar el componente, lo hace el plan A | Cuando quieras |

**Lo que el plan A tiene abierto ahora**, para que no lo toques sin avisar:
`Modal.tsx`, `src/app/providers/AuthProvider.tsx`, `src/shared/mocks/db.ts`,
`src/features/cases/pages/*`, `cases/api/*`, `CaseEditForm.tsx`, y todos los
`use…` de mutación de `src/features/*/api/` (auditoría de caché).
