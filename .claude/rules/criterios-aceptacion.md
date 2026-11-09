---
paths:
  - "backend/src/subsystems/cases/**/*.ts"
  - "backend/test/subsystems/cases/**/*.ts"
---

<!-- Criterios de aceptación de HU20 y HU22 traídos de Jira el 07/10/2026,
     cruzados contra API_CONTRACT_V3.md §3.7 y §8.3. CA-22.3 actualizado el
     08/11/2026 a V5 (D-112, D-113).
     Lo importante de este archivo no es repetir los CA: es decir, para cada
     uno, QUÉ LE TOCA AL BACKEND y qué no. La mitad no le toca. -->

# HU20 y HU22: criterios de aceptación, traducidos a backend

Regla de lectura: un criterio de aceptación describe **el comportamiento del
sistema completo**, frontend incluido. Varios se satisfacen sin escribir una
línea de backend, porque el backend solo tiene que **proveer el dato** y el
cliente lo presenta. Confundir las dos cosas lleva a implementar de más y a
romper el contrato.

## HU20 — Consultar causas (10 SP)

| CA | Qué le toca al backend |
|---|---|
| **20.1** Listado por urgencia | **Suyo.** Orden: primero las que tienen `currentState.dueDate`, ascendente (las vencidas primeras); después las sin vencimiento, por `id`. |
| **20.2** Búsqueda | **Suyo.** `search` matchea `sacNumber`, `caption` **y apellido y nombres del cliente**. Los tres. |
| **20.3** Filtros | **Suyo.** `jurisdiction`, `responsibleLawyerId`, `clientId`, los tres de estado, y `openDeadline=true` para "solo con plazo por vencer". |
| **20.4** Filtro de estado, tres clases excluyentes | **Suyo, y es el que más se rompe.** `proceduralStateId` / `withoutProceduralActs=true` / `customState`, mutuamente excluyentes. **Y arrastra un endpoint propio**: el grupo "Escritos a mano" se llena con `GET /cases/custom-states`, que también es suyo. |
| **20.5** Vencimiento a la vista | **Parcial.** El backend devuelve `businessDaysRemaining`: negativo si venció, `0` si vence hoy, positivo si falta. **La distinción visual entre "vencida", "vence hoy" y "próximos días" la hace el frontend.** No agregues un campo de categoría ni un enum: no está en el contrato. |
| **20.6** Filtro sin resultados | **Parcial.** Backend: `200` con `data: []`. **No es `404` ni `400`.** El mensaje "la búsqueda no tuvo resultados" lo pone el frontend. |
| **20.7** Acceso universal | **Suyo, por omisión.** RN11: no filtres por el usuario autenticado. El criterio se cumple **no haciendo nada**. |
| **20.8** Carga de trabajo | **Suyo.** Es el filtro `responsibleLawyerId`, que ya está en 20.3. No es un endpoint ni un reporte aparte. |

## HU22 — Consultar detalle de causa (15 SP)

Base: `GET /cases/{caseId}` **devuelve el mismo recurso que el listado**. No una
forma ampliada. Si divergen, es un bug.

