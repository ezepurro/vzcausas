# Traspaso 2 — dónde quedó la auditoría y qué sigue

13/11/2026 · Facundo con Claude · rama `feat/auditoria-front`. Reemplaza al
[22](22-TRASPASO.md) como punto de partida. Rutas relativas a `frontend/`.

## Estado

- **Commiteado** (`e90fe65`): tandas 12 a 15 (el recorrido de perfiles) y lo
  "Hecho" de las diferencias 1 y 2.
- **Sin commitear**, en el árbol de trabajo:
  - Arreglos de la tanda 15: tests de las diferencias 1 y 2, y diferencias 3,
    4 y 5 ([21](21-TANDA15_PERFILES.md), "Arreglos"). Código y tests.
  - Tanda 14, segunda parte: sólo el informe ([23](23-TANDA14_VISUAL_PARTE2.md)).
  - Tanda 17: sólo documentación ([24](24-TANDA17_DOCUMENTACION.md)).
  - Tanda 16: el calendario, H-50 ([26](26-TANDA16_CALENDARIO_H50.md)). Código
    y tests.
- Base al cerrar: `npm run lint` con su warning conocido
  (`src/shared/components/ui/Icon.tsx:2`), `npx tsc -b` limpio, `npx vitest
  run` 782 de 782 (122 archivos), en una corrida. **Los E2E y el build no se corrieron** después de los
  arreglos de la tanda 15 ni de la tanda 16.

## Lo que queda

| Qué | Notas |
|---|---|
| **H-56: flecha del `<select>`, lo que faltó mirar** | Arreglado ([23](23-TANDA14_VISUAL_PARTE2.md), "Arreglo de H-56") y visto en "Fuero" a 1366 px. Falta mirar que la flecha siga girando al abrir, el `<select>` deshabilitado y en error, y los filtros de Causas |
| **H-57: "Sin resultados" mientras carga o falla** | El pie del listado (`Pagination`). Visto en Clientes; revisar los otros siete listados. Decidir: no dibujar el pie sin datos, o que no diga nada. Recomendación de la sesión del 13/11: no dibujarlo mientras carga o falla. Facundo lo dejó para Luciano |
| **Cursor en "Fuero"** | Diagnóstico en el [20](20-TANDA14_VISUAL_PARTE1.md), sección 5. Necesita Chrome real. Los tests exigen que siga siendo `<input disabled>` |
| **Calendario H-50: lo que faltó mirar** | Está programado ([26](26-TANDA16_CALENDARIO_H50.md)). Falta ver en el navegador "+N más" con un abogado que tenga tres plazos el mismo día, y el anillo de foco del título de la lista en un teléfono real |
| **E2E y build** | `npm run test:e2e` y `npm run build`: no se corrieron desde la primera parte de la tanda 14 |
| **Tanda 18: con el backend levantado** | Avisar para que lo levanten. Sesión entre pestañas con dos usuarios; subir y bajar un modelo; expediente; medir los 60 s de timeout de archivos; con qué variables se hace el build que se despliega (H-24); si el backend ya tiene modificar y dar de baja calificaciones (`SHOW_ROW_ACTIONS = false`, `src/features/legal-params/pages/LegalQualificationsPage.tsx:44`) |
| **Decisiones pendientes** (una por una, con recomendación) | H-10, H-16, H-09, H-12; unir las notas "Solo el abogado responsable (…)" del detalle (son cuatro, y "Registrar acto interruptivo" queda lejos de la suya); el fin de mes de la prescripción en el contrato; H-15 (V5 en el `CLAUDE.md` raíz, V6 en el del front); darle un tiempo propio a `tests/unit/app/pages.test.ts`; las fichas de Causas a 1.280 px (dos causas y media por pantalla) |
| **Documentación que faltó** | `TESTING.md` §11 no lista los tests de la auditoría; `src/shared/api/http.ts:7` cita un archivo que no existe; "Sin acceso" no pone título de pestaña (`src/app/router/ForbiddenPage.tsx`) |
| **Lista para NVDA** | Al final: qué escuchar en login, alta de causa y registro de acto |

