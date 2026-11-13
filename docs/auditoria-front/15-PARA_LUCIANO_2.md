# Para Luciano (2) — el plan B terminó lo suyo: qué cambió y qué te queda

13/11/2026 · de Facundo (plan B). Responde a
[13-RESPUESTA_A_FACUNDO.md](13-RESPUESTA_A_FACUNDO.md). Está escrito para
pasárselo tal cual a Claude en tu sesión.

---

Estoy en la rama `feat/auditoria-front`, a cargo del plan A (técnico y
funcional) de la auditoría del frontend. Facundo (plan B: visual, UX,
responsive y accesibilidad) hizo todo lo que el reparto de
`docs/auditoria-front/13-RESPUESTA_A_FACUNDO.md` le dejó y me pasa esto. Sus
cambios van encima de `45034cd`: **antes de tocar nada, confirmá conmigo que
ya los tengo en mi rama** (tiene que existir
`docs/auditoria-front/14-TANDAS6A10_RESULTADOS.md` y
`frontend/src/shared/hooks/usePageTitle.ts`).

Leé `docs/auditoria-front/14-TANDAS6A10_RESULTADOS.md` entero antes de
responder: ahí está el detalle, con archivos y verificación. Las rutas de
abajo son relativas a `frontend/`.

No programes nada todavía. Necesito tres cosas, en este orden.

## 1. Correr todo y revisar lo que me puede haber tocado

En la máquina de Facundo dio: lint limpio (sólo el warning conocido de
`Icon.tsx:2`), `npx tsc -b` limpio, `npx vitest run` 704 de 704 (108
archivos), `npm run build` sin errores y `npm run test:e2e` 9 de 9. Volvé a
correrlo en la mía y avisame si difiere.

Mirá en particular esto, que es mío o lo comparto:

- **Tests míos que Facundo modificó.**
  - De `alert` a `status`, porque los avisos de éxito e información ahora son
    `role="status"` (un error sigue siendo `alert`):
    `tests/components/legal-params/LegalQualificationsPage.test.tsx:67`,
    `tests/components/proceedings/RegisterProceduralActPage.edit.test.tsx:92`,
    `tests/components/proceedings/RegisterProceduralActPage.test.tsx:60`,
    `:85` y `:99`, y `tests/e2e/cases.spec.ts:96`.
  - De `button` a `link`, porque los ítems del rail ahora son `<a href>`:
    `tests/components/app/AppLayout.test.tsx:33` y `goTo` en
    `tests/e2e/fixtures/auth.ts`. **Un test nuevo que navegue por el rail
    tiene que buscar `link`.**
- **El bloque "combobox" de `src/styles/controls.css`**, que es mío: Facundo
  le sumó la flecha del `<select>` al selector con filtro (lo había pedido
  yo), `padding-right` al campo, y movió la `×` de quitar a la izquierda de
  la flecha (`right: 30px`). Revisalo en "Registrar causa" y adentro de
  "Modificar causa", con y sin algo elegido, a 320 px y en escritorio.
- **`src/shared/components/forms/FormModal.tsx` y `Field.tsx`** (H-35 y
  H-37, que le había liberado): `FormModal` pasa `aria-invalid`,
  `aria-describedby` y `aria-required` a cada control; `Field` acepta
  `errorId` y `noteId`; el `*` es `aria-hidden`; `FieldType` suma `'email'`
  y `FieldSpec`, `autoComplete`. **Quedan libres para mí.**
- **`src/shared/components/ui/AppShell.tsx`**: el contenido de la página
  queda `inert` mientras el menú del teléfono está abierto, y `<main>` tiene
  `id` y `tabIndex={-1}` (para "Saltar al contenido").
- **`src/app/layouts/AppLayout.tsx`**: la campana sólo se dibuja con
  `DAILY_RUN_ENABLED`. Confirmá que con eso la ruta
  `/internal/deadlines/daily-run` ya no queda en el build de producción.
- **Bordes de los campos**: pasaron a `--vz-border-strong`. Es visual; sólo
  avisame si algo mío se ve mal.

## 2. Una decisión que Facundo tomó distinta de lo que acordamos

Para las acciones de fila (H-40) habíamos acordado
`aria-label="Modificar Ríos, Malena"`. Facundo usó **`aria-describedby`**
apuntando al nombre de la fila: el botón sigue llamándose "Modificar" y un
lector de pantalla dice "Modificar, botón, Ríos, Malena". Lo eligió para no
tocar los 31 tests de las tablas mientras audito las bajas. La contra: en un
listado de botones los nombres siguen repetidos.

Decime si lo dejamos así o si preferís el `aria-label` (cambia el atributo
en `UsersTable`, `LawyersTable`, `ProceduralStatesTable`,
`LegalQualificationsTable` y `CasesTable`, más esos tests), y en ese caso
cuándo, para no pisarnos.

## 3. Lo que queda de la parte visual, que es mío: proponeme un plan

Para cada punto decime qué archivos toca, qué tests, el riesgo y en qué
orden lo harías respecto de lo que tengo abierto.

| Tarea | Hallazgo | Qué dejó listo Facundo |
|---|---|---|
| Enter envía los formularios de modal: `FormModal` no dibuja un `<form>` | H-36 | Nada: `FormModal.tsx` quedó libre |
| Un formulario nunca se cierra con clic afuera; una confirmación sin campos, sí. `×` en la cabecera del modal | H-05, H-44 | Cuando esté la `×`, avisarle: el estilo es de él. Dame la clase que le vas a poner |
| Errores y obligatorios asociados al control en `CaseForm` y `ProceduralActForm` | H-35 | `Field` acepta `errorId` y `noteId`; el patrón está en `FormModal.tsx`. Fijate qué ya hacen a mano `LegalQualificationPicker` y `SearchSelect` |
| Título de la pestaña en mis 5 páginas (`CasesPage`, `RegisterCasePage`, `CaseDetailPage`, `GenerateCaseFilePage`, `RegisterProceduralActPage`): hoy en una causa la pestaña dice sólo "VZ Causas" | H-20 | `usePageTitle` en `src/shared/hooks/usePageTitle.ts`; acepta `undefined` mientras la carátula no llegó. Proponé qué texto lleva cada una |
| Motivo de un botón deshabilitado sólo en `title` | H-53 | Nada; quedó para después de mi auditoría de caché y carreras |

## Lo que el plan B no verificó

Para que no lo des por revisado: nada se probó con un lector de pantalla
real (lo de ARIA se comprobó en el DOM); Ctrl+clic sobre un ítem del rail
sólo tiene test; no se miró a 1366 px el borde nuevo de los campos ni la
flecha del selector; no se comprobó que el navegador deje de ofrecer la
contraseña guardada en "Registrar usuario"; y no se volvieron a recorrer los
perfiles `gestion`, `mrios` y `supervision` después de estas tandas.

Respondeme con: (a) el resultado de correr todo y lo que hayas visto en los
puntos de la sección 1, (b) tu postura sobre `aria-describedby`, y (c) el
plan para la tabla de la sección 3. No modifiques archivos hasta que lo
acordemos.
