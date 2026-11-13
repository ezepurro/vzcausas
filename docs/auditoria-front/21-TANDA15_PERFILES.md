# Tanda 15 — los tres perfiles contra la tabla de permisos

13/11/2026 · Luciano con Claude · rama `feat/auditoria-front`. Rutas relativas
a `frontend/`. El recorrido (secciones 1 a 4) no tocó código; las cinco
diferencias que encontró se resolvieron después, el mismo día: ver
[Arreglos](#arreglos).

Se recorrieron `gestion` (Secretaría), `mrios` (Abogado) y `supervision`
(Administrador sin ficha de abogado, que no se había recorrido en ninguna
tanda) pantalla por pantalla, con mocks, a 1366 px, contra las dos tablas del
contrato vigente para el front: "Operación de la causa" y "Permisos por
perfil" (`docs/Api-Contract/API_CONTRACT_V6.md:9802` y `:9840`). El panel del
navegador estaba oculto: se leyó el DOM (qué botones hay, cuáles están
deshabilitados, qué notas los explican) y se tocaron por JavaScript los que
hacía falta.

## En pocas líneas

- **Ningún perfil puede algo que el contrato no le da, ni deja de poder algo
  que le da**, en lo que el front tiene programado.
- Hay cinco diferencias de forma, ninguna de permisos (sección 3). Una es una
  decisión del equipo y cuatro son arreglos chicos. Luciano pidió resolver las
  cinco: están en [Arreglos](#arreglos).
- Lo de V6 que el front todavía no programó (Sprint 5) se lista aparte
  (sección 4).

## 1. Qué ve cada perfil

| | `gestion` (Secretaría) | `mrios` (Abogado) | `supervision` (Administrador) | Contrato |
|---|---|---|---|---|
| Entrada | Causas | Inicio, "Mi día" | Inicio, "Estudio" | Tablero del abogado: Abogado; del administrador: Administrador. Sin tablero, Causas (CA-41.13) |
| Rail | Causas, Clientes, Herramientas, Abogados, Estados y plazos, Calificaciones legales | + Inicio, Modelos | + Inicio, Modelos, Usuarios | Modelos: Administrador y Abogado. Usuarios: Administrador |
| Usuarios, Modelos, Inicio por URL | "Sin acceso" | Usuarios: "Sin acceso" | — | ✓ |
| Usuarios | — | — | Registrar, Modificar, Eliminar | Administrador ✓ |
| Abogados | Ve la lista; "Registrar abogado" y "Modificar" deshabilitados, con la nota "Sólo el Administrador registra y modifica abogados." | Ídem | Registrar y Modificar | Consultar: los tres. Registrar y modificar: Administrador ✓ |
| Clientes | Registrar | Registrar | Registrar | Los tres ✓ |
| Estados y plazos | Registrar, Modificar, Eliminar | Ídem | Ídem | Los tres ✓ |
| Calificaciones legales | Registrar (Modificar y Eliminar ocultos para todos, ver la sección 4) | Ídem | Ídem | Los tres |
| Modelos | — | Registrar | Registrar | Administrador y Abogado ✓ |
| Causas: registrar | Sí | Sí | Sí | Los tres ✓ |

## 2. El detalle de una causa

Causas usadas: la 1 (de `mrios`, penal, con carpeta y 12 documentos), la 17
(de `mrios`), la 4 (de `fvazquez`, penal, sin carpeta), la 22 (de `lortega`,
amparo, carpeta en error) y la 23 (de `mferreyra`, penal, carpeta pendiente).

| Operación | `gestion` | `mrios` en la suya | `mrios` en una ajena | `supervision` | Contrato (`:9802`) |
|---|---|---|---|---|---|
| Consultar, línea de vida, documentos | Sí | Sí | Sí | Sí | Los cuatro ✓ |
| Descargar un documento que no es expediente | Sí | Sí | Sí | **No** (sólo el expediente) | Administrador: — ✓ (D-103) |
| Generar expediente | Sí | Sí | Sí | Sí | Los cuatro ✓ |
| Modificar causa, Dar de baja | Sí | Sí | Deshabilitado, con nota | Sí | Otro abogado: — ✓ |
| Crear o reintentar la carpeta | Sí | Sí | Deshabilitado | Sí | Otro abogado: — ✓ |
| Marcar prescripta (la causa o una calificación) | No se ve | Sí | Deshabilitado, con nota | Sí | Secretaría: —; otro abogado: — ✓ |
| Registrar acto procesal | Deshabilitado, con nota | Sí | Deshabilitado, con nota | Deshabilitado, con nota | Sólo el responsable ✓ |
| `/causas/:id/acto` | "Sólo el abogado responsable registra actos procesales", sin formulario | Formulario | Ídem `gestion` | Ídem `gestion` | ✓ |
| Registrar acto interruptivo | Habilitado; al tocarlo, aviso | Sí | Habilitado; aviso | Habilitado; aviso | Sólo el responsable. Ver la diferencia 1 |
| Modificar un acto (línea de vida) | Habilitado; aviso | Sí | Habilitado; aviso | Habilitado; aviso | Sólo el responsable. Ver la diferencia 1 |

## 3. Diferencias (ninguna de permisos)

| # | Qué | Dónde | Propuesta |
|---|---|---|---|
| 1 | "Registrar acto interruptivo" y "Modificar" en un acto van **habilitados** para quien no es el responsable y, al tocarlos, un aviso dice que no puede ("Solo el abogado responsable de la causa (Malena Ríos) registra actos interruptivos."). "Registrar acto procesal", en cambio, va **deshabilitado con una nota**. Dos criterios para lo mismo. Está documentado así (HU31, "como el prototipo", `frontend/CLAUDE.md`) | `src/features/cases/pages/CaseDetailPage.tsx:191` (modificar un acto) y `:203` (acto interruptivo) | **Decisión del equipo.** Recomendación: deshabilitarlos con la nota que ya existe, como "Registrar acto procesal" |
| 2 | La nota "Solo el abogado responsable (…) registra actos." **se ve, pero no está unida** al botón deshabilitado: no tiene `aria-describedby` ni `title`. Las otras dos notas del detalle (H-53, tanda 11) sí lo están | `src/features/cases/pages/CaseDetailPage.tsx:372` | Darle un id y unirla al botón, como las otras dos |
| 3 | "Descargar" deshabilitado para el Administrador (11 documentos de la causa 1) explica el motivo **sólo en el `title`** ("Sólo el Abogado y la Secretaría descargan los documentos que no son expedientes."): no se ve en el teléfono ni con el teclado. Es el caso que H-53 resolvió en Abogados y en las acciones del detalle | `src/features/cases/components/CaseDocumentsCard.tsx:28` | Una nota visible en la tarjeta, unida a los botones |
| 4 | "Solo" y "Sólo" mezclados: el detalle de causa dice "Solo el abogado responsable…"; `/causas/:id/acto`, Abogados y la descarga dicen "Sólo…" | `src/features/proceedings/pages/RegisterProceduralActPage.tsx:283`, `src/features/lawyers/pages/LawyersPage.tsx`, `CaseDocumentsCard.tsx:28` | Elegir una. La RAE recomienda "solo" sin tilde; las notas de la tanda 11 ya lo usan así |
| 5 | "Sin acceso" repite la idea: el encabezado dice "Tu perfil no tiene permiso para ver esta sección." y el panel, debajo, "No tenés permiso para ver esta sección" | `src/app/router/ForbiddenPage.tsx:20` | Dejar una sola (de forma; puede ir con la revisión visual) |

## 4. Lo que el front no tiene programado

No son diferencias con lo implementado: son funciones que el contrato da y el
front todavía no dibuja.

| Qué | Contrato | En el front |
|---|---|---|
| Modificar y dar de baja clientes (HU10, HU11), dar de baja abogados (HU15), anular un acto (HU29), modificar y dar de baja modelos (HU36, HU37), el reporte mensual (HU43) | V6 (Sprint 5) | Sin programar (`frontend/CLAUDE.md`, "Sprint 5 — qué trae V6"). `/reportes` da "no encontrado" a cualquiera, y su ítem del rail está oculto |
| Modificar y dar de baja calificaciones legales (HU49, HU50) | Los tres perfiles, desde V5 | Programado y **oculto para todos** (`SHOW_ROW_ACTIONS = false`, `src/features/legal-params/pages/LegalQualificationsPage.tsx:44`), por pedido del equipo del 18/10/2026: el backend no tenía los endpoints. **Revisar con el backend** si ya los tiene (va con la tanda 18) |

## Verificación

| Qué | Resultado |
|---|---|
| Los tres perfiles, con mocks, a 1366 px | Recorridos pantalla por pantalla, leyendo el DOM. "Registrar acto interruptivo" se tocó como `gestion` (aviso, sin diálogo). La descarga del Administrador, documento por documento |
| Código | Sin cambios en esta tanda |

**Sin verificar:**

- Con el backend real: el `403` que responde cada endpoint a cada perfil. Acá
  se miró lo que el front ofrece, no lo que el servidor autoriza.
- Perfiles con varios roles (`fvazquez`, Administrador y Abogado; `sledesma`,
  Secretaría y Abogado): no estaban en el pedido. La regla "alcanza con uno" la
  cubren los tests de `tests/unit/app/actionAccess.test.ts`.
- A ojo: el panel estaba oculto.

## Arreglos

13/11/2026 · empezados por Luciano con Claude (diferencias 1 y 2, commit
`e90fe65`) y terminados por Facundo con Claude (sus tests y las diferencias 3,
4 y 5, **sin commitear**).

| # | Qué se hizo | Dónde |
|---|---|---|
| 1 | "Registrar acto interruptivo" va **deshabilitado** para quien no es el responsable y lo explica la nota de los actos del encabezado. "Modificar" de cada acto va deshabilitado con una nota nueva arriba de la línea de vida: "Solo el abogado responsable (…) modifica los actos procesales.". Ya no hay aviso al tocarlos. Es el criterio de "Registrar acto procesal" (decisión de Luciano) | `src/features/cases/pages/CaseDetailPage.tsx` (`modifyBlockedNote`, `openInterruptive`), `src/features/cases/components/CaseTimeline.tsx` (`modifyBlockedNote`, `registerNoteId`), `.vz-timeline__note` en `src/styles/cases.css` |
| 2 | La nota "Solo el abogado responsable (…) registra actos." tiene id y la llevan como `aria-describedby` "Registrar acto procesal", "Registrar acto interruptivo" y "Registrar el primer acto" | `CaseDetailPage.tsx` (`actNoteId`) |
| 3 | "Descargar" deshabilitado: el motivo va en una nota a la vista arriba de la lista, unida a cada botón bloqueado con `aria-describedby`. Aparece solo si hay algún documento que el usuario no puede bajar; el expediente, que sí puede, queda sin nota. El `title` se conserva, como en H-53 | `src/features/cases/components/CaseDocumentsCard.tsx` (`canDownload`, `forbiddenNoteId`), `.vz-docs__reason` en `src/styles/cases.css` |
| 4 | "Sólo" → "Solo" en todos los textos de pantalla (los comentarios no se tocaron). Además de los siete del traspaso, dos en minúscula que tenían la misma mezcla: "queda guardado solo en esta causa" y "usa solo la parte de adelante" | `CaseDocumentsCard.tsx`, `src/features/lawyers/components/LawyersTable.tsx`, `src/features/lawyers/pages/LawyersPage.tsx`, `src/features/proceedings/components/ProceduralActForm.tsx`, `src/features/proceedings/pages/RegisterProceduralActPage.tsx`, `src/features/users/schemas/user.schema.ts`, `src/features/legal-params/components/LegalQualificationFormModal.tsx` |
| 5 | "Sin acceso" ya no repite la idea: se sacó la bajada del encabezado y queda el panel ("No tenés permiso para ver esta sección") | `src/app/router/ForbiddenPage.tsx` |

**Tests.** Los dos que esperaban el aviso viejo ahora piden el botón
deshabilitado y descrito por su nota
(`tests/components/cases/CaseDetailPage.interruptiveAct.test.tsx`,
`tests/components/proceedings/RegisterProceduralActPage.edit.test.tsx`). Tres
nuevos en `tests/components/cases/disabledReason.test.tsx`: la nota de los
actos unida a sus dos botones, la de "Descargar" para el Administrador y que a
quien descarga no se le muestra. Los textos con "Solo" se ajustaron en
`disabledReason.test.tsx`, `RegisterProceduralActPage.test.tsx` y
`tests/unit/users/user.schema.test.ts`.

**Documentación.** `frontend/CLAUDE.md`, fila de HU31: decía que el botón "le
avisa con un toast, como el prototipo".

### Verificación de los arreglos

| Qué | Resultado |
|---|---|
| `npm run lint` | 0 errores; el warning conocido de `src/shared/components/ui/Icon.tsx:2` |
| `npx tsc -b` | Limpio |
| `npx vitest run` | 774 de 774 (121 archivos), en las dos últimas corridas; ver abajo las fallas intermitentes |
| Navegador, con mocks, a 1366 px y a 375 px | `mrios` en la causa 4: ocho botones deshabilitados, cada uno descrito por su nota (leído en el DOM y a ojo); "Crear carpeta" lleva el motivo en su nombre, como antes. `supervision` en la causa 1: la nota de "Descargar" arriba de la lista, 11 botones bloqueados descritos por ella y el del expediente habilitado y sin nota. `gestion`: "Sin acceso" con una sola frase, y Abogados con "Solo" en la nota y en los dos `title`. Sin scroll horizontal en el teléfono |

**Fallas intermitentes al correr la suite entera.** De siete corridas, tres fallaron en tests que esta vuelta no tocó: `tests/unit/app/pages.test.ts` (tiempo de espera de 5 s) y "filtra con el buscador" de `tests/components/users/UsersPage.test.tsx`. Solos pasan, y sobre el commit base la suite da lo esperado. Hipótesis, sin confirmar: Vitest corre primero los archivos que fallaron la vez anterior, en el arranque en frío (H-55), y un test al límite vuelve a fallar; la primera de esas corridas compitió con el servidor de desarrollo. Las dos últimas corridas dieron 774 de 774. Refuerza la propuesta pendiente de darle un tiempo propio a `pages.test.ts`.

**Sin verificar:** los E2E y el build no se corrieron en esta vuelta; lector de
pantalla real; `/causas/:id/acto` y el error de usuario con "Solo" se
comprobaron por sus tests, no en el navegador.

**Visto al pasar, sin tocar:**

- En la fila "Sobre la causa", "Registrar acto interruptivo" deshabilitado
  queda lejos de su nota (está arriba, bajo "Registrar acto procesal") y pegado
  a la de "Marcar prescripta". Va con la decisión pendiente de unir las notas
  "Solo el abogado responsable (…)" del detalle, que ahora son cuatro.
- "Sin acceso" no pone título de pestaña: queda "VZ Causas" (`ForbiddenPage`
  no usa `usePageTitle`).
