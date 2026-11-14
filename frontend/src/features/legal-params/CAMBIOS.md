# Estados procesales y calificaciones legales — registro de cambios

Cambios sobre las pantallas del módulo que no salen del prototipo ni del
contrato.

---

## 2026-11-14 — Calificaciones legales: vuelven "Modificar" y "Eliminar" (HU-49, HU-50)

**Sprint 5 (V6, D-127).** El backend ya tiene `PATCH` y `DELETE
/legal-qualifications/{qualificationId}`, así que las acciones de fila vuelven
a mostrarse para los tres perfiles. Se borró `SHOW_ROW_ACTIONS`.

- **Textos del prototipo** (acordado el 14/11/2026): las notas pasan a "Se
  usa en N causas. Cambiar el plazo recalcula su prescripción." (modificar) y
  "Se usa en N causas, que la conservan. Deja de ofrecerse al registrar causas
  nuevas." (eliminar; sin uso, sólo la segunda oración). Los avisos, a
  "Calificación actualizada." y "Calificación eliminada.". El subtítulo de
  "Eliminar calificación legal" es sólo el nombre, sin el plazo.
- **`404` al modificar** (CA-49.6): si otro la dio de baja con el diálogo
  abierto, avisa con el texto del backend, cierra el diálogo y vuelve a pedir
  la tabla, como "Modificar cliente" (HU-10).
- La baja sigue cerrando el diálogo al confirmar, con la fila sacada de forma
  optimista: no hay `409` que mostrar (CA-50.3).

### Archivos

| Archivo | Cambio |
|---|---|
| `pages/LegalQualificationsPage.tsx` | Sin `SHOW_ROW_ACTIONS`; avisos del prototipo; `404` al modificar |
| `components/LegalQualificationFormModal.tsx` | Nota del prototipo |
| `components/DeleteLegalQualificationModal.tsx` | Nota y subtítulo del prototipo |

Tests: `components/legal-params/LegalQualificationsPage.edit.test.tsx`,
`LegalQualificationsPage.delete.test.tsx`, el caso nuevo de
`legalParamsMutations.cache.test.tsx` (CA-50.2) y
`unit/legal-params/buildLegalQualificationPatch.test.ts`.

---

## 2026-10-18 — Calificaciones legales: sin "Modificar" ni "Eliminar"

**Pedido del equipo:** ocultar los botones de modificar y dar de baja en la
tabla de calificaciones legales (`/calificaciones-legales`).

- La tabla ya no muestra la columna de acciones. Quedan el listado, la
  búsqueda y "Registrar calificación".
- **No se borró nada:** la modificación y la baja (hooks, modales,
  `buildLegalQualificationPatch`) siguen programadas. Se ocultan con la
  constante `SHOW_ROW_ACTIONS = false` en `pages/LegalQualificationsPage.tsx`;
  para volver a mostrarlas alcanza con ponerla en `true`. Se usa una
  constante y no se sacan los props porque el tsconfig tiene `noUnusedLocals`:
  sin uso, `openEdit` rompería el build.
- `LegalQualificationsTable` no cambió: sin `onEdit` ni `onDelete` ya no
  dibujaba la columna de acciones.
- Estados procesales no cambia: sigue con sus botones.
- El backend todavía no tiene `PATCH` ni `DELETE` de calificaciones legales
  (quedaron fuera del Sprint 2); la pantalla sólo los tenía andando contra los
  mocks de MSW.

### Archivos

| Archivo | Cambio |
|---|---|
| `pages/LegalQualificationsPage.tsx` | `SHOW_ROW_ACTIONS` y los dos props condicionados |
| `tests/components/legal-params/LegalQualificationsPage.test.tsx` | El test de la consulta ahora verifica que no estén los botones |

### Verificación

`tsc` de la app y `oxlint` del módulo sin errores; 25 de 25 tests de
`tests/components/legal-params` y `tests/unit/legal-params`.
