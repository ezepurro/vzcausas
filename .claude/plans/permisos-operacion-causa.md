# Operación de la causa y cliente fijo (revisión del 08/11/2026)

Contrato: `docs/Api-Contract/API_CONTRACT_V5.md`, §4 "Operación de la causa" y
§3.7 (`PATCH`, `DELETE`, `prescription`, `folder`). Decisiones: D-110 y D-111 en
`docs/Api-Contract/DECISIONES.md`, con su "Impacto de la revisión del 08/11/2026".

## La regla, en una tabla

| Operación sobre una causa                                   | Responsable | Otro abogado | ADMINISTRATOR | SECRETARY |
| ----------------------------------------------------------- | :---------: | :----------: | :-----------: | :-------: |
| Consultar (detalle, línea de vida, actos, documentos)       |      ✓      |      ✓       |       ✓       |     ✓     |
| Descargar un documento que no es expediente                 |      ✓      |      ✓       |       —       |     ✓     |
| Carátula, generar y descargar el expediente                 |      ✓      |      ✓       |       ✓       |     ✓     |
| `PATCH` / `DELETE /cases/{caseId}`                          |      ✓      |      —       |       ✓       |     ✓     |
| `POST /cases/{caseId}/folder`                               |      ✓      |      —       |       ✓       |     ✓     |
| `POST /cases/{caseId}/prescription`                         |      ✓      |      —       |       ✓       |     —     |
| Actos procesales e interruptivos (sin cambios)              |      ✓      |      —       |       —       |     —     |

Con varios roles alcanza con uno (LAWYER+SECRETARY no responsable modifica;
LAWYER+ADMINISTRATOR además marca prescripta). Primero `404`, después `403`.
Además, `PATCH /cases/{caseId}` rechaza `clientId` con `400 VALIDATION_ERROR`
(`details.clientId: "El cliente de una causa no se puede modificar."`), igual
que `jurisdiction`.

---

## Plan del frontend

1. **Una sola regla, en `cases/`.** Sumar a `ACTION_ACCESS`
   (`src/app/access/access.ts:60-79`) `cases.operateAnyCase` (ADMINISTRATOR,
   SECRETARY) y cambiar `cases.declarePrescription` a "cualquier causa" =
   solo ADMINISTRATOR. En `cases/utils/responsibleLawyer.ts` un hook o helper
   `useCaseOperation(c)` → `{ canOperate, canDeclarePrescription }` =
   `isResponsibleLawyer(c, lawyerId) || useCan(...)`. Publicarlo en
   `cases/index.ts` si lo usa otro módulo.
