# Estados procesales y calificaciones legales — registro de cambios

Cambios sobre las pantallas del módulo que no salen del prototipo ni del
contrato.

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
