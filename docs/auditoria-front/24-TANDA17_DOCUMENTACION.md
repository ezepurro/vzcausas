# Tanda 17 — documentación atrasada

13/11/2026 · Facundo con Claude · rama `feat/auditoria-front` · **sólo
documentación**: ningún archivo de `src/` ni de `tests/` cambió en esta tanda.
Se hizo antes que la 16 (calendario, H-50), que espera la aprobación de su
maqueta.

## Qué se documentó

Todo se escribió leyendo el código (props, textos y comentarios de cada
archivo), no de memoria.

| Documento | Qué se agregó |
|---|---|
| `docs/Frontend-Architecture/SHARED.md` | Secciones nuevas: `LoadError`, `fieldIds` / `controlA11y`, `SearchSelect` (con la diferencia con `Combobox`), `usePageTitle` y `leftBehindErrors`. En `Modal`: `dismissOnBackdrop`, la pila de modales y la "×". En `DataTable`: el paso a fichas cuando la tabla no entra (`useStacked`) y qué implica para un test y para los E2E. Filas nuevas en "Índice rápido" y en "Si necesitás X, usá Y" |
| `frontend/CLAUDE.md` | Sección nueva "Lo que sumó la auditoría del front (11/2026)": título de página, `LoadError`, modales, duración de los avisos, fichas, `casesKeys.mutation`, `leftBehindErrors`, `invalidateCaseCounters`, motivo visible de un botón deshabilitado, "Solo" sin tilde y las tres cosas que rompen un test nuevo. Cuatro filas en "Componentes de `shared` que ya se usan". "Problemas conocidos" 1 (los tests) y 3 (la campana sólo en desarrollo; "Reportes" oculto en el rail), al día |
| `docs/Frontend-Architecture/MATRIZ_CA.md` | Regenerada con `npm run ca-matrix`: 200 criterios, 38 sólo del backend |

## Qué no se tocó, y por qué

| Qué | Por qué |
|---|---|
| El `CLAUDE.md` raíz dice que el contrato vigente es V5; el del front, V6 (H-15) | Es una decisión pendiente: cambiar un lado sin el otro empeora |
| `frontend/CLAUDE.md:7`, "Estado al 05/11/2026 (Sprint 4)", y lo del Sprint 5 "sin programar" | No se verificó contra Jira ni contra lo que haya programado el equipo fuera de esta rama |
| `frontend/CLAUDE.md:68`, "Hoy la campana de notificaciones del rail viola esta regla" | Sigue siendo cierto en desarrollo; el detalle está corregido en "Problemas conocidos" 3 |
| `src/shared/api/http.ts:7` cita `docs/api contract v1.md`, que no existe | Es código, no documentación: va con una tanda de código |
| `.claude/rules/*.md` | Son de backend |
| `docs/Frontend-Architecture/ESTRUCTURA.md` y `TESTING.md` | No se revisaron en esta tanda. `TESTING.md` §11 no lista los tests que sumó la auditoría |

## Verificación

| Qué | Resultado |
|---|---|
| Cada símbolo documentado existe y está exportado | Leído: `src/shared/components/forms/index.ts` (`SearchSelect`, `fieldIds`, `controlA11y`), `src/shared/components/ui/index.ts` (`LoadError`), `src/shared/hooks/usePageTitle.ts`, `src/shared/api/leftBehindErrors.ts`, `src/features/cases/api/cases.keys.ts` (`mutation`), `src/features/cases/api/invalidateCaseCounters.ts`, `src/app/providers/toastDuration.ts` |
| `npm run ca-matrix` | Corrió sin errores |
| Lint, tipos, tests | No se corrieron: no cambió código |

**Sin verificar:** que los ejemplos de código de `SHARED.md` compilen tal cual
(están armados con las props reales, pero no se pegaron en un archivo).