| CA | Qué le toca al backend |
|---|---|
| **22.1** Encabezado | **Nada nuevo.** `caption`, `sacNumber`, `jurisdiction`, `court`, `responsibleLawyer`, `currentState` y su `dueDate` ya están en el recurso del listado. |
| **22.2** Datos del cliente y su rol procesal | **Nada nuevo**, pero ojo con dónde está: `proceduralRole` va **a nivel de la causa**, no dentro de `client`. No busques `client.proceduralRole`: no existe. |
| **22.3** Prescripción | **Suyo desde V4** (era del cliente en V3). Vigente en V5 (`API_CONTRACT_V5.md:3238` y `:3288`). El backend devuelve `legalQualifications[]` con `prescriptionMonths`, `offenseDate`, `prescriptionStartsOn`, `prescriptionExpiresOn` y, **desde D-112**, `elapsedPercentage`, `alert` y `expired` de cada calificación, y **desde D-113** su `prescriptionDeclaration` (cada calificación se declara prescripta por separado, `POST /cases/{caseId}/legal-qualifications/{legalQualificationId}/prescription`). **Además `prescription`**: la calificación que prescribe primero **entre las no declaradas** (si están todas declaradas, entre todas), con `startsOn`, `expiresOn`, `elapsedPercentage`, `alert` (70 % o más, sobre el valor exacto), `expired` y `lastInterruptiveActDate`. Lo calcula `Prescription.governing` / `summarizePrescription` (`cases/core/domain/prescription.ts:159`, `:228`) en cada lectura, no se guarda. Desde cuándo corre cada calificación es `prescriptionStartsOn` (`prescription.ts:91`): un acto interruptivo no reinicia una calificación con el plazo cumplido a la fecha del acto, ni una declarada antes del acto (D-113, CA-31.14). Lo que sigue siendo del cliente es el texto "Restan 5 años 9 meses", que arma con `expiresOn`, y elegir la barra que muestra. Además: la prescripción **solo se computa en el fuero `CRIMINAL`**; en los demás `prescription` vale `null` y el prototipo informa "No aplica al fuero". También `prescriptionDeclaration` de la causa, `null` hasta que la causa queda "Prescripta" (HU33): al declarar la última calificación o con "Marcar toda la causa prescripta". |
| **22.4** Causa recién registrada | **Nada nuevo.** `currentState.initial` en `true` y `dueDate` nulo. El "ofrece registrar el primer acto" es del frontend. |
| **22.5** Actualización por acto procesal | **No es de esta HU.** Depende de `POST /cases/{caseId}/procedural-acts`, que no es mi alcance. El detalle solo tiene que leer `currentState` tal como quedó. |
| **22.6** Causa inexistente | **Suyo.** `404` con `code: "CASE_NOT_FOUND"`. Y `400` con `INVALID_PATH_PARAMETER` si el `caseId` no es un entero válido. |

## Lo que NO entra en el detalle, aunque el prototipo lo muestre

V3 §8.3 es taxativo. Nada de esto tiene endpoint ni campo en esta versión, y
**no se programa ni deshabilitado**:

ciclo de vida de la causa y su aviso "Todavía no hay actos procesales" (HU23,
HU27) · listado de actos registrados (HU27) · documentación de la causa (HU38) ·
"Modificar causa" y "Dar de baja" (HU19, HU21) · "Registrar acto interruptivo"
(HU31) · "Marcar prescripta" (HU33) · "Emitir carátula" y "Emitir expediente"
(HU24, HU25) · "Registrar pago de tasa" (sin HU) · "Fecha del hecho" al
modificar calificaciones (HU19).

## Dos contradicciones a resolver con el equipo

<!-- Esto no lo inventé: salió de cruzar los CA de Jira con el contrato. -->

1. **La narrativa de HU22 no corresponde a sus criterios.** Dice *"quiero
   consignar una descripción libre de la causa para reflejar situaciones que el
   estado no alcanza a expresar"*, que es una historia de **escritura** de texto
   libre — suena a los estados escritos a mano (`customState`) o a
   `subjectMatter`. Pero los seis criterios CA-22.1 a CA-22.6 son todos de
   **lectura** del detalle. La narrativa parece copiada de otra HU. **Los
   criterios son los que valen**; si alguien pide "la descripción libre" como
   parte de HU22, frená y preguntá.

<!-- Observación sobre la estimación, para mmachuca, no para el modelo:
     HU22 está estimada en 15 SP y HU20 en 10. Pero según el contrato el
     detalle devuelve el mismo recurso que el listado, y CA-22.3 no era
     trabajo de backend en V3 (en V4 sí: `prescription`). Una vez hecha HU20, HU22 es casi gratis del lado
     del servidor. Lo más probable es que esos 15 SP incluyan el ciclo de
     vida y la documentación, que §8.3 deja fuera del sprint. Vale la pena
     chequearlo en la planificación antes de comprometer horas. -->
