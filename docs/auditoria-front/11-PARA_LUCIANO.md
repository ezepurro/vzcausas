# Para Luciano — lo que el plan B cambió, lo que necesita decidir y lo que le pide

12/11/2026 · de Facundo (plan B: visual, UX, responsive y accesibilidad).
Está escrito para pasárselo tal cual a Claude en tu sesión.

---

Estoy en la rama `feat/auditoria-front`, a cargo del plan A (técnico y
funcional) de la auditoría del frontend. Facundo, que lleva el plan B
(visual, UX, responsive y accesibilidad), terminó tres tandas y me pasa esto.
Los cambios de él están **en el árbol de trabajo de su máquina, sin
commitear**: antes de tocar nada, confirmá conmigo si ya los tengo en mi
rama.

El detalle de cada punto está en `docs/auditoria-front/`:
`07-REVISION_VISUAL.md` (hallazgos H-34 a H-52), `08-TANDA1_RESULTADOS.md`,
`09-TANDA2_RESULTADOS.md` y `10-TANDA5_RESULTADOS.md`. Las rutas son
relativas a `frontend/`. Leé esos cuatro antes de responder.

No programes nada todavía. Necesito que hagas tres cosas, en este orden:

## 1. Revisar que los cambios del plan B no rompen nada mío

Con los cambios de Facundo aplicados, en su máquina dio: lint limpio (sólo el
warning conocido de `Icon.tsx:2`), `npx tsc -b` limpio, `npx vitest run` 676
de 676, `npm run test:e2e` 9 de 9 y `npm run build` sin errores. Volvé a
correrlo en la mía y avisame si algo difiere.

Cambios que pueden tocar tests o código del plan A:

- **`src/shared/components/ui/Pagination.tsx`** ahora es
  `<nav aria-label="Paginación">` y su resumen lleva `aria-live="polite"`.
  Un test que busque `getByRole('navigation')` **sin nombre** en una página
  con tabla va a encontrar más de uno.
- **`src/shared/components/ui/Breadcrumbs.tsx`**: el `aria-label` pasó de
  "Migas" a "Ruta de navegación".
- **`src/shared/components/ui/Tabs.tsx`**: flechas, Inicio y Fin cambian de
  pestaña; la pestaña no elegida tiene `tabIndex={-1}`. Los tests que hacen
  clic siguen igual; uno que llegue con `user.tab()` a una pestaña no
  elegida, no. Acepta `aria-label` y `panelId` (opcionales).
- **Avisos**: `src/app/providers/ToastProvider.css` **se borró**; los estilos
  están en `src/styles/feedback.css` con clases `vz-toast*` (antes `toast*`).
  Duran 4 s (éxito, información) y 8 s (error), antes 2 s; con el mouse
  encima o el foco adentro no se van. Las duraciones están en
  `src/app/providers/toastDuration.ts` (`TOAST_DURATION_MS`). Se sacó el
  `aria-live` del contenedor. `ToastContext.ts` no se tocó.
- **`src/features/cases/components/CasesTable.tsx`**: el estado procesal va
  dentro de un `<span className="vz-cases__state">`, el mínimo de la tabla
  bajó de 1.100 a 1.040 px y cambiaron dos anchos de columna.
- **`index.html`**: suma tres `<link>` de fuentes en el `<head>` (antes era
  un `@import` en `src/styles/index.css`). No toca la pantalla de carga que
  compara `tests/unit/app/bootScreen.test.tsx`.
- **`src/styles/tokens.css`**: 14 tokens nuevos (`--vz-focus`,
  `--vz-on-primary`, `--vz-on-dark-*`, `--vz-mark-*`, `--vz-danger-wash`,
  `--vz-fuero-*`). Ningún color cambió de valor.
- **El botón primario deshabilitado** ya no es blanco sobre gris: fondo
  `--vz-sunken`, texto `--vz-muted`.
- Tests nuevos del plan B: `tests/components/shared/Tabs.test.tsx` y
  `tests/components/app/ToastProvider.test.tsx`.

## 2. Darme tu opinión sobre estas decisiones

Para cada una decime qué recomendás y qué costo tiene del lado del plan A
(archivos y tests). La recomendación de Facundo va entre paréntesis.

