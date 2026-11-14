# Traspaso — dónde quedó la auditoría y qué sigue

13/11/2026 · Luciano con Claude · rama `feat/auditoria-front` · **todo sin
commitear** (tandas 12 a 15). Rutas relativas a `frontend/`. Leer antes
`RESUMEN_GENERAL.md` y los informes 18 a 21 de esta carpeta. Para el front
manda `frontend/CLAUDE.md`, no el `CLAUDE.md` raíz.

## Cómo se trabaja (pedido de Luciano)

- Plan por tandas y OK de Luciano antes de programar cada una.
- No commitear ni pushear. No inventar endpoints ni campos. Si dos documentos
  se contradicen, decirlo. Si algo necesita una decisión, preguntar con una
  recomendación; no elegir solo.
- Después de cada tanda: `npm run lint`, `npx tsc -b`, `npx vitest run` (ya
  usa la mitad de los núcleos por configuración), y lo modificado mirado en el
  navegador con mocks (teléfono y 1366 px). Decir qué se verificó y qué no.
- Cada tanda, un informe nuevo (`23-…`, `24-…`) y actualizar
  `RESUMEN_GENERAL.md` y el `README.md` de esta carpeta. Los `.md` de esta
  carpeta van con fin de línea CRLF.
- Ya decidido, no reabrir: no se pregunta "¿descartar los cambios?" al cerrar
  un modal; las acciones de fila usan `aria-describedby`; un formulario no se
  cierra con clic afuera, una confirmación sin campos sí.

## Tarea en curso: las 5 diferencias de la tanda 15 (informe 21, sección 3)

Luciano pidió resolver las cinco, y para la 1 seguir el criterio de
"Registrar acto procesal" (deshabilitado + nota visible unida al botón).

**Hecho (sin tests actualizados todavía):**

- **1.** "Registrar acto interruptivo" va deshabilitado para quien no es el
  responsable y apunta a la nota de actos del encabezado
  (`src/features/cases/pages/CaseDetailPage.tsx`, `openInterruptive` ya no
  avisa). "Modificar" en la línea de vida va deshabilitado con una nota nueva
  arriba de la lista, "Solo el abogado responsable (…) modifica los actos
  procesales." (`CaseTimeline.tsx`: props `modifyBlockedNote` y
  `registerNoteId`; `.vz-timeline__note` en `src/styles/cases.css`).
- **2.** La nota "Solo el abogado responsable (…) registra actos." tiene id
  (`actNoteId`) y la usan como `aria-describedby` "Registrar acto procesal",
  "Registrar acto interruptivo" y "Registrar el primer acto".
- `npx tsc -b` limpio.

**Falta:**

1. **Actualizar los 2 tests que esperaban el aviso viejo** (hoy fallan, es lo
   esperado):
   - `tests/components/cases/CaseDetailPage.interruptiveAct.test.tsx`, "a
     quien no es el responsable le avisa y no abre el formulario" → que el
     botón esté deshabilitado y descrito por "Solo el abogado responsable
     (Malena Ríos) registra actos.".
   - `tests/components/proceedings/RegisterProceduralActPage.edit.test.tsx`,
     "quien no es el responsable recibe el aviso y no sale del detalle" → que
     "Modificar" esté deshabilitado y descrito por "Solo el abogado
     responsable (…) modifica los actos procesales.".
   - Sumar un test de que "Registrar acto procesal" queda descrito por su nota.
2. **3.** "Descargar" deshabilitado para el Administrador: el motivo está sólo
   en el `title` (`src/features/cases/components/CaseDocumentsCard.tsx:28`).
   Agregar una nota visible en la tarjeta, unida a esos botones con
   `aria-describedby` (patrón H-53). Test.
3. **4.** "Sólo" → "Solo" en todos los textos visibles: `CaseDocumentsCard.tsx:28`,
   `src/features/lawyers/components/LawyersTable.tsx:90`,
   `src/features/lawyers/pages/LawyersPage.tsx:190` y `:208`,
   `src/features/proceedings/components/ProceduralActForm.tsx:131`,
   `src/features/proceedings/pages/RegisterProceduralActPage.tsx:283`,
   `src/features/users/schemas/user.schema.ts:74`. Los comentarios no hace
   falta. Ajustar los tests que buscan esos textos (`grep -rln "Sólo" tests`:
   `disabledReason`, `ProceduralStatesPage`, `RegisterProceduralActPage`,
   `UsersPage`, `user.schema`; mirar cada uno, no todos son textos de la app).