2. **Detalle** (`CaseDetailPage.tsx:300-329`): "Modificar causa" y "Dar de
   baja" deshabilitados para quien no opera, con `title`/nota "Solo el abogado
   responsable (…) modifica o da de baja la causa." (mismo patrón que
   "Registrar acto procesal", `:292-299`). Borrar el comentario de `:300` ("los
   opera cualquier perfil"). "Marcar prescripta" (`:325`): sigue oculto para la
   Secretaría; para un abogado no responsable, deshabilitado con aviso.
3. **Carpeta** (`CaseFolderCard.tsx:149-151`): prop `canCreate`; "Crear
   carpeta"/"Reintentar" deshabilitados si no opera. "Abrir carpeta" queda.
4. **Generar expediente**: el atajo "Modificá los datos de la causa" abre
   "Modificar causa" (`useCaseEdit`). Ocultarlo o deshabilitarlo para quien no
   opera: el expediente sí lo genera.
5. **Cliente fijo en "Modificar causa"**: `CaseEditForm.tsx:197-202` muestra el
   cliente como texto, igual que el fuero; sacar `onClientChange` (`:39-40`),
   `changeClient` de `useCaseEdit.ts:69-75` y `clientId` de
   `buildCasePatch.ts:65` y de `UpdateCaseBody` (`cases/types/case.ts:406`).
   `captionWithClient` queda solo si el alta lo usa.
6. **Mocks** (`src/shared/mocks/handlers.ts`): `updateCase`, `deleteCase`,
   `declarePrescription`, `createCaseFolder` (`:3735-3740`) responden `403`
   con los mensajes del contrato a un solo-LAWYER no responsable (reusar
   `isResponsibleLawyer`, `:270`); `updateCase` responde `400` con `clientId`.
   Quitar el comentario D-105 de `:3040`. Actualizar el README de mocks
   (qué usuario/causa dispara cada `403`: `mrios` sobre la 4).
7. **Tests**: reemplazar CA-19.7 en `CaseDetailPage.edit.test.tsx:126` por
   "el cliente no se edita"; revisar `suggestedCaption.test.ts:38`; casos
   nuevos en `CaseDetailPage.*.test.tsx` (mrios en una causa ajena: botones
   deshabilitados; fvazquez y gestion habilitados), `actionAccess.test.ts`,
   `permissions.test.ts`, `GenerateCaseFilePage.test.tsx`; `npm run ca-matrix`.
8. **Docs**: `frontend/CLAUDE.md` (HU19, HU21, HU33, "Reglas del dominio",
   "Acceso por perfil", mocks), `TESTING.md:1065`, `docs/openapi/.../CaseUpdate.yaml:15`.

Verificación: lint, `npm run build`, `npm test`, E2E.
**Ojo**: CA-19.7 es un criterio de Jira (VZ) — hay que actualizarlo allá.

---

## Prompt para el backend

```text
Cambió el contrato V5 (revisión del 08/11/2026, D-110 y D-111). Leé
docs/Api-Contract/API_CONTRACT_V5.md §4 "Operación de la causa" y las
secciones de PATCH /cases/{caseId}, DELETE /cases/{caseId},
POST /cases/{caseId}/prescription y POST /cases/{caseId}/folder (buscá
"Revisión del 08/11/2026"), y DECISIONES.md D-110, D-111 e "Impacto de la
revisión del 08/11/2026". Seguí .claude/CLAUDE.md: primero proponé el plan y
esperá; rama feat/permisos-operacion-causa desde develop; no commitees.

Qué cambia:
1) D-110. Un usuario cuyo único rol operativo es LAWYER y que no es el
   responsable de la causa recibe 403 FORBIDDEN en PATCH y DELETE
   /cases/{caseId} y en POST …/folder. ADMINISTRATOR y SECRETARY siguen
   pudiendo sobre cualquier causa. POST …/prescription: ADMINISTRATOR, o
   LAWYER responsable (SECRETARY sola sigue con el 403 de rol de hoy). Con
   varios roles alcanza con uno. Orden: 404 CASE_NOT_FOUND antes que 403.
   Mensajes (contrato): "Solo el abogado responsable de la causa puede
   modificarla." / "…puede darla de baja." / "…puede operar su carpeta." /
   "…puede marcarla como prescripta.".
2) D-111. PATCH /cases/{caseId} rechaza clientId con 400 VALIDATION_ERROR,
   details.clientId = "El cliente de una causa no se puede modificar.",
   igual que jurisdiction.

Dónde, como punto de partida:
- Regla de dominio junto a assertCanRegisterActs
  (cases/core/domain/entities/case/case.entity.ts:472): algo como
  assertCanBeOperatedBy(actor, message) que pase con ADMINISTRATOR, SECRETARY
  o LAWYER con lawyerId === responsibleLawyerId. Error: reusar
  NotResponsibleLawyerError (case.errors.ts:123) con mensaje propio.
- Casos de uso: update-case.use-case.ts, deactivate-case.use-case.ts,
  request-case-folder.use-case.ts (cargar la causa → 404 → assert) y
  declare-prescription.use-case.ts:48, donde
  PrescriptionDeclaration.assertCanBeDeclaredBy hoy no mira la causa: tiene
  que evaluarse después de cargarla. Actualizar el JSDoc de
  CannotDeclarePrescriptionError (case.errors.ts:167-176), que dice
  "cualquier abogado".
- clientId: update-case.request.dto.ts:77 → rechazarlo como jurisdiction
  (:20-49); sacarlo de case-changes.ts:20 y :53, de la búsqueda del cliente
  en update-case.use-case.ts:106-116 y de lo que lo aplique en la entidad y
  en case-change-set.vo.ts.
- La validación del DTO corre antes que el caso de uso: un 400 por
  clientId sale antes que el 404/403. Si eso no te cierra, avisá; no lo
  cambies por tu cuenta.

Sin migración: no cambia estructura.

Tests:
- Unitarios de la regla al estilo de case.entity.spec.ts:59-88: responsable,
  otro abogado, ADMINISTRATOR sin ficha, SECRETARY, LAWYER+SECRETARY no
  responsable, LAWYER sin ficha; y para prescripción SECRETARY → 403.
- Specs de los cuatro casos de uso (404 antes que 403) y de update-case con
  clientId.
- Integración (npm run test:int) de los cuatro endpoints con esos perfiles
  y PATCH con clientId → 400.

Actualizá cases/README.md y docs/openapi (CaseUpdate.yaml sin clientId, 403
en los cuatro). Al cerrar: tsc, npm test, npm run test:int, y decí qué
verificaste y qué no.
```
