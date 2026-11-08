# Plan de tests — D-112 Prescripción por calificación

Cambio del contrato del 08/11/2026: cada elemento de `legalQualifications[]` de
la causa suma `elapsedPercentage`, `alert` y `expired`
(`docs/Api-Contract/API_CONTRACT_V5.md`, §3.7 tabla `legalQualifications[]` y
§4 Prescripción; `docs/Api-Contract/DECISIONES.md`, D-112).

**Este documento se escribió desde el contrato, antes del código.** Si un test de
este plan falla contra el código, el código está mal (o el contrato), no el test.

## Qué promete el contrato

| # | Regla | Fuente |
|---|---|---|
| R1 | Cada calificación trae `elapsedPercentage`, `alert` y `expired`, con la misma regla que `prescription`, aplicada a su `prescriptionStartsOn` y su `prescriptionExpiresOn` | §3.7, §4 Prescripción |
| R2 | `elapsedPercentage`: días corridos desde el inicio hasta hoy sobre los días del plazo, entre 0 y 100, redondeado | §4 Prescripción |
| R3 | `alert`: 70 % o más, sobre el valor exacto | §4 Prescripción |
| R4 | `expired`: hoy igual o posterior a `prescriptionExpiresOn` | §4 Prescripción |
| R5 | En la calificación que rige, los tres valores coinciden con los de `prescription` | §3.7 |
| R6 | `prescription` no cambia: sigue siendo la que prescribe primero aunque su plazo esté cumplido | §3.7, D-52, D-112 |
| R7 | Vale para todas las respuestas que devuelven una causa: listado, detalle, alta, modificación y "Marcar prescripta" | D-112 |
| R8 | Tableros y proceso diario no cambian | D-112 |
| R9 | Nada se guarda calculado: sin migración | §4 Prescripción |

## Datos fijos

- **Reloj fijo de integración:** hoy es **06/10/2026** (`test/shared/harness/fixed-clock.ts`).
- **Causa de integración:** penal, sin actos interruptivos, tres calificaciones con
  hecho del **10/01/2024**:

| Calificación | Meses | Vence | Días transcurridos / días del plazo | % exacto | `elapsedPercentage` | `alert` | `expired` |
|---|---|---|---|---|---|---|---|
| A | 24 | 2026-01-10 | 1000 / 731 (tope 100 %) | 100 | 100 | `true` | `true` |
| B | 36 | 2027-01-10 | 1000 / 1096 | 91,24 | 91 | `true` | `false` |
| C | 72 | 2030-01-10 | 1000 / 2192 | 45,62 | 46 | `false` | `false` |

  `prescription` es la de **A** (vence primero), con `elapsedPercentage: 100`,
  `alert: true`, `expired: true`: el plazo cumplido sigue rigiendo (R6).

- **Alta de integración** (`register-case.int.spec.ts`): una calificación de 96
  meses con hecho del 27/02/2021. Al 06/10/2026: 2047 de 2922 días (70,05 %) →
  `elapsedPercentage: 70`, `alert: true`, `expired: false`, igual que su
  `prescription` (R5).

- **Dominio** (`prescription.spec.ts`), con el hecho del 01/01/2026:
  - 10 meses: vence el 01/11/2026, 304 días. El 02/08/2026 (día 213): 70,07 % →
    `70`, `alert: true`, `expired: false`. El 01/11/2026: `100`, `true`, `true`.
  - 96 meses: vence el 01/01/2034, 2922 días. El 02/08/2026: 7,29 % → `7`,
    `false`, `false`. El 01/11/2026: 304 / 2922 = 10,40 % → `10`, `false`, `false`.

- **Caso de uso** (`list-cases.use-case.spec.ts`), consultado el 15/09/2026, acto
  interruptivo del 04/07/2024, hecho del 27/02/2021:
  - Robo, 96 meses: vence 04/07/2032. 27 %, `false`, `false` (el ejemplo del
    contrato).
  - Lesiones, 24 meses: vence 04/07/2026, ya cumplido. 100 %, `true`, `true`. Es la
    que rige `prescription`.

## Regla → test

| Regla | Nivel | Test |
|---|---|---|
| R1, R2, R3, R4 | Unitario (dominio) | `prescription.spec.ts`, `describe('Prescription.ofEach')`: una por calificación, en el mismo orden; bordes del 70 % y del vencimiento ya cubiertos por `summarizePrescription`, se reusan las fechas |
| R1 | Unitario (dominio) | `Prescription.ofEach` sin calificaciones devuelve `[]` |
| R5, R6 | Unitario (dominio) | `governing` es la de menor vencimiento entre las de `ofEach`; los tests existentes de `summarizePrescription` siguen en verde sin cambios |
| R1 | Unitario (dominio) | `Prescription.status` devuelve solo los tres campos |
| R1, R5, R6 | Unitario (caso de uso) | `list-cases.use-case.spec.ts`: `withDeadlines` completa cada calificación y `prescription` sigue siendo la vencida |
| R7 (alta) | Unitario (caso de uso) | `register-case.use-case.spec.ts`: el resultado trae un estado por hecho, en el orden de `newCase.offenses` |
| R7 | Unitario (infraestructura) | `case-http.mapper.spec.ts`: el mapper copia los tres campos; una calificación sin estado es un error de programación y lanza |
| R1–R6 | Integración | `consult-cases.int.spec.ts`, `describe('prescription y prescriptionDeclaration')`: la causa A/B/C, `legalQualifications` con `toEqual` exacto y `prescription` de A |
| R7 (alta) | Integración | `register-case.int.spec.ts:151`: la forma exacta de la calificación suma los tres campos |
| R7 (listado = detalle) | Integración | Ya lo cubre `consult-cases.int.spec.ts:334` ("idéntico al del listado"): no se duplica |
| R7 (modificar, marcar prescripta) | — | Pasan por `GetCase` (`update-case.use-case.ts:98`, `declare-prescription.use-case.ts:42`): los cubre el detalle |
| R8 | Regresión | Las suites de `reporting` y `deadlines` y `interruptive-acts.int.spec.ts` siguen en verde sin cambios |
| R9 | — | No se toca `schema.prisma`: no lleva test |

## Fuera de alcance

- Que un acto interruptivo posterior al plazo cumplido reinicie una calificación ya
  vencida (`prescription.ts:71-76`). Queda para definir con el equipo.
- El frontend.