4. **5.** "Sin acceso" repite la idea: sacar el `sub` del encabezado ("Tu
   perfil no tiene permiso para ver esta sección.") en
   `src/app/router/ForbiddenPage.tsx:20`. El título del panel se queda: lo
   buscan tres tests.
5. Verificar (lint, tsc, vitest, y en el navegador con `mrios` en la causa 4 y
   `supervision` en la causa 1: botones deshabilitados con su nota) y agregar
   una sección "Arreglos" al informe 21, más el `RESUMEN_GENERAL.md`.

## Lo que queda de la auditoría después

| Qué | Notas |
|---|---|
| **Tanda 14, segunda parte** (revisión a ojo) | Necesita el panel del navegador visible (estuvo oculto: sin capturas ni clics reales). Borde de los campos y flecha del selector a 1366 px; tablero "Estudio"; modales de modelos, abogado, usuario, acto interruptivo y "Marcar prescripta" en el teléfono; notas de botones deshabilitados en el teléfono; tabla en fichas a 1.280 px; el bloque de error con "Reintentar" |
| **Cursor en "Fuero"** | Diagnóstico en el informe 20, sección 5. Probar en Chrome real (Claude in Chrome no estuvo conectado). Los tests exigen que siga siendo `<input disabled>` |
| **Tanda 16: calendario H-50** | Mostrar la propuesta (maqueta, teclado, lector de pantalla, tests) antes de programar. Ojo: hoy los plazos del calendario son `<button>`, no enlaces (`DeadlineCalendar.tsx:98`) |
| **Tanda 17: documentación** | `frontend/CLAUDE.md` y `docs/Frontend-Architecture/SHARED.md` no mencionan `SearchSelect`, `usePageTitle`, `fieldIds`/`controlA11y`, la pila de modales, `dismissOnBackdrop`, la duración de los avisos, `LoadError`, `useStacked` (tablas en fichas), `casesKeys.mutation` ni `leftBehindErrors`. Regenerar `MATRIZ_CA.md` con `npm run ca-matrix`. Datos viejos listados en el plan inicial |
| **Tanda 18: con el backend levantado** | Avisar a Luciano para que lo levante. Sesión entre pestañas con dos usuarios; subir y bajar un modelo; expediente; medir los 60 s de timeout de archivos; con qué variables se hace el build que se despliega (H-24: el build local publicó los mocks porque `.env.local` tiene `VITE_USE_MOCKS=true`, y `public/mockServiceWorker.js` se copia siempre); si el backend ya tiene modificar y dar de baja calificaciones (hoy ocultos, `SHOW_ROW_ACTIONS = false`) |
| **Decisiones pendientes (preguntar una por una, con recomendación)** | H-10 (permisos con tablas propias y no con `permissions` del backend); H-16 (`react-hook-form` sin uso: ¿se saca?); H-09 (un 403 cualquiera renueva la sesión); H-12 (páginas de 500-600 líneas); unir las notas "Solo el abogado responsable (…)" del detalle (ahora son cuatro con la de la línea de vida); escribir en el contrato el fin de mes de la prescripción (proponer dónde y cómo, no editar sin acuerdo); H-15 (el `CLAUDE.md` raíz dice V5 y el del front V6); `pages.test.ts:13` al límite cuando corre solo (proponer darle un tiempo propio) |
| **Lista para NVDA** | Al final: qué escuchar en login, alta de causa y registro de acto, para que lo pruebe Luciano |

## Datos útiles

- Usuarios de prueba y contraseñas: `src/shared/mocks/README.md`.
- Para forzar errores o demoras en el navegador: `configureMocks` de
  `/src/shared/mocks/browser.ts`. Después de una recarga en caliente puede
  haber dos copias de un módulo (`?t=`): reiniciar el servidor de desarrollo.
- En los tests, `console.log` de un test que pasa no se ve; usar
  `process.stdout.write`.
