# Plan B · Tanda 2 — Tabla de Causas y avisos

12/11/2026 · rama `feat/auditoria-front` · cambios en el árbol de trabajo,
**sin commitear**, encima de los de la
[tanda 1](08-TANDA1_RESULTADOS.md). Rutas relativas a `frontend/`. Los `H-xx`
son los del [diagnóstico](01-DIAGNOSTICO_INICIAL.md) y de
[07-REVISION_VISUAL.md](07-REVISION_VISUAL.md).

Sólo archivos del plan B. Ningún texto visible cambió.

## Qué cambió

### T-35 · La tabla de Causas a 1366 px (H-32)

| Antes | Ahora |
|---|---|
| Mínimo de 1.100 px en un panel de 1.045: 55 px de scroll horizontal | Mínimo de 1.040: **sin scroll** |
| Carátula en 156 px, partida en cuatro renglones | Carátula en **229 px** |
| "Estado procesal" en 273 px, en un renglón | 150 px; un estado largo parte en dos renglones |

Archivos: `src/features/cases/components/CasesTable.tsx` (anchos, mínimo y un
`<span className="vz-cases__state">` alrededor del `Pill` del estado),
`src/styles/cases.css` (la regla que deja partir a ese `Pill`).

**Límite que queda:** entre 1.181 y unos 1.360 px de ventana la tabla sigue
con scroll horizontal (el panel mide menos de 1.040). Sacarlo del todo pide
que la tabla pase a fichas antes, y ese corte (1.180) es del sistema: no se
tocó. En el teléfono y la tableta la tabla ya es de fichas y no cambió.

### T-20 · Avisos (H-04)

| Antes | Ahora |
|---|---|
| 2 segundos para todos | 4 s éxito e información, **8 s error** (`src/app/providers/toastDuration.ts`) |
| Se iban aunque se los estuviera leyendo | Con el mouse encima o el foco adentro no se van; al salir vuelven a contar |
| El temporizador seguía vivo al cerrarlo a mano | Cada aviso tiene el suyo y se cancela al cerrarse, pausarse o desmontarse |
| `role="alert"` adentro de una región `aria-live`: doble anuncio | Sólo `role="alert"` en cada aviso |
| Clases `toast*` y `ToastProvider.css` al lado del componente | Clases `vz-toast*` en `src/styles/feedback.css`; `ToastProvider.css` **borrado** |
| `#fff` a mano; radio de píldora que le comía las esquinas a un mensaje de dos renglones | Tokens; radio de 22 px |
| "Cerrar" de 20 px | 28 px, 36 en el teléfono; foco claro sobre el aviso oscuro |

Archivos: `src/app/providers/ToastProvider.tsx`,
`src/app/providers/toastDuration.ts` (nuevo), `src/styles/feedback.css`,
`src/app/providers/ToastProvider.css` (borrado).

Test nuevo: `tests/components/app/ToastProvider.test.tsx` (7 casos: duración
por tipo, pausa con mouse y con foco, cierre a mano, tope de dos, un solo
anuncio).

**Decisión tomada, para revisar:** todos los avisos siguen siendo
`role="alert"`, también los de éxito. Lo correcto sería `role="status"` para
éxito e información, pero **ocho tests y un E2E buscan el aviso de éxito con
`getByRole('alert')`** (por ejemplo
`tests/components/legal-params/LegalQualificationsPage.test.tsx:67`,
`tests/e2e/cases.spec.ts:96`). Se dejó como estaba para no romper tests del
plan A; si Luciano está de acuerdo, es un cambio de una línea más esos tests.

## Lo que no se hizo de la tanda

**Tarea 9 · `aria-label` en las acciones de fila (H-40, parte ARIA).** El
plan la dejaba sujeta a una decisión (la 4 de 07 §5): cambia el nombre
accesible de "Modificar", "Eliminar" y "Ver detalle" en las cinco tablas, y
los tests del plan A los buscan por ese nombre. **Sigue pendiente de esa
decisión.**

## Verificación

| Qué | Resultado |
|---|---|
| `npm run lint` | 0 errores; el warning conocido de `Icon.tsx:2` |
| `npx tsc -b` | Limpio |
| `npx vitest run` | **676 de 676** (105 archivos) |
| Tabla de Causas, 1366 px | Medido y visto: tabla 1.045 en panel de 1.045, sin scroll; columnas 91 / 229 / 120 / 150 / 163 / 176 / 115 |
| Listado de causas, 390 px | Medido: sigue en fichas, sin desborde de página |
| Aviso de información, 1366 px | Visto en `/causas/1` ("Solo el abogado responsable…"): dos renglones, legible; seguía a los 3,6 s y se fue antes de los 9 |

**Sin verificar:**

- Un aviso de error y uno de éxito en pantalla (sólo el de información); la
  pausa con el mouse en el navegador (sólo el test).
- Los avisos en el teléfono y sobre un modal abierto.
- La tabla de Causas a 1440 px y entre 1181 y 1360.
- `npm run test:e2e` y `npm run build`.

## Aclaración sobre la tanda 1

El rail "abierto sin velo" que se anotó al pasar de 1366 a 390 px **no es un
defecto de la app**: la regla que lo esconde se aplica, pero en el emulador
la transición de salida tarda en correr. Medido de nuevo unos segundos
después, el rail está fuera de la pantalla. En un teléfono no se cruza ese
corte.

## Para Luciano

- `ToastProvider.css` ya no existe; los estilos están en
  `src/styles/feedback.css` con clases `vz-toast*`. Un test o un E2E que
  busque `.toast` deja de encontrarlo (no se encontró ninguno).
- Los avisos ya no desaparecen a los 2 s: un test que espere que un aviso se
  vaya tiene que esperar `TOAST_DURATION_MS` (no se encontró ninguno).
- `ToastContext.ts` no se tocó.
