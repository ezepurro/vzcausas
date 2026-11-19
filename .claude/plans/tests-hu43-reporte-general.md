# Plan de tests — HU-43 Reporte mensual (con causas huérfanas)

`GET /api/v1/reports/monthly` y `GET /api/v1/reports/monthly/file`
(`API_CONTRACT_V6.md` §3.13, "Datos del reporte", §4 "Causa huérfana" y "Proceso automático diario").
Decisiones D-117, D-129, D-135, D-137, D-141, D-145, D-146 (`DECISIONES.md`). Tareas T2.1 a T2.7 de
`docs/Backend-Architecture/IMPLEMENTACION_CAUSAS_HUERFANAS.md`.

**Escrito desde el contrato, antes del código.** Si un test de este plan falla contra el código, el
código está mal (o el contrato), no el test. El contrato no numera criterios de aceptación de HU43
(solo "CA-43.5", que D-145 revisa): los criterios se numeran acá, `R-1` a `R-26`, y cada uno cita su
fuente.

## Datos fijos

- Reloj fijo de integración: `withFixedClock`, hoy es el **6/10/2026**, así que el mes en curso es
  `2026-10` y el último cerrado es `2026-09`.
- `availableFrom` de los specs de integración: `2026-08` (se fija reemplazando el token
  `MONTHLY_REPORT_AVAILABLE_FROM`; el servidor lo lee de la variable de entorno del mismo nombre).
- Fuero penal con calificación de 120 meses (`legalQualification`) para las alertas de prescripción.
- Abogados: **Ríos** y **Zárate** vigentes; **Gaga** vigente con solo causas terminales; **Baja** dado de
  baja (`active: false`) después de la foto de septiembre.

## Respuestas que el contrato fija (textuales)

| Situación | HTTP | `code` | `message` | `details` |
|---|---|---|---|---|
| `period` o `disposition` mal formados | 400 | `INVALID_REQUEST` | "Parámetros de query inválidos." | `{ period: "Debe tener el formato AAAA-MM." }` / `{ disposition: "Debe ser inline o attachment." }` (el texto de `disposition` es el de la carátula, `case.errors.ts`) |
| Sin token | 401 | `UNAUTHENTICATED` | "La autenticación es requerida." | `null` |
| No administrador | 403 | `FORBIDDEN` | "Se requiere el rol ADMINISTRATOR para realizar esta operación." | `null` |
| Período anterior a `availableFrom` o posterior al mes en curso | 404 | `MONTHLY_REPORT_NOT_FOUND` | "No hay reporte para ese período." | `null` |
| PDF | 200 | — | `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="Reporte_2026-08.pdf"` | — |

**Orden de los chequeos** (`flujo-hu-backend.md`): 401 → 400 de forma → 403 → 404. Un pedido rechazado
no escribe nada (ni siquiera la foto de un mes).

## CA → test

