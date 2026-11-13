# Plan B · Tanda 5 y cierre de lo que no depende del plan A

12/11/2026 · rama `feat/auditoria-front` · cambios en el árbol de trabajo,
**sin commitear**, encima de las tandas [1](08-TANDA1_RESULTADOS.md) y
[2](09-TANDA2_RESULTADOS.md). Rutas relativas a `frontend/`.

Sólo archivos del plan B. Ningún texto visible cambió y ningún color cambió
de valor.

## Qué cambió

| Hallazgo | Solución | Archivos |
|---|---|---|
| H-26 · El login angosto no mostraba la marca | Debajo de 860 px la columna institucional ya no se esconde entera: queda una franja oscura arriba con el logo y "Vázquez & Zárate · Staff de Abogados"; la cita y el monograma de fondo se van. Sin tocar `LoginPage.tsx` ni `LoginAside.tsx` | `src/styles/login.css` |
| H-23 · Fuentes por `@import` | `preconnect` a los dos dominios y `<link rel="stylesheet">` en `index.html`; se sacó el `@import` | `index.html`, `src/styles/index.css` |
| H-49 · Colores escritos a mano | 26 valores hex pasaron a 13 tokens nuevos con **el mismo valor** (`--vz-on-primary`, `--vz-on-dark-{danger,warn,ok}`, `--vz-mark-{danger,ok,danger-soft,warn-soft}`, `--vz-danger-wash`, `--vz-fuero-{criminal,administrative,amparo}`); el blanco del visor de carátula usa `--vz-rail-fg-on` y `--vz-surface`. Fuera de `tokens.css` no queda ningún hex | `src/styles/tokens.css`, `dashboard.css`, `controls.css`, `table.css`, `documents.css`, `cases.css` |

T-30 (dejar los cortes de pantalla listados): **ya estaba hecho**. Están en
el comentario de `src/styles/tokens.css` y en
`docs/Frontend-Architecture/SHARED.md`, "Breakpoints reales". No se agregó
ningún corte en las tres tandas.

Quedan a mano las transparencias de blanco y negro (`rgba(255, 255, 255,
.12)` y parecidas): son velos, no colores, y `tokens.css` ahora lo dice.

## Revisión que faltaba

| Qué | Cómo | Resultado |
|---|---|---|
| Perfil `gestion` (Secretaría), 390 px, 13 rutas | Script | Rail con sus 6 secciones; "Sin acceso" en Inicio, Modelos y Usuarios; sin desborde ni controles de menos de 32 px |
| Perfil `mrios` (Abogado), 390 y 1366 px, 9 rutas | Script | Sin desborde. Los chips de "Mis plazos abiertos" deslizan 210 px (arreglo de la tanda 1) |
| 9 modales a 390 px: cliente (desde Clientes y desde el alta), "Modificar causa", "Dar de baja la causa", estado procesal (alta, modificación, baja), calificación (desde su pantalla y desde el alta) | Script | Todos entran en la pantalla, el pie queda visible, el cuerpo scrollea ("Modificar causa": 676 de 1.571 px), nada se sale de costado, el foco entra y Escape cierra |
| Login a 390 y 320×568 px | Medido | Franja de 74 px con la marca; el botón "Ingresar" queda dentro de la pantalla sin scroll |

Hallazgos nuevos de esta revisión, **sin corregir**:

| Id | Gravedad | Qué | Dónde | De quién |
|---|---|---|---|---|
| H-53 | BAJO | El motivo de un botón deshabilitado va sólo en `title`: no se ve en el teléfono ni se alcanza con teclado (un botón deshabilitado no toma foco). A la Secretaría, Abogados le muestra "Registrar abogado" y diez "Modificar" deshabilitados sin explicación a la vista | `src/features/lawyers/pages/LawyersPage.tsx`, `components/LawyersTable.tsx`; el patrón está en `frontend/CLAUDE.md`, "Acceso por perfil" | Decisión de equipo |
| H-54 | BAJO | El campo de fecha de una calificación mide 34 px en "Modificar causa" en el teléfono | `src/features/cases/components/LegalQualificationPicker.tsx` | Plan A |

## Verificación

| Qué | Resultado |
|---|---|
| `npm run lint` | 0 errores; el warning conocido de `Icon.tsx:2` |
| `npx tsc -b` | Limpio |
| `npx vitest run` | **676 de 676** (105 archivos) |
| `npm run build` | Sin errores. `index-*.js` 425 kB (136 comprimido), igual que en la ola 1 |
| `npm run test:e2e` | **9 de 9** |
| Fuentes | `document.fonts.check('14px Figtree')` da `true` con el `@import` sacado |

**Sin verificar:**

- **Capturas de esta tanda**: el navegador de prueba dejó de sacar capturas
  (la ventana quedó detrás de otra), así que el login angosto y los colores
  se comprobaron midiendo el DOM, no mirando. Falta **mirar** el login a 390
  y a 768 px, y el tablero "Estudio" (cartera por fuero y carga del equipo,
  que es donde están los colores movidos a tokens).
- Perfil `supervision`.
- Lector de pantalla real.
- Estados de error y de carga forzados, pantalla por pantalla.
- Los modales de modelos, abogado, usuario (modificar y eliminar), acto
  interruptivo, "Marcar prescripta", vista previa de carátula y cerrar sesión
  en el teléfono.
- El build con las variables de despliegue (este usó `.env.local`).

## Estado del plan B

| Tanda | Estado |
|---|---|
| 1 · Accesibilidad en CSS y `ui/` | Hecha |
| 2 · Tabla de Causas y avisos | Hecha, menos el `aria-label` de las acciones de fila (decisión) |
| 3 · Rail, menú del teléfono, campana | **Frenada**: archivos compartidos y decisión sobre la campana |
| 4 · Formularios de modal | **Frenada**: `FormModal.tsx` es compartido |
| 5 · Login, fuentes, colores | Hecha, menos el título de pestaña (T-33), que toca las páginas del plan A |

Lo que se le pide a Luciano está junto en
[11-PARA_LUCIANO.md](11-PARA_LUCIANO.md).