## Cosas que conviene saber

- **La suite entera tarda unos 3 minutos.** Mientras se trabaja, correr sólo
  los archivos tocados (`npx vitest run tests/…`) y la suite entera una vez al
  cerrar la tanda.
- **Fallas intermitentes de la suite entera**: a veces fallan por tiempo
  `tests/unit/app/pages.test.ts` o "filtra con el buscador" de
  `tests/components/users/UsersPage.test.tsx`. Solos pasan. No correr la suite
  con el servidor de desarrollo levantado. Detalle en el
  [21](21-TANDA15_PERFILES.md), "Arreglos".
- Para forzar errores en el navegador: `const m = await
  import('/src/shared/mocks/browser.ts'); m.configureMocks({ forceFailure:
  500, latencyMs: 2500 })`, y navegar por el rail (sin recargar). Volver con
  `forceFailure: null`.
- Usuarios de prueba: `src/shared/mocks/README.md`.
- Ya decidido, no reabrir: no se pregunta "¿descartar los cambios?"; un
  formulario no se cierra con clic afuera y una confirmación sí; las acciones
  de fila usan `aria-describedby`; "Solo" sin tilde en los textos de pantalla;
  un botón que el usuario no puede usar va deshabilitado con una nota a la
  vista, no habilitado con aviso.

## Prompt para seguir

Copiar tal cual en una sesión nueva de Claude:

```text
Estoy en la rama feat/auditoria-front del repo vzcausas y sigo la auditoría del
frontend. Hay cambios sin commitear en el árbol de trabajo (arreglos de la
tanda 15 e informes 23 a 26, y el calendario H-50).

ANTES DE TOCAR NADA
1. Leé enteros docs/auditoria-front/25-TRASPASO_2.md (estado y lo que falta) y
   docs/auditoria-front/RESUMEN_GENERAL.md. Para contexto, los informes 20, 21,
   23, 24 y 26 de esa carpeta. Para el front manda frontend/CLAUDE.md, no el
   CLAUDE.md raíz.
2. Corré la base en frontend/ y decime si difiere de lo esperado: npm run lint
   (0 errores, 1 warning conocido en Icon.tsx:2), npx tsc -b (limpio) y
   npx vitest run UNA sola vez (782 de 782; si falla por tiempo pages.test.ts o
   el buscador de UsersPage.test.tsx, corré esos dos archivos solos y seguí).

CÓMO TRABAJAR
- Proponeme un plan y esperá mi OK antes de programar cada tanda.
- No commitees ni pushees. No inventes endpoints ni campos. Si dos documentos se
  contradicen, decímelo. Si algo necesita una decisión, preguntame una por una,
  con tu recomendación; no elijas vos.
- Tests: mientras trabajás, sólo los archivos que tocás. La suite entera, una
  vez al cerrar cada tanda, sin el servidor de desarrollo levantado.
- Después de cada tanda: lint, tsc, vitest, y lo modificado mirado en el
  navegador con mocks (teléfono y 1366 px). Decí qué verificaste y qué no.
- Registrá cada tanda en un informe nuevo (27-..., 28-...) en
  docs/auditoria-front/ (fin de línea CRLF) y actualizá RESUMEN_GENERAL.md y el
  README de esa carpeta.

EN ESTE ORDEN (detalle en 25-TRASPASO_2.md, "Lo que queda"):
1. H-57 ("Sin resultados" mientras carga o falla): es chico; mostrame el plan.
   Y mirá lo que faltó de H-56.
2. npm run test:e2e y npm run build, que no se corren desde la tanda 14, y lo
   que faltó mirar del calendario H-50.
3. El cursor en "Fuero", si tenés Chrome real a mano.
4. Lo que necesita el backend levantado: avisame cuando haga falta.
5. Las decisiones pendientes, una por una.
6. La lista para probar con NVDA.

Respondeme primero con el resultado de la base y el plan del punto 1. No
modifiques archivos hasta que lo acordemos.
```