| # | Criterio (contrato) | Nivel | Dónde | Qué fija |
|---|---|---|---|---|
| R-1 | Período `AAAA-MM` válido: `2026-13`, `2026-8`, `agosto`, vacío → 400 (§3.13 "400") | Unitario | `report-period.vo.spec.ts` | `ReportPeriod.create` rechaza; `parse` devuelve `null`; `previous`, `lastDay`, `fromJanuary` |
| R-2 | Sin `period`: el último mes cerrado; si no hay ninguno, el mes en curso (§3.13 "Parámetros") | Unitario | `report-calendar.vo.spec.ts` | `defaultPeriod` con `availableFrom` anterior y con `availableFrom` = mes en curso |
| R-3 | Período anterior a `availableFrom` o futuro → 404 `MONTHLY_REPORT_NOT_FOUND` (§3.13 "Desde cuándo") | Unitario + integración | `report-calendar.vo.spec.ts`, `monthly-report.int.spec.ts` | Textos exactos; el mes en curso es válido; el siguiente no |
| R-4 | Causas del reporte: vigentes **con `startDate`** (D-129); las dadas de baja no cuentan | Unitario + integración | `report-case.spec.ts` | Una causa sin `startDate` no está en el cálculo (la consulta la excluye: integración); una causa dada de baja tampoco |
| R-5 | Ingresada en el mes: su `startDate` cae en el mes (§3.13 "Qué cuenta") | Unitario | `report-case.spec.ts` | Primer y último día del mes; el día anterior y el siguiente no |
| R-6 | Activa a una fecha: `startDate` ≤ fecha y estado no terminal, con el estado del acto vigente más reciente con `actDate` ≤ fecha (D-14), o "Prescripta" si ya estaba declarada | Unitario | `report-case.spec.ts` | Un acto posterior a la fecha no cuenta; un acto anulado no cuenta; el desempate por `id`; estado a mano no es terminal; `prescriptionDate` ≤ fecha es terminal |
| R-7 | Archivada en el mes: pasó a cualquier estado terminal dentro del mes, en la fecha del acto (o la de la declaración de "Prescripta") | Unitario | `report-case.spec.ts` | Archivada por acto en el mes; archivada el mes anterior no; "Prescripta" en el mes sí; ingresada y archivada en el mismo mes sí |
| R-8 | Al cierre = al inicio + ingresadas − archivadas, **por fuero y en total** (§3.13 "Datos del reporte") | Unitario | `monthly-report-calculation.spec.ts` | La identidad con un conjunto de causas mixto, por fuero |
| R-9 | `byJurisdiction`: siempre los tres fueros en el orden de `Jurisdiction`; `percentage` redondeado; `0` sin causas activas | Unitario | `monthly-report-calculation.spec.ts` | Orden, redondeo, ceros |
| R-10 | `lawyers`: un renglón por **abogado vigente**, tenga o no causas; ordenados por `total` desc, luego `lastName`, `firstName`; `total` = suma de los tres fueros | Unitario | `monthly-report-calculation.spec.ts` | Abogado sin causas con ceros; orden; un abogado no vigente no figura |
| R-11 | **D-145** `unassigned`: las causas activas sin responsable, por fuero y total; siempre viene, con ceros; no entra en `lawyers` | Unitario + integración | `monthly-report-calculation.spec.ts`, `monthly-report.int.spec.ts` | Forma exacta `{criminal, administrative, amparo, total}`; con ceros sin huérfanas |
| R-12 | **D-145** `summary.activeCases` = suma de los `total` de `lawyers` + `unassigned.total` | Unitario + integración | ídem | La suma |
| R-13 | **D-145** `averagePerLawyer` = (`activeCases` − `unassigned.total`) / abogados de `lawyers`, un decimal; `0` sin abogados; `min`/`maxPerLawyer` salen de `lawyers` (`null` sin abogados) y no ven las huérfanas | Unitario | `monthly-report-calculation.spec.ts` | Con huérfanas el promedio no sube; sin abogados `0`/`null`/`null` |
| R-14 | **D-145** Las huérfanas **no son archivadas**: siguen activas y no tocan `archived` | Unitario | `monthly-report-calculation.spec.ts` | Una huérfana activa no suma a `archived` |
| R-15 | `differenceFromAverage` = `total` − promedio, un decimal (PDF) | Unitario | `monthly-report-calculation.spec.ts` | Los valores del ejemplo del contrato (2,9 y −1,1 con promedio 14,1) |
| R-16 | Prescripción: causas penales activas al cierre con `prescription` calculada **a la fecha de corte** con los actos interruptivos y declaraciones hasta esa fecha; cuatro tramos siempre, en orden; `percentage` del tramo sobre `prescription.cases`; las con plazo cumplido van a `FROM_90` | Unitario | `report-case.spec.ts`, `monthly-report-calculation.spec.ts` | Una declaración posterior a la fecha no cuenta; un acto interruptivo posterior no reinicia; un plazo cumplido va a FROM_90 (los bordes exactos 49/50/69/70/89/90 no llevan test propio: dependen de días de calendario, ver Lo que no lleva test) |
| R-17 | `prescription.alerts`: las de 70 % o más, de mayor a menor `elapsedPercentage`; **D-145** una huérfana figura con `responsibleLawyer: null` | Unitario + integración | `monthly-report-calculation.spec.ts`, `monthly-report.int.spec.ts` | Orden, forma exacta de cada alerta, huérfana con `null` |
| R-18 | `deadlines`: los plazos de actos procesales (no el del acto lesivo, D-135) con `dueDate` en el mes, clasificados por el acto siguiente: `metOnTime`, `metOnLastDay`, `overdue`, `pending`; `total` = suma; `interruptiveActs` aparte | Unitario | `report-case.spec.ts`, `monthly-report-calculation.spec.ts` | Cada una de las cuatro salidas; mes cerrado: `pending` vale 0; mes en curso: vence hoy es `pending`; un acto sin plazo no cuenta; vencimiento manual gana al calculado |
| R-19 | **Mes cerrado → foto.** Se lee de `monthly_report_snapshots`; si no hay, se toma al pedirlo y se guarda; desde ahí es la misma | Unitario (fakes) + integración | `get-monthly-report.use-case.spec.ts`, `monthly-report.int.spec.ts` | Sin foto: se calcula y se guarda **una** fila; con foto: no se recalcula (aunque la base cambie); el mes en curso **no se guarda** |
| R-20 | La foto no cambia: corregir un acto o dar de baja una causa después no altera el mes cerrado | Integración | `monthly-report.int.spec.ts` | Pedir, dar de baja una causa, volver a pedir: mismo cuerpo; el mes en curso sí cambia |
| R-21 | **D-145 / S9** El abogado dado de baja no figura en la foto del mes de su baja y sí en las anteriores, con su nombre de entonces | Integración | `monthly-report.int.spec.ts` | Foto de septiembre con el abogado vigente; se lo da de baja; foto de octubre (tomada después) sin él; la de septiembre no cambia |
| R-22 | `GET /reports/monthly`: **solo** lo que dibuja la pantalla (D-141): claves exactas de `data`, de `summary`, de `byJurisdiction[]`, de `lawyers[]`, de `lawyer`, de `monthly[]` y de `prescription` | Integración | `monthly-report.int.spec.ts` | `Object.keys(...).sort()` contra la lista del contrato, no `toMatchObject` |
| R-23 | `monthly[]`: de enero del año del período al período; un mes anterior a `availableFrom` trae `null`/`null`; cada mes de su propia foto; `admittedChange`/`archivedChange` comparan con el mes anterior, `null` si no tiene reporte | Unitario + integración | `monthly-report.spec.ts` | Enero a período; nulos antes de `availableFrom`; cambio `null` en el primer mes con reporte |
| R-24 | Solo `ADMINISTRATOR`: `LAWYER` y `SECRETARY` → 403 textual; sin token → 401 | Integración + smoke | `monthly-report.int.spec.ts`, `app.int.spec.ts` | Los dos 403; el 401 de las dos rutas |
| R-25 | `GET /reports/monthly/file`: PDF, `Content-Type`, `Content-Disposition` `attachment; filename="Reporte_2026-08.pdf"` (`inline` si se pide); mismos 400/401/403/404 | Integración | `monthly-report.int.spec.ts` | Cabeceras; el cuerpo empieza con `%PDF-`; `disposition=otro` → 400 textual; período fuera de rango → 404 |
| R-26 | Frases del PDF: resumen (tres párrafos) y plazos, con singular/plural, abogados empatados, sin "Dr."; "Sin asignar" en el cuadro de abogados y en las alertas | Unitario | `monthly-report-narrative.spec.ts`, `pdf-lib-monthly-report.renderer.spec.ts` | Los textos del contrato; el PDF se genera (2 o más páginas) con y sin datos y con una huérfana en las alertas |
| R-27 | **S10 / D-146** `reporting` escribe **solo** `monthly_report_snapshots`, y solo al tomar la foto de un mes cerrado | Integración | `monthly-report.int.spec.ts` | Pedir un mes cerrado agrega una fila de foto y no cambia el recuento de `cases`, `lawyers` ni `procedural_acts`; pedir el mes en curso no escribe |
| R-28 | Dos pedidos simultáneos del mismo mes no crean dos fotos (clave = período) | Integración | `monthly-report.int.spec.ts` | `Promise.all` de dos pedidos: una fila, mismos cuerpos |
| R-29 | "Cerrar el mes": toma la foto de cada mes cerrado desde `availableFrom` que no la tenga; no toca las que ya están; no guarda el mes en curso | Unitario + integración | `close-monthly-report.use-case.spec.ts`, `monthly-report.int.spec.ts` | Devuelve los períodos tomados; segunda llamada devuelve `[]` |

## Lo que no lleva test automático

- La **disparada del proceso diario** ("Cerrar el mes" en `POST /internal/deadlines/daily-run`): la ruta es de
  `deadlines` y esta tarea no la toca. El caso de uso `CloseMonthlyReport` está probado (R-29); falta el
  enganche (ver `IMPLEMENTACION_CAUSAS_HUERFANAS.md`, T2.5).
- El **aspecto** del PDF (colores, tipografías, barras): revisión manual contra
  `docs/prototypes/reporte-mensual-pdf.html`. El test fija que se genera y su estructura, no cómo se ve.
- Dos pedidos de una foto con la **base real caída a mitad**: la atomicidad la da la clave primaria
  (`INSERT ... ON CONFLICT DO NOTHING`).
