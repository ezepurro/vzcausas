# Auditoría del frontend — VZ Causas

Carpeta de trabajo de la auditoría integral del frontend. Es la referencia
común de los dos desarrolladores: lo que se decide o se encuentra, va acá.

Rama: `feat/auditoria-front` (salió de `develop` en `b818d8f`, 12/11/2026).

| Archivo | Qué es | Estado |
|---|---|---|
| [00-ENCARGO.md](00-ENCARGO.md) | El encargo de la auditoría: alcance, fases, reglas y entregable | Fijo |
| [01-DIAGNOSTICO_INICIAL.md](01-DIAGNOSTICO_INICIAL.md) | Fase 1: mapa de arquitectura, módulos, flujos, dependencias, hallazgos con gravedad e inventario de lo que falta auditar | Hecho (reconocimiento) |
| [02-DIVISION_DE_TRABAJO.md](02-DIVISION_DE_TRABAJO.md) | Las dos áreas (A técnica y funcional, B visual y UX), qué archivos son de cada una y cuáles son compartidos | Hecho |
| [03-PLAN.md](03-PLAN.md) | Fase 2: revisión de los selectores de causa, decisiones pendientes y tareas por ola | Propuesta, sin acordar |
| [04-OLA1_RESULTADOS.md](04-OLA1_RESULTADOS.md) | Ola 1: qué se reprodujo, qué se midió y qué cambió en el diagnóstico | Hecho en parte: falta la revisión visual y el backend real |
| [05-PLAN_A_TECNICO.md](05-PLAN_A_TECNICO.md) | **El plan de Luciano con Claude**: tareas técnicas y funcionales, sus archivos y su orden | Propuesta, sin acordar |
| [06-PLAN_B_VISUAL.md](06-PLAN_B_VISUAL.md) | **El plan del compañero**: revisión visual que falta y tareas de UX, responsive y accesibilidad | Propuesta, sin acordar |
| [07-REVISION_VISUAL.md](07-REVISION_VISUAL.md) | Revisión visual, UX, responsive y accesibilidad del plan B: hallazgos H-34 a H-52 y plan por tandas | Revisión hecha en parte (ver su §1); plan sin acordar |
| [08-TANDA1_RESULTADOS.md](08-TANDA1_RESULTADOS.md) | Plan B, tanda 1: foco, textos cortados, contraste, controles de toque, pestañas, paginado y migas | Hecha, sin commitear |
| [09-TANDA2_RESULTADOS.md](09-TANDA2_RESULTADOS.md) | Plan B, tanda 2: tabla de Causas a 1366 px y avisos | Hecha, sin commitear; falta la tarea 9 (decisión) |
| [10-TANDA5_RESULTADOS.md](10-TANDA5_RESULTADOS.md) | Plan B, tanda 5: login angosto, fuentes, colores a tokens; revisión de perfiles y modales; E2E y build | Hecha, sin commitear |
| [11-PARA_LUCIANO.md](11-PARA_LUCIANO.md) | Lo que el plan B cambió, las decisiones pendientes y los archivos compartidos que pide. Escrito para pasárselo a Claude en la sesión de Luciano | Para enviar |
| [12-REGISTRO_PLAN_A.md](12-REGISTRO_PLAN_A.md) | Lo hecho del plan A, tarea por tarea | Lo mantiene Luciano |
| [13-RESPUESTA_A_FACUNDO.md](13-RESPUESTA_A_FACUNDO.md) | Respuesta del plan A al 11: resultado de correr todo, las seis decisiones y el reparto de archivos compartidos | Recibida |
| [14-TANDAS6A10_RESULTADOS.md](14-TANDAS6A10_RESULTADOS.md) | Plan B, tandas 6 a 10: avisos, bordes, roles, acciones de fila, campana, errores de campo, rail como enlaces, menú del teléfono, pestañas y título. Cierra con "Para Luciano" | Hecha, sin commitear |
| [15-PARA_LUCIANO_2.md](15-PARA_LUCIANO_2.md) | Segundo mensaje para el plan A: qué cambió en las tandas 6 a 10, la decisión sobre las acciones de fila y lo que le queda. Escrito para pasárselo a Claude en la sesión de Luciano | Para enviar |

`03-PLAN.md` queda como el detalle de cada tarea; quién hace qué lo dicen el
05 y el 06, que no comparten archivos.

Lo que sigue (todavía no existe): un informe por
tanda de cambios en las Fases 3 a 5.

## Reglas de esta carpeta

- **Fase 1 no tocó código.** Lo único nuevo en la rama es esta carpeta.
- Cada hallazgo tiene un id (`H-xx`) que no se reutiliza. Los planes y los
  commits lo citan.
- Un hallazgo dice **cómo se comprobó**: "leído", "medido", "corrido" o
  "sin verificar". Nada se da por bug hasta reproducirlo.
- Nadie commitea desde Claude: los cambios quedan en el árbol de trabajo y
  los commits los hace el equipo.

## Documentación desactualizada o que se contradice

El pedido avisaba que "`CLAUDE.md` y cosas así están desactualizados". Esto es
lo que se encontró; **no se corrigió nada**, porque cambiar un lado sin el otro
empeora:

| Qué | Dónde | Contradicción |
|---|---|---|
| Contrato vigente | `.claude/CLAUDE.md` (raíz) dice V5 "versión final" | `frontend/CLAUDE.md:14` y `docs/Frontend-Architecture/ESTRUCTURA.md:187` dicen que desde el 09/11/2026 el vigente es `API_CONTRACT_V6.md`. El archivo V6 existe en `docs/Api-Contract/` |
| Alcance del `CLAUDE.md` raíz | `.claude/CLAUDE.md` | Es sólo de backend ("Backend VZ Causas"). El del front es `frontend/CLAUDE.md` (1.200 líneas); para esta auditoría manda ese |
| "Reportes" en el rail | `frontend/CLAUDE.md`, "Problemas conocidos" 3, dice que el ítem está en el rail y da "no encontrado" | En el código está oculto: `frontend/src/app/layouts/AppLayout.tsx:67` (`hidden: true`). Sigue en `ROUTE_ACCESS` (`frontend/src/app/access/access.ts:23`) sin ruta |
| Tests | `frontend/CLAUDE.md`, "Problemas conocidos" 1: "`npm test`: pasan todos" (08/11/2026) | En la corrida del 12/11/2026 falló 1 de 651 (H-02) |
| Comentario del cliente HTTP | `frontend/src/shared/api/http.ts:7` cita `docs/api contract v1.md` | Ese archivo no existe; el contrato está en `docs/Api-Contract/` |
| Reglas automáticas | `.claude/rules/*.md` | El propio `CLAUDE.md` raíz avisa que varias citan V3/V4. Son de backend; no se revisaron |
| Estado del front | `frontend/CLAUDE.md:7` | "Estado al 05/11/2026 (Sprint 4)"; el Sprint 5 (V6) figura como no programado. No se verificó contra Jira |