1. **`role="status"` en los avisos de éxito e información.** Hoy todos son
   `role="alert"` (interrumpe al lector de pantalla). No se cambió porque hay
   tests y un E2E que buscan el aviso de éxito con `getByRole('alert')`, por
   ejemplo `tests/components/legal-params/LegalQualificationsPage.test.tsx:67`,
   `tests/components/proceedings/RegisterProceduralActPage.test.tsx:99` y
   `tests/e2e/cases.spec.ts:96`. (Cambiarlo, actualizando esos tests.)
2. **`aria-label` en las acciones de fila** (H-40). "Modificar", "Eliminar" y
   "Ver detalle" se anuncian igual en las 20 filas; la propuesta es
   "Modificar Ríos, Malena". Cambia el nombre accesible que buscan los tests
   de las cinco tablas. (Hacerlo, con los tests en la misma tanda.)
3. **Campana de notificaciones** (H-08): en producción no hace nada y está en
   la barra de todas las pantallas. (Dibujarla sólo si `DAILY_RUN_ENABLED`.)
4. **Cierre de un modal con datos cargados** (H-05) y **`×` en la cabecera**
   (H-44): hoy un clic afuera pierde lo escrito, y el modal no tiene botón de
   cerrar. (No cerrar con clic afuera si hay algo escrito; Escape y
   "Cancelar" siguen cerrando; sumar la `×`.) `Modal.tsx` es tuyo.
5. **Borde de los campos** (H-43): `--vz-border` sobre blanco da 1,31:1.
   (Pasar sólo los campos a `--vz-border-strong`.) Es CSS del plan B; es una
   decisión de identidad visual, por eso se consulta.
6. **Motivo de un botón deshabilitado sólo en `title`** (H-53): no se ve en
   el teléfono ni con teclado. Afecta el patrón de `frontend/CLAUDE.md`,
   "Acceso por perfil". (Sin recomendación todavía.)

## 3. Decirme cómo repartimos los archivos compartidos

Estas tareas del plan B tocan archivos que son tuyos o compartidos. Para cada
una decime si la tomás vos, si se la liberás a Facundo, o en qué orden
respecto de lo tuyo (T-13 sobre `Modal.tsx`, T-11b y T-12).

| Tarea | Hallazgo | Archivos |
|---|---|---|
| Errores y obligatorios asociados al control: `aria-invalid`, `aria-describedby`, `aria-required`, y el `*` con `aria-hidden` | H-35 (ALTO) | `src/shared/components/forms/FormModal.tsx`, `Field.tsx`; lo mismo en `CaseForm` y `ProceduralActForm`, que no se revisó si ya lo pasan a mano |
| Enter envía los formularios de modal: `FormModal` no dibuja un `<form>` | H-36 | `FormModal.tsx` — toca todos los ABM |
| `autocomplete` (`new-password`, `off`, `email`) y tipo `'email'` en `FieldSpec`; hoy "Contraseña inicial" de otro usuario puede autocompletarse con la del administrador | H-37 | `FormModal.tsx`, `src/features/users/components/UserFormModal.tsx` |
| Rail como enlaces (`NavLink`), menú del teléfono con el fondo inerte y el foco adentro, enlace "Saltar al contenido" | H-07, H-45 | `src/shared/components/ui/AppShell.tsx`, `src/app/layouts/AppLayout.tsx`; los tests de `AppLayout` y `AppShell` buscan botones |
| Marcar el panel de las pestañas (`role="tabpanel"` + `id`) para usar el `panelId` de `Tabs` | H-41 | `src/features/dashboard/pages/HomePage.tsx`, `src/features/legal-params/pages/ProceduralStatesPage.tsx` |
| Título de la pestaña por pantalla: un hook en `shared/hooks/` y una línea por página | H-20 | Las 13 páginas |
| El campo de fecha de una calificación mide 34 px en el teléfono | H-54 | `src/features/cases/components/LegalQualificationPicker.tsx` |

## Lo que el plan B no verificó

Para que no lo des por revisado: no se probó con lector de pantalla real; no
se forzaron los estados de error y de carga pantalla por pantalla; no se
revisó el perfil `supervision`; y los cambios de la última tanda (login
angosto y colores a tokens) se comprobaron midiendo el DOM, sin mirar
capturas.

Respondeme con: (a) el resultado de correr todo en mi máquina, (b) tu
recomendación en cada una de las seis decisiones, y (c) quién toma cada fila
de la tabla y en qué orden. No modifiques archivos hasta que lo acordemos.
